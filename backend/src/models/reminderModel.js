const pool = require('../dbcon');

const REMINDER_USER_FIELDS = `
  user_id, first_name, last_name, email, currency, currency_symbol,
  email_notifications, push_notifications, reminder_frequency, reminder_time,
  timezone, is_active
`;

async function getReminderEligibleUsers() {
  const result = await pool.query(`
    SELECT ${REMINDER_USER_FIELDS}
    FROM users
    WHERE is_active = true
      AND reminder_frequency <> 'off'
      AND (
        email_notifications = true
        OR push_notifications = true
      )
  `);
  return result.rows;
}

async function getActiveGoalsForUser(userId) {
  const result = await pool.query(
    `
      SELECT
        g.goal_id,
        g.user_id,
        g.name,
        g.target_amount,
        g.saved_amount,
        g.deadline,
        g.created_at,
        g.priority,
        g.is_complete,
        g.is_paused,
        COALESCE(
          (
            SELECT MAX(t.created_at)
            FROM transactions t
            WHERE t.goal_id = g.goal_id
              AND t.type = 'deposit'
          ),
          g.created_at
        ) AS last_deposit_at
      FROM saving_goals g
      WHERE g.user_id = $1
        AND g.deleted_at IS NULL
        AND g.is_complete = false
        AND g.is_paused = false
      ORDER BY g.priority ASC, g.goal_id ASC
    `,
    [userId]
  );
  return result.rows;
}

async function hasSent({ userId, kind, sendDate, goalId = null }) {
  const result = await pool.query(
    `
      SELECT 1
      FROM reminder_email_sends
      WHERE user_id = $1
        AND kind = $2
        AND send_date = $3
        AND COALESCE(goal_id, 0) = COALESCE($4, 0)
      LIMIT 1
    `,
    [userId, kind, sendDate, goalId]
  );
  return result.rowCount > 0;
}

async function recordSend({ userId, kind, sendDate, goalId = null }) {
  try {
    const result = await pool.query(
      `
        INSERT INTO reminder_email_sends (user_id, goal_id, kind, send_date)
        VALUES ($1, $2, $3, $4)
        RETURNING send_id
      `,
      [userId, goalId, kind, sendDate]
    );
    return result.rowCount > 0;
  } catch (err) {
    // Unique index race — another worker already claimed this send
    if (err.code === '23505') return false;
    console.error('[reminders] Failed to record send:', err.message);
    return false;
  }
}

async function getLastSendDate({ userId, kind, goalId = null }) {
  const result = await pool.query(
    `
      SELECT send_date
      FROM reminder_email_sends
      WHERE user_id = $1
        AND kind = $2
        AND COALESCE(goal_id, 0) = COALESCE($3, 0)
      ORDER BY send_date DESC
      LIMIT 1
    `,
    [userId, kind, goalId]
  );
  return result.rows[0]?.send_date || null;
}

async function getUserForReminder(userId) {
  const result = await pool.query(
    `SELECT ${REMINDER_USER_FIELDS} FROM users WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

module.exports = {
  getReminderEligibleUsers,
  getActiveGoalsForUser,
  hasSent,
  recordSend,
  getLastSendDate,
  getUserForReminder,
};
