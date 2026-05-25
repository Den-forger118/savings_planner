const pool = require('../dbcon');

// Create a transaction
const createTransaction = async (userId, goalId, amount, type, note = '') => {
  const query = `
    INSERT INTO transactions (user_id, goal_id, amount, type, note)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING transaction_id, user_id, goal_id, amount, type, note, created_at
  `;
  
  try {
    const result = await pool.query(query, [userId, goalId, amount, type, note]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error creating transaction: ${err.message}`);
  }
};

// Get all transactions for a goal
const getTransactionsByGoalId = async (goalId) => {
  const query = `
    SELECT transaction_id, user_id, goal_id, amount, type, note, created_at
    FROM transactions
    WHERE goal_id = $1
    ORDER BY created_at DESC
  `;
  
  try {
    const result = await pool.query(query, [goalId]);
    return result.rows;
  } catch (err) {
    throw new Error(`Error fetching transactions: ${err.message}`);
  }
};

// Get all transactions for a user
const getTransactionsByUserId = async (userId) => {
  const query = `
    SELECT transaction_id, user_id, goal_id, amount, type, note, created_at
    FROM transactions
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
  
  try {
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (err) {
    throw new Error(`Error fetching transactions: ${err.message}`);
  }
};

// Update saved_amount in saving_goals based on transactions
const updateGoalSavedAmount = async (goalId) => {
  const query = `
    UPDATE saving_goals
    SET saved_amount = COALESCE((
      SELECT SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END)
      FROM transactions
      WHERE goal_id = $1
    ), 0)
    WHERE goal_id = $1
    RETURNING goal_id, saved_amount
  `;
  
  try {
    const result = await pool.query(query, [goalId]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error updating goal saved amount: ${err.message}`);
  }
};

module.exports = {
  createTransaction,
  getTransactionsByGoalId,
  getTransactionsByUserId,
  updateGoalSavedAmount
};
