const pool = require('../dbcon');

async function upsertSubscription(userId, subscription) {
  const endpoint = subscription?.endpoint;
  if (!endpoint) {
    const error = new Error('Push subscription endpoint is required');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `
      INSERT INTO push_subscriptions (user_id, endpoint, subscription)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (endpoint) DO UPDATE
        SET user_id = EXCLUDED.user_id,
            subscription = EXCLUDED.subscription,
            created_at = NOW()
      RETURNING subscription_id, user_id, endpoint, created_at
    `,
    [userId, endpoint, JSON.stringify(subscription)]
  );
  return result.rows[0];
}

async function deleteByEndpoint(userId, endpoint) {
  const result = await pool.query(
    `
      DELETE FROM push_subscriptions
      WHERE user_id = $1 AND endpoint = $2
      RETURNING subscription_id
    `,
    [userId, endpoint]
  );
  return result.rowCount > 0;
}

async function deleteByEndpointOnly(endpoint) {
  await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
}

async function listForUser(userId) {
  const result = await pool.query(
    `
      SELECT subscription_id, endpoint, subscription, created_at
      FROM push_subscriptions
      WHERE user_id = $1
    `,
    [userId]
  );
  return result.rows;
}

async function setPushNotifications(userId, enabled) {
  const result = await pool.query(
    `
      UPDATE users
      SET push_notifications = $2
      WHERE user_id = $1
      RETURNING user_id, push_notifications
    `,
    [userId, Boolean(enabled)]
  );
  return result.rows[0] || null;
}

async function countForUser(userId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM push_subscriptions WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0]?.count || 0;
}

async function deleteAllForUser(userId) {
  await pool.query(`DELETE FROM push_subscriptions WHERE user_id = $1`, [userId]);
}

module.exports = {
  upsertSubscription,
  deleteByEndpoint,
  deleteByEndpointOnly,
  deleteAllForUser,
  listForUser,
  setPushNotifications,
  countForUser,
};
