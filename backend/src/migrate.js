const pool = require('./dbcon');

const migrations = [
  `ALTER TABLE saving_goals
     ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT false`,
  `ALTER TABLE saving_goals
     ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS is_earner BOOLEAN`,
  `UPDATE users
     SET is_earner = (monthly_budget IS NOT NULL AND monthly_budget > 0)
     WHERE is_earner IS NULL`,
  `ALTER TABLE users
     ALTER COLUMN is_earner SET DEFAULT false`,
  `UPDATE users
     SET is_earner = false
     WHERE is_earner IS NULL`,
  `ALTER TABLE users
     ALTER COLUMN is_earner SET NOT NULL`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD'`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'classic'`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS ui_density VARCHAR(20) DEFAULT 'classic'`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS fiscal_start_month INTEGER DEFAULT 1`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(5) DEFAULT '$'`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS monthly_income NUMERIC(12, 2)`,
  `ALTER TABLE users
     ALTER COLUMN currency TYPE VARCHAR(10)`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false`,
  `UPDATE users
     SET is_admin = false
     WHERE is_admin IS NULL`,
  `ALTER TABLE users
     ALTER COLUMN is_admin SET DEFAULT false`,
  `ALTER TABLE users
     ALTER COLUMN is_admin SET NOT NULL`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`,
  `UPDATE users
     SET is_active = true
     WHERE is_active IS NULL`,
  `ALTER TABLE users
     ALTER COLUMN is_active SET DEFAULT true`,
  `ALTER TABLE users
     ALTER COLUMN is_active SET NOT NULL`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0`,
  `UPDATE users
     SET failed_login_attempts = 0
     WHERE failed_login_attempts IS NULL`,
  `ALTER TABLE users
     ALTER COLUMN failed_login_attempts SET DEFAULT 0`,
  `ALTER TABLE users
     ALTER COLUMN failed_login_attempts SET NOT NULL`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS login_locked_until TIMESTAMPTZ`,
  `UPDATE users
     SET theme = 'classic'
     WHERE theme = 'midnight'`,
  `ALTER TABLE saving_goals
     ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false`,
  `UPDATE saving_goals
     SET is_paused = false
     WHERE is_paused IS NULL`,
  `ALTER TABLE saving_goals
     ALTER COLUMN is_paused SET DEFAULT false`,
  `ALTER TABLE saving_goals
     ALTER COLUMN is_paused SET NOT NULL`,
  `ALTER TABLE saving_goals
     ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP`,
  `ALTER TABLE saving_goals
     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
  `CREATE INDEX IF NOT EXISTS idx_saving_goals_deleted_at
     ON saving_goals(user_id, deleted_at)`,
  `CREATE INDEX IF NOT EXISTS idx_saving_goals_user_priority
     ON saving_goals(user_id, is_complete, is_paused, priority, goal_id)`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
     token_id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
     token_hash VARCHAR(64) NOT NULL UNIQUE,
     expires_at TIMESTAMPTZ NOT NULL,
     used_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
     ON password_reset_tokens(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
     ON password_reset_tokens(expires_at)`,
  // Repair goals whose transaction net went negative (orphaned overdrafts)
  // so saved_amount stays within CHECK (saved_amount >= 0).
  `UPDATE saving_goals g
     SET saved_amount = GREATEST(
       0,
       COALESCE((
         SELECT SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END)
         FROM transactions t
         WHERE t.goal_id = g.goal_id
       ), 0)
     )`,
];

const runMigrations = async () => {
  for (const sql of migrations) {
    await pool.query(sql);
  }

  await repairOverdraftedGoalTransactions();
  await backfillGoalPriorities();

  await pool.query(`
    UPDATE users u
    SET onboarding_complete = true
    WHERE onboarding_complete = false
      AND (
        EXISTS (SELECT 1 FROM saving_goals g WHERE g.user_id = u.user_id)
        OR EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = u.user_id)
        OR EXISTS (SELECT 1 FROM expenses e WHERE e.user_id = u.user_id)
      )
  `);

  const promoteEmail = process.env.ADMIN_PROMOTE_EMAIL?.trim();
  if (promoteEmail) {
    await pool.query(
      `UPDATE users SET is_admin = true WHERE LOWER(email) = LOWER($1)`,
      [promoteEmail]
    );
  }
};

/**
 * Assign 1..n ranks from the current visual order (status, then newest first)
 * so shipping manual priority does not flip oldest-first inside a group.
 * Runs only for members whose live goals are still all the default rank of 1.
 */
const backfillGoalPriorities = async () => {
  await pool.query(`
    WITH eligible_users AS (
      SELECT user_id
      FROM saving_goals
      WHERE deleted_at IS NULL
      GROUP BY user_id
      HAVING COUNT(*) > 1
        AND COUNT(*) FILTER (WHERE priority IS DISTINCT FROM 1) = 0
    ),
    ranked AS (
      SELECT
        g.goal_id,
        ROW_NUMBER() OVER (
          PARTITION BY g.user_id,
            CASE
              WHEN g.is_complete THEN 2
              WHEN g.is_paused THEN 1
              ELSE 0
            END
          ORDER BY g.created_at DESC, g.goal_id DESC
        ) AS rnk
      FROM saving_goals g
      INNER JOIN eligible_users u ON u.user_id = g.user_id
      WHERE g.deleted_at IS NULL
    )
    UPDATE saving_goals g
    SET priority = ranked.rnk
    FROM ranked
    WHERE g.goal_id = ranked.goal_id
  `);
};

/**
 * Earlier bugs inserted withdrawals even when the saved_amount update failed,
 * leaving goals with a negative transaction net. Remove newest withdrawals
 * until each goal's balance is non-negative, then resync saved_amount.
 */
const repairOverdraftedGoalTransactions = async () => {
  const overdrafted = await pool.query(`
    SELECT g.goal_id
    FROM saving_goals g
    LEFT JOIN transactions t ON t.goal_id = g.goal_id
    GROUP BY g.goal_id
    HAVING COALESCE(
      SUM(CASE WHEN t.type = 'deposit' THEN t.amount ELSE -t.amount END),
      0
    ) < 0
  `);

  for (const { goal_id: goalId } of overdrafted.rows) {
    const txs = await pool.query(
      `
        SELECT transaction_id, amount, type
        FROM transactions
        WHERE goal_id = $1
        ORDER BY created_at DESC, transaction_id DESC
      `,
      [goalId]
    );

    let netResult = await pool.query(
      `
        SELECT COALESCE(
          SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END),
          0
        )::numeric AS net
        FROM transactions
        WHERE goal_id = $1
      `,
      [goalId]
    );
    let net = Number.parseFloat(netResult.rows[0].net);

    for (const tx of txs.rows) {
      if (net >= 0) break;
      if (tx.type !== 'withdrawal') continue;

      await pool.query(`DELETE FROM transactions WHERE transaction_id = $1`, [
        tx.transaction_id,
      ]);
      net += Number.parseFloat(tx.amount);
    }

    await pool.query(
      `
        UPDATE saving_goals
        SET saved_amount = GREATEST(
          0,
          COALESCE((
            SELECT SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END)
            FROM transactions
            WHERE goal_id = $1
          ), 0)
        )
        WHERE goal_id = $1
      `,
      [goalId]
    );
  }
};

module.exports = { runMigrations };
