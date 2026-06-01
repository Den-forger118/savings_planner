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
    WHERE e.user_id = $1
      AND EXTRACT(MONTH FROM e.expense_date) = $2
      AND EXTRACT(YEAR FROM e.expense_date) = $3
    ORDER BY e.expense_date DESC
  `;
  try {
    const result = await pool.query(query, [userId, month, year]);
    return result.rows;
  } catch (err) {
    throw new Error(`Error fetching expenses: ${err.message}`);
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
  createExpense,
  getExpensesByMonth,
  getMonthlySummary,
  deleteExpense
};