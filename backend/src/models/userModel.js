const pool = require('../dbcon');

// creating a new user
const createUser = async (firstname, lastname, email, passwordHash) => {
  const query = `INSERT INTO users (first_name, last_name, email, password_hash)
                 VALUES ($1, $2, $3, $4)
                 RETURNING user_id, first_name, last_name, email, monthly_budget, is_earner, currency, theme, fiscal_start_month, created_at`;

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
  is_admin, is_active, currency, currency_symbol, theme, fiscal_start_month,
  onboarding_complete, email_notifications, push_notifications, reminder_frequency,
  reminder_time, timezone, created_at
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

const ALLOWED_REMINDER_FREQUENCIES = new Set(['daily', 'weekly', 'off']);

const normalizeReminderTime = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    const error = new Error('reminder_time must be HH:MM');
    error.statusCode = 400;
    throw error;
  }
  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (hour > 23 || minute > 59) {
    const error = new Error('reminder_time must be a valid time');
    error.statusCode = 400;
    throw error;
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const updatePreferences = async (userId, prefs) => {
  const {
    currency,
    currency_symbol: currencySymbol,
    theme,
    fiscal_start_month: fiscalStartMonth,
    email_notifications: emailNotifications,
    reminder_frequency: reminderFrequency,
    reminder_time: reminderTime,
    timezone,
  } = prefs;

  let nextFrequency = null;
  if (reminderFrequency !== undefined && reminderFrequency !== null && reminderFrequency !== '') {
    const normalized = String(reminderFrequency).toLowerCase();
    if (!ALLOWED_REMINDER_FREQUENCIES.has(normalized)) {
      const error = new Error('reminder_frequency must be daily, weekly, or off');
      error.statusCode = 400;
      throw error;
    }
    nextFrequency = normalized;
  }

  const nextReminderTime = normalizeReminderTime(reminderTime);
  const nextTimezone =
    timezone !== undefined && timezone !== null && String(timezone).trim()
      ? String(timezone).trim()
      : null;

  let nextEmailNotifications = null;
  if (emailNotifications !== undefined && emailNotifications !== null && emailNotifications !== '') {
    if (typeof emailNotifications !== 'boolean') {
      const error = new Error('email_notifications must be a boolean');
      error.statusCode = 400;
      throw error;
    }
    nextEmailNotifications = emailNotifications;
  }

  const query = `
    UPDATE users
    SET
      currency = COALESCE($2, currency),
      currency_symbol = COALESCE($3, currency_symbol),
      theme = COALESCE($4, theme),
      fiscal_start_month = COALESCE($5, fiscal_start_month),
      email_notifications = COALESCE($6, email_notifications),
      reminder_frequency = COALESCE($7, reminder_frequency),
      reminder_time = COALESCE($8::time, reminder_time),
      timezone = COALESCE($9, timezone)
    WHERE user_id = $1
    RETURNING ${USER_PUBLIC_FIELDS}
  `;

  try {
    const result = await pool.query(query, [
      userId,
      currency || null,
      currencySymbol || null,
      theme || null,
      fiscalStartMonth || null,
      nextEmailNotifications,
      nextFrequency,
      nextReminderTime,
      nextTimezone,
    ]);
    return result.rows[0];
  } catch (err) {
    if (err.statusCode) throw err;
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
