const pool = require('../dbcon');

// Get all goals for a user
const getGoalsByUserId = async (userId) => {
  const query = `
    SELECT goal_id, user_id, name, target_amount, saved_amount, 
           deadline, priority, monthly_contribution, created_at
    FROM saving_goals
    WHERE user_id = $1
    ORDER BY priority ASC, created_at DESC
  `;
  
  try {
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (err) {
    throw new Error(`Error fetching goals: ${err.message}`);
  }
};

// Get a single goal by ID
const getGoalById = async (goalId) => {
  const query = `
    SELECT goal_id, user_id, name, target_amount, saved_amount, 
           deadline, priority, monthly_contribution, created_at
    FROM saving_goals
    WHERE goal_id = $1
  `;
  
  try {
    const result = await pool.query(query, [goalId]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error fetching goal: ${err.message}`);
  }
};

// Create a new goal
const createGoal = async (userId, name, targetAmount, deadline, monthlyContribution, priority = 1) => {
  const query = `
    INSERT INTO saving_goals (user_id, name, target_amount, deadline, monthly_contribution, priority)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING goal_id, user_id, name, target_amount, saved_amount, deadline, priority, monthly_contribution, created_at
  `;
  
  try {
    const result = await pool.query(query, [userId, name, targetAmount, deadline, monthlyContribution, priority]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error creating goal: ${err.message}`);
  }
};

// Update a goal
const updateGoal = async (goalId, name, targetAmount, deadline, monthlyContribution, priority) => {
  const query = `
    UPDATE saving_goals
    SET name = $2, target_amount = $3, deadline = $4, monthly_contribution = $5, priority = $6
    WHERE goal_id = $1
    RETURNING goal_id, user_id, name, target_amount, saved_amount, deadline, priority, monthly_contribution, created_at
  `;
  
  try {
    const result = await pool.query(query, [goalId, name, targetAmount, deadline, monthlyContribution, priority]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error updating goal: ${err.message}`);
  }
};

// Delete a goal
const deleteGoal = async (goalId) => {
  const query = 'DELETE FROM saving_goals WHERE goal_id = $1 RETURNING goal_id';
  
  try {
    const result = await pool.query(query, [goalId]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error deleting goal: ${err.message}`);
  }
};

module.exports = {
  getGoalsByUserId,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal
};