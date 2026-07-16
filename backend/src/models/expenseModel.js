const pool = require('../dbcon');

// Get all categories for a user
const getCategoriesByUserId = async (userId) => {
  const query = `
    SELECT category_id, user_id, name, colour, created_at
    FROM categories
    WHERE user_id = $1
    ORDER BY name ASC
  `;
  try {
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (err) {
    throw new Error(`Error fetching categories: ${err.message}`);
  }
};

const updateCategory = async (categoryId, userId, name, colour) => {
  const query = `
    UPDATE categories
    SET name = COALESCE($3, name),
        colour = COALESCE($4, colour)
    WHERE category_id = $1 AND user_id = $2
    RETURNING category_id, user_id, name, colour, created_at
  `;

  try {
    const result = await pool.query(query, [categoryId, userId, name || null, colour || null]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error updating category: ${err.message}`);
  }
};

// Create a custom category
const createCategory = async (userId, name, colour) => {
  const query = `
    INSERT INTO categories (user_id, name, colour)
    VALUES ($1, $2, $3)
    RETURNING category_id, user_id, name, colour, created_at
  `;
  try {
    const result = await pool.query(query, [userId, name, colour]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error creating category: ${err.message}`);
  }
};

// Log a new expense
const createExpense = async (userId, categoryId, amount, note, expenseDate) => {
  const query = `
    INSERT INTO expenses (user_id, category_id, amount, note, expense_date)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING expense_id, user_id, category_id, amount, note, expense_date, created_at
  `;
  try {
    const result = await pool.query(
      query,
      [userId, categoryId, amount, note, expenseDate]
    );
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error creating expense: ${err.message}`);
  }
};

const monthYearFilter = `
  e.user_id = $1
  AND EXTRACT(MONTH FROM e.expense_date) = $2
  AND EXTRACT(YEAR FROM e.expense_date) = $3
`;

const getExpenseOrderClause = (sort = 'expense_date_desc') => {
  if (sort === 'amount_desc') {
    return 'e.amount DESC, e.expense_date DESC';
  }
  if (sort === 'amount_asc') {
    return 'e.amount ASC, e.expense_date DESC';
  }
  return 'e.expense_date DESC, e.expense_id DESC';
};

// Get all expenses for a user in a given month
const getExpensesByMonth = async (userId, month, year) => {
  const query = `
    SELECT 
      e.expense_id,
      e.amount,
      e.note,
      e.expense_date,
      e.created_at,
      c.name AS category_name,
      c.colour AS category_colour
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.category_id
    WHERE ${monthYearFilter}
    ORDER BY e.expense_date DESC
  `;
  try {
    const result = await pool.query(query, [userId, month, year]);
    return result.rows;
  } catch (err) {
    throw new Error(`Error fetching expenses: ${err.message}`);
  }
};

const countExpensesByMonth = async (userId, month, year, categoryId = null) => {
  const params = [userId, month, year];
  let categoryFilter = '';

  if (categoryId) {
    params.push(categoryId);
    categoryFilter = `AND e.category_id = $${params.length}`;
  }

  const query = `
    SELECT COUNT(*)::int AS total
    FROM expenses e
    WHERE ${monthYearFilter}
    ${categoryFilter}
  `;

  try {
    const result = await pool.query(query, params);
    return result.rows[0]?.total ?? 0;
  } catch (err) {
    throw new Error(`Error counting expenses: ${err.message}`);
  }
};

const getPaginatedExpensesByMonth = async (
  userId,
  month,
  year,
  { limit, offset, sort = 'expense_date_desc', categoryId = null }
) => {
  const params = [userId, month, year];
  let categoryFilter = '';

  if (categoryId) {
    params.push(categoryId);
    categoryFilter = `AND e.category_id = $${params.length}`;
  }

  params.push(limit, offset);
  const orderClause = getExpenseOrderClause(sort);

  const query = `
    SELECT 
      e.expense_id,
      e.amount,
      e.note,
      e.expense_date,
      e.created_at,
      c.name AS category_name,
      c.colour AS category_colour
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.category_id
    WHERE ${monthYearFilter}
    ${categoryFilter}
    ORDER BY ${orderClause}
    LIMIT $${params.length - 1}
    OFFSET $${params.length}
  `;

  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    throw new Error(`Error fetching paginated expenses: ${err.message}`);
  }
};

const getMonthlyTotalSpent = async (userId, month, year) => {
  const query = `
    SELECT COALESCE(SUM(amount), 0) AS total_spent
    FROM expenses e
    WHERE ${monthYearFilter}
  `;

  try {
    const result = await pool.query(query, [userId, month, year]);
    return Number.parseFloat(result.rows[0]?.total_spent ?? 0);
  } catch (err) {
    throw new Error(`Error fetching monthly total spent: ${err.message}`);
  }
};

// Get monthly summary grouped by category
const getMonthlySummary = async (userId, month, year) => {
  const query = `
    SELECT 
      c.name AS category_name,
      c.colour AS category_colour,
      COUNT(e.expense_id) AS transaction_count,
      SUM(e.amount) AS total_spent
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.category_id
    WHERE e.user_id = $1
      AND EXTRACT(MONTH FROM e.expense_date) = $2
      AND EXTRACT(YEAR FROM e.expense_date) = $3
    GROUP BY c.name, c.colour
    ORDER BY total_spent DESC
  `;
  try {
    const result = await pool.query(query, [userId, month, year]);
    return result.rows;
  } catch (err) {
    throw new Error(`Error fetching monthly summary: ${err.message}`);
  }
};

const getAllExpensesByUserId = async (userId) => {
  const query = `
    SELECT
      e.expense_id,
      e.user_id,
      e.category_id,
      e.amount,
      e.note,
      e.expense_date,
      e.created_at,
      c.name AS category_name,
      c.colour AS category_colour
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.category_id
    WHERE e.user_id = $1
    ORDER BY e.expense_date DESC, e.created_at DESC
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (err) {
    throw new Error(`Error fetching expenses: ${err.message}`);
  }
};

// Delete an expense
const deleteExpense = async (expenseId) => {
  const query = `
    DELETE FROM expenses 
    WHERE expense_id = $1 
    RETURNING expense_id
  `;
  try {
    const result = await pool.query(query, [expenseId]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error deleting expense: ${err.message}`);
  }
};

module.exports = {
  getCategoriesByUserId,
  createCategory,
  updateCategory,
  createExpense,
  getExpensesByMonth,
  countExpensesByMonth,
  getPaginatedExpensesByMonth,
  getMonthlyTotalSpent,
  getMonthlySummary,
  getAllExpensesByUserId,
  deleteExpense,
};