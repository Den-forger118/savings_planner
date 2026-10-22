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
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true`,
  `UPDATE users
     SET email_notifications = true
     WHERE email_notifications IS NULL`,
  `ALTER TABLE users
     ALTER COLUMN email_notifications SET DEFAULT true`,
  `ALTER TABLE users
     ALTER COLUMN email_notifications SET NOT NULL`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS reminder_frequency VARCHAR(20) DEFAULT 'daily'`,
  `UPDATE users
     SET reminder_frequency = 'daily'
     WHERE reminder_frequency IS NULL`,
  `ALTER TABLE users
     ALTER COLUMN reminder_frequency SET DEFAULT 'daily'`,
  `ALTER TABLE users
     ALTER COLUMN reminder_frequency SET NOT NULL`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS reminder_time TIME DEFAULT '09:00'`,
  `UPDATE users
     SET reminder_time = '09:00'
     WHERE reminder_time IS NULL`,
  `ALTER TABLE users
     ALTER COLUMN reminder_time SET DEFAULT '09:00'`,
  `ALTER TABLE users
     ALTER COLUMN reminder_time SET NOT NULL`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'UTC'`,
  `UPDATE users
     SET timezone = 'UTC'
     WHERE timezone IS NULL OR timezone = ''`,
  `ALTER TABLE users
     ALTER COLUMN timezone SET DEFAULT 'UTC'`,
  `ALTER TABLE users
     ALTER COLUMN timezone SET NOT NULL`,
  `CREATE TABLE IF NOT EXISTS reminder_email_sends (
     send_id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
     goal_id INTEGER REFERENCES saving_goals(goal_id) ON DELETE SET NULL,
     kind VARCHAR(40) NOT NULL,
     send_date DATE NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_reminder_email_sends_unique
     ON reminder_email_sends (user_id, kind, send_date, (COALESCE(goal_id, 0)))`,
  `CREATE INDEX IF NOT EXISTS idx_reminder_email_sends_user
     ON reminder_email_sends (user_id, send_date)`,
  `CREATE TABLE IF NOT EXISTS payment_references (
     reference_id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
     goal_id INTEGER NOT NULL REFERENCES saving_goals(goal_id) ON DELETE CASCADE,
     paystack_ref VARCHAR(100) NOT NULL UNIQUE,
     amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
     currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
     status VARCHAR(20) NOT NULL DEFAULT 'pending',
     transaction_id INTEGER REFERENCES transactions(transaction_id) ON DELETE SET NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     completed_at TIMESTAMPTZ
   )`,
  `CREATE INDEX IF NOT EXISTS idx_payment_references_user
     ON payment_references (user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_payment_references_goal
     ON payment_references (goal_id)`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT false`,
  `UPDATE users
     SET push_notifications = false
     WHERE push_notifications IS NULL`,
  `ALTER TABLE users
     ALTER COLUMN push_notifications SET DEFAULT false`,
  `ALTER TABLE users
     ALTER COLUMN push_notifications SET NOT NULL`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
     subscription_id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
     endpoint TEXT NOT NULL,
     subscription JSONB NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE (endpoint)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
     ON push_subscriptions (user_id)`,
  `DO $$ BEGIN
     CREATE TYPE account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,
  `DO $$ BEGIN
     CREATE TYPE posting_direction AS ENUM ('DEBIT', 'CREDIT');
   EXCEPTION WHEN duplicate_object THEN NULL;
   END $$`,
  `CREATE TABLE IF NOT EXISTS accounts (
     account_id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
     name VARCHAR(255) NOT NULL,
     type account_type NOT NULL,
     currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_name_unique
     ON accounts (name)`,
  `CREATE INDEX IF NOT EXISTS idx_accounts_user_id
     ON accounts (user_id)`,
  `CREATE TABLE IF NOT EXISTS journal_entries (
     journal_entry_id SERIAL PRIMARY KEY,
     idempotency_key VARCHAR(255) NOT NULL UNIQUE,
     description TEXT,
     status VARCHAR(50) NOT NULL DEFAULT 'posted',
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_journal_idempotency
     ON journal_entries (idempotency_key)`,
  `CREATE TABLE IF NOT EXISTS postings (
     posting_id SERIAL PRIMARY KEY,
     journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(journal_entry_id) ON DELETE CASCADE,
     account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE RESTRICT,
     amount NUMERIC(18, 4) NOT NULL CHECK (amount > 0),
     direction posting_direction NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_postings_account
     ON postings (account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_postings_journal
     ON postings (journal_entry_id)`,
  `ALTER TABLE payment_references
     ADD COLUMN IF NOT EXISTS journal_entry_id INTEGER REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12, 2) DEFAULT 0`,
  `UPDATE users SET wallet_balance = 0 WHERE wallet_balance IS NULL`,
  `ALTER TABLE users
     ALTER COLUMN wallet_balance SET DEFAULT 0`,
  `ALTER TABLE users
     ALTER COLUMN wallet_balance SET NOT NULL`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS phone VARCHAR(32)`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS paystack_customer_code VARCHAR(100)`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS virtual_account_number VARCHAR(20)`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS virtual_account_bank VARCHAR(100)`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS virtual_account_name VARCHAR(255)`,
  `ALTER TABLE payment_references
     ADD COLUMN IF NOT EXISTS kind VARCHAR(20) DEFAULT 'goal_deposit'`,
  `UPDATE payment_references SET kind = 'goal_deposit' WHERE kind IS NULL`,
  `ALTER TABLE payment_references
     ALTER COLUMN kind SET DEFAULT 'goal_deposit'`,
  `ALTER TABLE payment_references
     ALTER COLUMN kind SET NOT NULL`,
  `ALTER TABLE payment_references
     ALTER COLUMN goal_id DROP NOT NULL`,
  `CREATE TABLE IF NOT EXISTS payouts (
     payout_id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
     amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
     currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
     status VARCHAR(20) NOT NULL DEFAULT 'pending',
     paystack_ref VARCHAR(100) NOT NULL UNIQUE,
     recipient_code VARCHAR(100),
     recipient_type VARCHAR(40) NOT NULL DEFAULT 'mobile_money',
     account_number VARCHAR(40),
     bank_code VARCHAR(20),
     account_name VARCHAR(255),
     transfer_code VARCHAR(100),
     failure_reason TEXT,
     journal_entry_id INTEGER REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
     finalize_journal_entry_id INTEGER REFERENCES journal_entries(journal_entry_id) ON DELETE SET NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     completed_at TIMESTAMPTZ
   )`,
  `CREATE INDEX IF NOT EXISTS idx_payouts_user
     ON payouts (user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_payouts_status
     ON payouts (status)`,
  `ALTER TABLE users
     ADD COLUMN IF NOT EXISTS auto_allocate_wallet BOOLEAN DEFAULT true`,
  `UPDATE users SET auto_allocate_wallet = true WHERE auto_allocate_wallet IS NULL`,
  `ALTER TABLE users
     ALTER COLUMN auto_allocate_wallet SET DEFAULT true`,
  `ALTER TABLE users
     ALTER COLUMN auto_allocate_wallet SET NOT NULL`,
  // Theme-aligned default expense category colours (name match only)
  `UPDATE categories SET colour = '#C4A882' WHERE name = 'Food & Dining'`,
  `UPDATE categories SET colour = '#4A5D7A' WHERE name = 'Transport'`,
  `UPDATE categories SET colour = '#D4B16D' WHERE name = 'Entertainment'`,
  `UPDATE categories SET colour = '#8B7355' WHERE name = 'Shopping'`,
  `UPDATE categories SET colour = '#6B8578' WHERE name = 'Healthcare'`,
  `UPDATE categories SET colour = '#7D8A9A' WHERE name = 'Utilities'`,
  `UPDATE categories SET colour = '#9A9186' WHERE name = 'Other'`,
];

const SYSTEM_ACCOUNTS = [
  { name: 'Paystack Clearing', type: 'ASSET' },
  { name: 'Gateway Fee Expense', type: 'EXPENSE' },
  { name: 'Pending Disbursal', type: 'LIABILITY' },
];

const seedSystemAccounts = async () => {
  const currency = (process.env.PAYSTACK_CURRENCY || 'GHS').toUpperCase().slice(0, 3);
  for (const account of SYSTEM_ACCOUNTS) {
    await pool.query(
      `
        INSERT INTO accounts (user_id, name, type, currency)
        VALUES (NULL, $1, $2::account_type, $3)
        ON CONFLICT (name) DO NOTHING
      `,
      [account.name, account.type, currency]
    );
  }
};

const runMigrations = async () => {
  for (const sql of migrations) {
    await pool.query(sql);
  }

  await seedSystemAccounts();
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

  const { syncAdminPromoteOnStartup } = require('./utils/adminPromote');
  await syncAdminPromoteOnStartup();
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
