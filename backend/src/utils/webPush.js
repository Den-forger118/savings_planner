const webpush = require('web-push');

let configured = false;

function getVapidConfig() {
  return {
    publicKey: (process.env.VAPID_PUBLIC_KEY || '').trim(),
    privateKey: (process.env.VAPID_PRIVATE_KEY || '').trim(),
    subject: (process.env.VAPID_SUBJECT || 'mailto:noreply@quant.app').trim(),
  };
}

function isWebPushConfigured() {
  const { publicKey, privateKey } = getVapidConfig();
  return Boolean(publicKey && privateKey);
}

function ensureWebPush() {
  const { publicKey, privateKey, subject } = getVapidConfig();
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
}

function getVapidPublicKey() {
  const { publicKey } = getVapidConfig();
  return publicKey || null;
}

/**
 * @returns {{ sent: boolean, gone?: boolean, error?: string }}
 */
async function sendPushNotification(subscription, payload) {
  if (!ensureWebPush()) {
    return { sent: false, error: 'Web push not configured' };
  }

  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);

  try {
    await webpush.sendNotification(subscription, body);
    return { sent: true };
  } catch (err) {
    const status = err.statusCode || err.status;
    if (status === 404 || status === 410) {
      return { sent: false, gone: true, error: err.message };
    }
    console.error('[push] Send failed:', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = {
  isWebPushConfigured,
  getVapidPublicKey,
  sendPushNotification,
};
