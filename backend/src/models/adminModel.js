const pool = require('../dbcon');
const userModel = require('../models/userModel');
const goalModel = require('../models/goalModel');
const transactionModel = require('../models/transactionModel');
const expenseModel = require('../models/expenseModel');
const calculationModel = require('../models/calculationModel');
const { getUserBudgetContext, buildGoalResponse } = require('../utils/budgetContext');

const SORT_COLUMNS = {
  user_id: 'u.user_id',
  full_name: "LOWER(u.first_name || ' ' || u.last_name)",
  email: 'LOWER(u.email)',
  monthly_budget: 'u.monthly_budget',
  goal_count: 'goal_count',
  is_active: 'u.is_active',
  created_at: 'u.created_at',
};

const listUsers = async ({ search = '', sort = 'created_at', order = 'desc' } = {}) => {
  const sortKey = SORT_COLUMNS[sort] ? sort : 'created_at';
  const sortColumn = SORT_COLUMNS[sortKey];
  const sortDirection = order?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const trimmedSearch = search.trim();
  const searchPattern = trimmedSearch ? `%${trimmedSearch}%` : null;

  const query = `
    SELECT
      u.user_id,
      u.first_name,
      u.last_name,
      u.email,
      u.monthly_budget,
      u.is_active,
      u.is_admin,
      u.created_at,
      COUNT(g.goal_id)::int AS goal_count
    FROM users u
    LEFT JOIN saving_goals g ON g.user_id = u.user_id AND g.deleted_at IS NULL
    WHERE (
      $1::text IS NULL
      OR u.first_name ILIKE $1
      OR u.last_name ILIKE $1
      OR u.email ILIKE $1
      OR (u.first_name || ' ' || u.last_name) ILIKE $1
    )
    GROUP BY u.user_id, u.first_name, u.last_name, u.email, u.monthly_budget, u.is_active, u.is_admin, u.created_at
    ORDER BY ${sortColumn} ${sortDirection} NULLS LAST
  `;

  try {
    const result = await pool.query(query, [searchPattern]);
    return result.rows.map((row) => ({
      user_id: row.user_id,
      full_name: `${row.first_name} ${row.last_name}`.trim(),
      email: row.email,
      monthly_budget: row.monthly_budget,
      goal_count: row.goal_count,
      is_active: row.is_active !== false,
      is_admin: row.is_admin === true,
      created_at: row.created_at,
    }));
  } catch (err) {
    throw new Error(`Error listing users: ${err.message}`);
  }
};

const getUserDetail = async (userId) => {
  const user = await userModel.getUserById(userId);

  if (!user) {
    return null;
  }

  const budgetContext = await getUserBudgetContext(userId);
  const rawGoals = await goalModel.getGoalsByUserId(userId);
  const allocatedGoals = budgetContext.mode === 'earner'
    ? calculationModel.calculateAutoAllocations(rawGoals, budgetContext.allocationBudget)
    : [];

  const goals = rawGoals
    .map((goal) => buildGoalResponse(goal, allocatedGoals, budgetContext.mode))
    .sort((a, b) => {
      const rank = (goal) => {
        if (goal.is_complete) return 2;
        if (goal.is_paused) return 1;
        return 0;
      };
      return rank(a) - rank(b);
    });

  const [transactions, expenses] = await Promise.all([
    transactionModel.getTransactionsWithGoalByUserId(userId),
    expenseModel.getAllExpensesByUserId(userId),
  ]);

  return {
    user: {
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: `${user.first_name} ${user.last_name}`.trim(),
      email: user.email,
      monthly_budget: user.monthly_budget,
      monthly_income: user.monthly_income,
      is_earner: user.is_earner,
      mode: user.is_earner ? 'earner' : 'non-earner',
      currency: user.currency || 'USD',
      currency_symbol: user.currency_symbol || '$',
      onboarding_complete: user.onboarding_complete === true,
      is_active: user.is_active !== false,
      is_admin: user.is_admin === true,
      created_at: user.created_at,
    },
    mode: budgetContext.mode,
    monthly_budget: budgetContext.monthlyBudget,
    goals,
    transactions,
    expenses,
    counts: {
      goals: goals.length,
      transactions: transactions.length,
      expenses: expenses.length,
    },
  };
};

const setUserActiveStatus = async (targetUserId, isActive, actingAdminId) => {
  const target = await userModel.getUserById(targetUserId);

  if (!target) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (target.is_admin === true) {
    const error = new Error('Cannot change status of an admin account');
    error.statusCode = 400;
    throw error;
  }

  if (Number(targetUserId) === Number(actingAdminId) && !isActive) {
    const error = new Error('Cannot deactivate your own account');
    error.statusCode = 400;
    throw error;
  }

  const query = `
    UPDATE users
    SET is_active = $2
    WHERE user_id = $1
    RETURNING user_id, first_name, last_name, email, is_active, is_admin
  `;

  try {
    const result = await pool.query(query, [targetUserId, isActive]);
    const row = result.rows[0];
    return {
      user_id: row.user_id,
      full_name: `${row.first_name} ${row.last_name}`.trim(),
      email: row.email,
      is_active: row.is_active !== false,
      is_admin: row.is_admin === true,
    };
  } catch (err) {
    throw new Error(`Error updating user status: ${err.message}`);
  }
};

const getPlatformStats = async () => {
  const summaryQuery = `
    SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      (SELECT COUNT(*)::int FROM saving_goals WHERE deleted_at IS NULL) AS total_goals,
      (SELECT COUNT(*)::int FROM transactions) AS total_transactions,
      (SELECT COALESCE(SUM(saved_amount), 0)::float FROM saving_goals WHERE deleted_at IS NULL) AS total_savings,
      (
        SELECT COUNT(*)::int FROM users
        WHERE created_at >= date_trunc('month', CURRENT_TIMESTAMP)
      ) AS new_users_this_month,
      (
        SELECT COALESCE(AVG(monthly_budget), 0)::float FROM users
        WHERE monthly_budget IS NOT NULL AND monthly_budget > 0
      ) AS average_monthly_budget
  `;

  const categoriesQuery = `
    SELECT
      COALESCE(c.name, 'Uncategorized') AS name,
      COUNT(*)::int AS expense_count,
      COALESCE(SUM(e.amount), 0)::float AS total_amount
    FROM expenses e
    LEFT JOIN categories c ON c.category_id = e.category_id
    GROUP BY COALESCE(c.name, 'Uncategorized')
    ORDER BY expense_count DESC, total_amount DESC
    LIMIT 10
  `;

  try {
    const [summaryResult, categoriesResult] = await Promise.all([
      pool.query(summaryQuery),
      pool.query(categoriesQuery),
    ]);

    const summary = summaryResult.rows[0];

    return {
      total_users: summary.total_users,
      total_goals: summary.total_goals,
      total_transactions: summary.total_transactions,
      total_savings: summary.total_savings,
      new_users_this_month: summary.new_users_this_month,
      average_monthly_budget: summary.average_monthly_budget,
      popular_expense_categories: categoriesResult.rows.map((row) => ({
        name: row.name,
        expense_count: row.expense_count,
        total_amount: row.total_amount,
      })),
    };
  } catch (err) {
    throw new Error(`Error fetching platform stats: ${err.message}`);
  }
};

module.exports = {
  listUsers,
  getUserDetail,
  setUserActiveStatus,
  getPlatformStats,
};
