const pool = require('../dbcon');
const { DISPLAY_ORDER_SQL, goalStatusRank } = require('../utils/goalOrder');

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

const resolvePriority = (priority, fallback = 1) => {
  if (priority === undefined || priority === null || priority === '') {
    return fallback;
  }

  const parsed = Number.parseInt(priority, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throwValidationError('Priority must be a positive integer');
  }

  return parsed;
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
    normalizedPriority: resolvePriority(priority, 1),
  };
};

const GOAL_FIELDS = `
  goal_id, user_id, name, target_amount, saved_amount,
  deadline, priority, created_at, is_complete, completed_at, is_paused, paused_at, deleted_at
`;

const getNextPriorityInGroup = async (userId, { isComplete = false, isPaused = false } = {}, client = pool) => {
  const result = await client.query(
    `
      SELECT COALESCE(MAX(priority), 0) + 1 AS next_priority
      FROM saving_goals
      WHERE user_id = $1
        AND deleted_at IS NULL
        AND is_complete = $2
        AND is_paused = $3
    `,
    [userId, Boolean(isComplete), Boolean(isPaused)]
  );

  return Number.parseInt(result.rows[0].next_priority, 10) || 1;
};

const getGoalsByUserId = async (userId) => {
  const query = `
    SELECT ${GOAL_FIELDS}
    FROM saving_goals
    WHERE user_id = $1
      AND deleted_at IS NULL
    ORDER BY ${DISPLAY_ORDER_SQL}
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

const createGoal = async (userId, name, targetAmount, deadline) => {
  const {
    normalizedName,
    normalizedTargetAmount,
    normalizedDeadline,
  } = normalizeGoalInput({ name, targetAmount, deadline });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const nextPriority = await getNextPriorityInGroup(
      userId,
      { isComplete: false, isPaused: false },
      client
    );

    const result = await client.query(
      `
        INSERT INTO saving_goals (user_id, name, target_amount, deadline, priority)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ${GOAL_FIELDS}
      `,
      [userId, normalizedName, normalizedTargetAmount, normalizedDeadline, nextPriority]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.statusCode) {
      throw err;
    }
    throw new Error(`Error creating goal: ${err.message}`);
  } finally {
    client.release();
  }
};

const updateGoal = async (goalId, name, targetAmount, deadline, priority) => {
  const existingGoal = await getGoalById(goalId);
  if (!existingGoal) {
    return null;
  }

  const {
    normalizedName,
    normalizedTargetAmount,
    normalizedDeadline,
  } = normalizeGoalInput({ name, targetAmount, deadline });
  const nextPriority = resolvePriority(priority, existingGoal.priority);

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
      nextPriority,
    ]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error updating goal: ${err.message}`);
  }
};

const replaceGoalPriorities = async (userId, orderedIds) => {
  const userGoals = await getGoalsByUserId(userId);
  const byId = new Map(userGoals.map((goal) => [Number(goal.goal_id), goal]));
  const payloadGoals = orderedIds.map((id) => byId.get(Number(id)));

  if (payloadGoals.some((goal) => !goal)) {
    throwValidationError('One or more goals were not found');
  }

  const ranks = new Set(payloadGoals.map(goalStatusRank));
  if (ranks.size !== 1) {
    throwValidationError('Goals can only be reordered within the same status group');
  }

  const groupRank = [...ranks][0];
  const groupIds = userGoals
    .filter((goal) => goalStatusRank(goal) === groupRank)
    .map((goal) => Number(goal.goal_id))
    .sort((a, b) => a - b);
  const payloadIds = [...orderedIds].map(Number).sort((a, b) => a - b);

  if (
    groupIds.length !== payloadIds.length ||
    groupIds.some((id, index) => id !== payloadIds[index])
  ) {
    throwValidationError('Reorder must include every goal in that status group');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (let index = 0; index < orderedIds.length; index += 1) {
      const result = await client.query(
        `
          UPDATE saving_goals
          SET priority = $1
          WHERE goal_id = $2
            AND user_id = $3
            AND deleted_at IS NULL
        `,
        [index + 1, orderedIds[index], userId]
      );

      if (result.rowCount !== 1) {
        throwValidationError('One or more goals could not be reordered');
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
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
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `
        SELECT ${GOAL_FIELDS}
        FROM saving_goals
        WHERE goal_id = $1
          AND user_id = $2
          AND deleted_at IS NOT NULL
      `,
      [goalId, userId]
    );

    const trashed = existing.rows[0];
    if (!trashed) {
      await client.query('ROLLBACK');
      return null;
    }

    const nextPriority = await getNextPriorityInGroup(
      userId,
      { isComplete: trashed.is_complete, isPaused: trashed.is_paused },
      client
    );

    const result = await client.query(
      `
        UPDATE saving_goals
        SET deleted_at = NULL, priority = $3
        WHERE goal_id = $1
          AND user_id = $2
          AND deleted_at IS NOT NULL
        RETURNING ${GOAL_FIELDS}
      `,
      [goalId, userId, nextPriority]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error(`Error restoring goal: ${err.message}`);
  } finally {
    client.release();
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
  replaceGoalPriorities,
  setGoalPaused,
  deleteGoal,
  restoreGoal,
  permanentlyDeleteGoal,
  emptyTrash,
};
