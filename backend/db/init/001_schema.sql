CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  monthly_budget NUMERIC(12, 2),
  is_earner BOOLEAN NOT NULL DEFAULT false,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  currency_symbol VARCHAR(5) NOT NULL DEFAULT '$',
  monthly_income NUMERIC(12, 2),
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  theme VARCHAR(20) NOT NULL DEFAULT 'classic',
  ui_density VARCHAR(20) NOT NULL DEFAULT 'classic',
  fiscal_start_month INTEGER NOT NULL DEFAULT 1 CHECK (fiscal_start_month BETWEEN 1 AND 12),
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saving_goals (
  goal_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
  saved_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
  deadline DATE NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_complete BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  paused_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  category_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  colour VARCHAR(20) NOT NULL DEFAULT '#4E4B46',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS expenses (
  expense_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  note TEXT NOT NULL DEFAULT '',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  goal_id INTEGER NOT NULL REFERENCES saving_goals(goal_id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saving_goals_user_id ON saving_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_transactions_goal_id ON transactions(goal_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

ALTER TABLE saving_goals
  ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT false;

ALTER TABLE saving_goals
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

ALTER TABLE saving_goals
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;

ALTER TABLE saving_goals
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP;

ALTER TABLE saving_goals
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_saving_goals_deleted_at ON saving_goals(user_id, deleted_at);
