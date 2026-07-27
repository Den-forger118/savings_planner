const pool = require('../dbcon');

const throwValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
};

const toDateOnly = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const normalizeGoalInput = ({ name, targetAmount, deadline, priority }) => {
  if (!name || !String(name).trim()) {
    throwValidationError('Goal name is required');
  }

  if (targetAmount === undefined || targetAmount === null || Number.parseFloat(targetAmount) <= 0) {
    throwValidationError('A valid target_amount is required');
  }

  const deadlineDate = toDateOnly(deadline);

  if (!deadlineDate) {
    throwValidationError('A valid deadline is required');
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (deadlineDate < today) {
    throwValidationError('Deadline cannot be in the past');
  }

  return {
    normalizedName: String(name).trim(),
    normalizedTargetAmount: Number.parseFloat(targetAmount),
    normalizedDeadline: deadlineDate.toISOString().slice(0, 10),
    normalizedPriority: priority ?? 1,
  };
};

const GOAL_FIELDS = `
  goal_id, user_id, name, target_amount, saved_amount,
  deadline, priority, created_at, is_complete, completed_at, is_paused, paused_at, deleted_at
`;

const getGoalsByUserId = async (userId) => {
  const query = `
    SELECT ${GOAL_FIELDS}
    FROM saving_goals
    WHERE user_id = $1
      AND deleted_at IS NULL
    ORDER BY created_at DESC, goal_id DESC
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (err) {
    throw new Error(`Error fetching goals: ${err.message}`);
  }
};

const getDeletedGoalsByUserId = async (userId) => {
  const query = `
    SELECT ${GOAL_FIELDS}
    FROM saving_goals
    WHERE user_id = $1
      AND deleted_at IS NOT NULL
    ORDER BY deleted_at DESC, goal_id DESC
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (err) {
    throw new Error(`Error fetching deleted goals: ${err.message}`);
  }
};

const getGoalById = async (goalId, { includeDeleted = false } = {}) => {
  const query = `
    SELECT ${GOAL_FIELDS}
    FROM saving_goals
    WHERE goal_id = $1
      ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
  `;

  try {
    const result = await pool.query(query, [goalId]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error fetching goal: ${err.message}`);
  }
};

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
    RETURNING ${GOAL_FIELDS}
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
      AND deleted_at IS NULL
    RETURNING ${GOAL_FIELDS}
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

const setGoalPaused = async (goalId, isPaused, pausedAt = null) => {
  const existingGoal = await getGoalById(goalId);

  if (!existingGoal) {
    return null;
  }

  if (existingGoal.is_complete) {
    throwValidationError('Completed goals cannot be paused');
  }

  let pausedAtValue = null;

  if (isPaused) {
    if (pausedAt) {
      const parsed = toDateOnly(pausedAt);
      if (!parsed) {
        throwValidationError('A valid on-hold date is required');
      }
      pausedAtValue = parsed.toISOString();
    } else {
      pausedAtValue = new Date().toISOString();
    }
  }

  const query = `
    UPDATE saving_goals
    SET
      is_paused = $2,
      paused_at = $3
    WHERE goal_id = $1
      AND deleted_at IS NULL
    RETURNING ${GOAL_FIELDS}
  `;

  try {
    const result = await pool.query(query, [goalId, isPaused, pausedAtValue]);
    return result.rows[0];
  } catch (err) {
    if (err.statusCode) {
      throw err;
    }
    throw new Error(`Error updating goal pause state: ${err.message}`);
  }
};

/** Soft-delete: move goal to trash (keeps transactions until permanently deleted). */
const deleteGoal = async (goalId) => {
  const query = `
    UPDATE saving_goals
    SET deleted_at = NOW()
    WHERE goal_id = $1
      AND deleted_at IS NULL
    RETURNING ${GOAL_FIELDS}
  `;

  try {
    const result = await pool.query(query, [goalId]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error deleting goal: ${err.message}`);
  }
};

const restoreGoal = async (goalId, userId) => {
  const query = `
    UPDATE saving_goals
    SET deleted_at = NULL
    WHERE goal_id = $1
      AND user_id = $2
      AND deleted_at IS NOT NULL
    RETURNING ${GOAL_FIELDS}
  `;

  try {
    const result = await pool.query(query, [goalId, userId]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error restoring goal: ${err.message}`);
  }
};

const permanentlyDeleteGoal = async (goalId, userId) => {
  const query = `
    DELETE FROM saving_goals
    WHERE goal_id = $1
      AND user_id = $2
      AND deleted_at IS NOT NULL
    RETURNING goal_id, name
  `;

  try {
    const result = await pool.query(query, [goalId, userId]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error permanently deleting goal: ${err.message}`);
  }
};

const emptyTrash = async (userId) => {
  const query = `
    DELETE FROM saving_goals
    WHERE user_id = $1
      AND deleted_at IS NOT NULL
    RETURNING goal_id
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (err) {
    throw new Error(`Error emptying trash: ${err.message}`);
  }
};

module.exports = {
  getGoalsByUserId,
  getDeletedGoalsByUserId,
  getGoalById,
  createGoal,
  updateGoal,
  setGoalPaused,
  deleteGoal,
  restoreGoal,
  permanentlyDeleteGoal,
  emptyTrash,
};
