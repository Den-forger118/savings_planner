const pool = require('../dbcon');

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

const buildTransactionFilters = (userId, { goalId = null, search = null } = {}) => {
  const params = [userId];
  const conditions = ['t.user_id = $1'];

  if (goalId) {
    params.push(goalId);
    conditions.push(`t.goal_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(
      g.name ILIKE $${params.length}
      OR t.note ILIKE $${params.length}
      OR t.type ILIKE $${params.length}
    )`);
  }

  return {
    whereClause: conditions.join(' AND '),
    params,
  };
};

const countTransactionsForUser = async (userId, options = {}) => {
  const { whereClause, params } = buildTransactionFilters(userId, options);

  const query = `
    SELECT COUNT(*)::int AS total
    FROM transactions t
    INNER JOIN saving_goals g ON t.goal_id = g.goal_id
    WHERE ${whereClause}
  `;

  try {
    const result = await pool.query(query, params);
    return result.rows[0]?.total ?? 0;
  } catch (err) {
    throw new Error(`Error counting transactions: ${err.message}`);
  }
};

const getPaginatedTransactionsForUser = async (userId, options = {}) => {
  const { goalId = null, search = null, limit, offset, sort = 'created_at_desc' } = options;
  const { whereClause, params } = buildTransactionFilters(userId, { goalId, search });

  const orderClause = sort === 'created_at_asc'
    ? 'created_at ASC'
    : 'created_at DESC';

  params.push(limit, offset);

  const query = `
    WITH balances AS (
      SELECT
        t.transaction_id,
        t.user_id,
        t.goal_id,
        t.amount,
        t.type,
        t.note,
        t.created_at,
        g.name AS goal_name,
        ROUND(
          SUM(
            CASE WHEN t.type = 'deposit' THEN t.amount ELSE -t.amount END
          ) OVER (
            PARTITION BY t.goal_id
            ORDER BY t.created_at ASC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          )::numeric,
          2
        ) AS balance_after
      FROM transactions t
      INNER JOIN saving_goals g ON t.goal_id = g.goal_id
      WHERE ${whereClause}
    )
    SELECT *
    FROM balances
    ORDER BY ${orderClause}
    LIMIT $${params.length - 1}
    OFFSET $${params.length}
  `;

  try {
    const result = await pool.query(query, params);
    return result.rows.map((row) => ({
      ...row,
      balance_after: Number.parseFloat(row.balance_after),
    }));
  } catch (err) {
    throw new Error(`Error fetching paginated transactions: ${err.message}`);
  }
};

const countTransactionsForGoal = async (goalId) => {
  const query = `
    SELECT COUNT(*)::int AS total
    FROM transactions
    WHERE goal_id = $1
  `;

  try {
    const result = await pool.query(query, [goalId]);
    return result.rows[0]?.total ?? 0;
  } catch (err) {
    throw new Error(`Error counting goal transactions: ${err.message}`);
  }
};

const getPaginatedTransactionsForGoal = async (goalId, { limit, offset, sort = 'created_at_desc' }) => {
  const orderClause = sort === 'created_at_asc'
    ? 'created_at ASC'
    : 'created_at DESC';

  const query = `
    WITH balances AS (
      SELECT
        transaction_id,
        user_id,
        goal_id,
        amount,
        type,
        note,
        created_at,
        ROUND(
          SUM(
            CASE WHEN type = 'deposit' THEN amount ELSE -amount END
          ) OVER (
            ORDER BY created_at ASC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          )::numeric,
          2
        ) AS balance_after
      FROM transactions
      WHERE goal_id = $1
    )
    SELECT *
    FROM balances
    ORDER BY ${orderClause}
    LIMIT $2
    OFFSET $3
  `;

  try {
    const result = await pool.query(query, [goalId, limit, offset]);
    return result.rows.map((row) => ({
      ...row,
      balance_after: Number.parseFloat(row.balance_after),
    }));
  } catch (err) {
    throw new Error(`Error fetching paginated goal transactions: ${err.message}`);
  }
};

const getTransactionsWithGoalByUserId = async (userId, goalId = null) => {
  const params = [userId];
  let goalFilter = '';

  if (goalId) {
    params.push(goalId);
    goalFilter = 'AND t.goal_id = $2';
  }

  const query = `
    SELECT
      t.transaction_id,
      t.user_id,
      t.goal_id,
      t.amount,
      t.type,
      t.note,
      t.created_at,
      g.name AS goal_name
    FROM transactions t
    INNER JOIN saving_goals g ON t.goal_id = g.goal_id
    WHERE t.user_id = $1
    ${goalFilter}
    ORDER BY t.created_at DESC
  `;

  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    throw new Error(`Error fetching user transactions: ${err.message}`);
  }
};

const enrichTransactionsWithBalance = (transactions) => {
  const byGoal = {};

  const chronological = [...transactions].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  chronological.forEach((tx) => {
    const goalId = tx.goal_id;
    const amount = Number.parseFloat(tx.amount);

    if (!byGoal[goalId]) {
      byGoal[goalId] = 0;
    }

    if (tx.type === 'deposit') {
      byGoal[goalId] += amount;
    } else {
      byGoal[goalId] -= amount;
    }

    tx.balance_after = Number(byGoal[goalId].toFixed(2));
  });

  return transactions;
};

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

const checkAndMarkComplete = async (goalId) => {
  const query = `
    UPDATE saving_goals
    SET is_complete = true, completed_at = NOW()
    WHERE goal_id = $1
      AND saved_amount >= target_amount
      AND is_complete = false
    RETURNING goal_id, name, is_complete, completed_at
  `;

  try {
    const result = await pool.query(query, [goalId]);
    return result.rows[0] || null;
  } catch (err) {
    throw new Error(`Error marking goal complete: ${err.message}`);
  }
};

module.exports = {
  createTransaction,
  getTransactionsByGoalId,
  getTransactionsByUserId,
  getTransactionsWithGoalByUserId,
  countTransactionsForUser,
  getPaginatedTransactionsForUser,
  countTransactionsForGoal,
  getPaginatedTransactionsForGoal,
  enrichTransactionsWithBalance,
  updateGoalSavedAmount,
  checkAndMarkComplete,
};
