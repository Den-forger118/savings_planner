const pushModel = require('../models/pushModel');
const { isWebPushConfigured, sendPushNotification } = require('../utils/webPush');

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/$/, '');

async function sendReminderPush(user, lines) {
  if (!isWebPushConfigured()) {
    return { skipped: true, reason: 'not_configured' };
  }

  if (user.push_notifications === false) {
    return { skipped: true, reason: 'disabled' };
  }

  const rows = await pushModel.listForUser(user.user_id);
  if (rows.length === 0) {
    return { skipped: true, reason: 'no_subscriptions' };
  }

  const safeLines = (Array.isArray(lines) ? lines : []).filter(Boolean);
  if (safeLines.length === 0) {
    return { skipped: true, reason: 'empty' };
  }

  const title = 'QUANT reminder';
  const body = safeLines.length === 1
    ? safeLines[0]
    : `${safeLines[0]} (+${safeLines.length - 1} more)`;

  const payload = {
    title,
    body,
    url: `${FRONTEND_URL}/savings`,
    tag: `quant-reminder-${user.user_id}`,
  };

  let sent = 0;
  let removed = 0;

  for (const row of rows) {
    const subscription = typeof row.subscription === 'string'
      ? JSON.parse(row.subscription)
      : row.subscription;

    const result = await sendPushNotification(subscription, payload);
    if (result.sent) {
      sent += 1;
    } else if (result.gone) {
      await pushModel.deleteByEndpointOnly(row.endpoint);
      removed += 1;
    }
  }

  if (removed > 0) {
    const left = await pushModel.countForUser(user.user_id);
    if (left === 0) {
      await pushModel.setPushNotifications(user.user_id, false);
    }
  }

  return { sent, removed, devices: rows.length };
}

module.exports = {
  sendReminderPush,
};
