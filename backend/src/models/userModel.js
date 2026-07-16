const pool = require('../dbcon');

// creating a new user
const createUser = async (firstname, lastname, email, passwordHash) => {
  const query = `INSERT INTO users (first_name, last_name, email, password_hash)
                 VALUES ($1, $2, $3, $4)
                 RETURNING user_id, first_name, last_name, email, monthly_budget, is_earner, currency, theme, ui_density, fiscal_start_month, preferences, created_at`;

  try {
    const result = await pool.query(query, [firstname, lastname, email, passwordHash]);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// get user by id
const USER_PUBLIC_FIELDS = `
  user_id, first_name, last_name, email, monthly_budget, monthly_income, is_earner,
  is_admin, is_active, currency, currency_symbol, theme, ui_density, fiscal_start_month, preferences,
  onboarding_complete, created_at
`;

const getUserById = async (userId) => {
  const query = `
    SELECT ${USER_PUBLIC_FIELDS}
    FROM users
    WHERE user_id = $1
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error fetching user: ${err.message}`);
  }
};

const getUserMonthlyBudgetById = async (userId) => {
  const query = 'SELECT user_id, monthly_budget, is_earner FROM users WHERE user_id = $1';

  try {
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error fetching user budget: ${err.message}`);
  }
};

// get user by email
const getUserByEmail = async (email) => {
  const query = 'SELECT * FROM users WHERE email = $1';

  try {
    const result = await pool.query(query, [email]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error fetching user: ${err.message}`);
  }
};

const updateEarnerMode = async (userId, isEarner) => {
  const query = `
    UPDATE users
    SET is_earner = $2
    WHERE user_id = $1
    RETURNING ${USER_PUBLIC_FIELDS}
  `;

  try {
    const result = await pool.query(query, [userId, isEarner]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error updating earner mode: ${err.message}`);
  }
};

const updatePreferences = async (userId, prefs) => {
  const {
    currency,
    currency_symbol: currencySymbol,
    theme,
    ui_density: uiDensity,
    fiscal_start_month: fiscalStartMonth,
    preferences,
  } = prefs;

  const query = `
    UPDATE users
    SET
      currency = COALESCE($2, currency),
      currency_symbol = COALESCE($3, currency_symbol),
      theme = COALESCE($4, theme),
      ui_density = COALESCE($5, ui_density),
      fiscal_start_month = COALESCE($6, fiscal_start_month),
      preferences = COALESCE($7, preferences)
    WHERE user_id = $1
    RETURNING ${USER_PUBLIC_FIELDS}
  `;

  try {
    const result = await pool.query(query, [
      userId,
      currency || null,
      currencySymbol || null,
      theme || null,
      uiDensity || null,
      fiscalStartMonth || null,
      preferences ? JSON.stringify(preferences) : null,
    ]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error updating preferences: ${err.message}`);
  }
};

const updatePassword = async (userId, passwordHash) => {
  const query = `
    UPDATE users
    SET password_hash = $2
    WHERE user_id = $1
    RETURNING user_id
  `;

  try {
    const result = await pool.query(query, [userId, passwordHash]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error updating password: ${err.message}`);
  }
};

const completeOnboarding = async (userId, data) => {
  const {
    mode,
    monthly_income: monthlyIncome,
    monthly_budget: monthlyBudget,
    currency,
    currency_symbol: currencySymbol,
    onboarding_complete: onboardingComplete,
  } = data;

  const isEarner = mode === 'earner' ? true : mode === 'non-earner' ? false : null;

  const query = `
    UPDATE users
    SET
      is_earner = COALESCE($2, is_earner),
      monthly_income = COALESCE($3, monthly_income),
      monthly_budget = COALESCE($4, monthly_budget),
      currency = COALESCE($5, currency),
      currency_symbol = COALESCE($6, currency_symbol),
      onboarding_complete = COALESCE($7, onboarding_complete)
    WHERE user_id = $1
    RETURNING ${USER_PUBLIC_FIELDS}
  `;

  try {
    const result = await pool.query(query, [
      userId,
      isEarner,
      monthlyIncome ?? null,
      monthlyBudget ?? null,
      currency || null,
      currencySymbol || null,
      onboardingComplete ?? null,
    ]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error completing onboarding: ${err.message}`);
  }
};

module.exports = {
  createUser,
  getUserById,
  getUserMonthlyBudgetById,
  getUserByEmail,
  updateEarnerMode,
  updatePreferences,
  updatePassword,
  completeOnboarding,
  USER_PUBLIC_FIELDS,
};
