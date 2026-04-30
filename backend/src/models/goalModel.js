const pool = require('../dbcon');

const normalizeGoalInput = ({ name, targetAmount, deadline, priority }) => {
  if (!name || !String(name).trim()) {
    throw new Error('Goal name is required');
  }

  if (targetAmount === undefined || targetAmount === null || Number.parseFloat(targetAmount) <= 0) {
    throw new Error('A valid target_amount is required');
  }

  if (!deadline || Number.isNaN(new Date(deadline).getTime())) {
    throw new Error('A valid deadline is required');
  }

  return {
    normalizedName: String(name).trim(),
    normalizedTargetAmount: Number.parseFloat(targetAmount),
    normalizedDeadline: deadline,
    normalizedPriority: priority ?? 1,
  };
};

// Get all goals for a user
const getGoalsByUserId = async (userId) => {
  const query = `
    SELECT goal_id, user_id, name, target_amount, saved_amount,
           deadline, priority, created_at
    FROM saving_goals
    WHERE user_id = $1
    ORDER BY created_at DESC, goal_id DESC
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
           deadline, priority, created_at
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
const createGoal = async (userId, name, targetAmount, deadline, priority = 1) => {
  const {
    normalizedName,
    normalizedTargetAmount,
    normalizedDeadline,
    normalizedPriority,
  } = normalizeGoalInput({ name, targetAmount, deadline, priority });

  const query = `
    INSERT INTO saving_goals (user_id, name, target_amount, deadline, priority)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING goal_id, user_id, name, target_amount, saved_amount, deadline, priority, created_at
  `;

  try {
    const result = await pool.query(query, [
      userId,
      normalizedName,
      normalizedTargetAmount,
      normalizedDeadline,
      normalizedPriority,
    ]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error creating goal: ${err.message}`);
  }
};

// Update a goal
const updateGoal = async (goalId, name, targetAmount, deadline, priority) => {
  const {
    normalizedName,
    normalizedTargetAmount,
    normalizedDeadline,
    normalizedPriority,
  } = normalizeGoalInput({ name, targetAmount, deadline, priority });

  const query = `
    UPDATE saving_goals
    SET name = $2, target_amount = $3, deadline = $4, priority = $5
    WHERE goal_id = $1
    RETURNING goal_id, user_id, name, target_amount, saved_amount, deadline, priority, created_at
  `;

  try {
    const result = await pool.query(query, [
      goalId,
      normalizedName,
      normalizedTargetAmount,
      normalizedDeadline,
      normalizedPriority,
    ]);
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
  deleteGoal,
};
