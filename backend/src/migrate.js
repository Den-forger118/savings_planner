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
];

const runMigrations = async () => {
  for (const sql of migrations) {
    await pool.query(sql);
  }

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

module.exports = { runMigrations };
