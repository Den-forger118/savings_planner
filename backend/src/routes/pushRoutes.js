const express = require('express');
const pushModel = require('../models/pushModel');
const { formatAuthUser } = require('../utils/authUser');
const userModel = require('../models/userModel');
const { isWebPushConfigured, getVapidPublicKey } = require('../utils/webPush');

const router = express.Router();

router.get('/vapid-public-key', (req, res) => {
  if (!isWebPushConfigured()) {
    return res.status(503).json({
      enabled: false,
      error: 'Web push is not configured (missing VAPID keys)',
    });
  }
  return res.json({
    enabled: true,
    publicKey: getVapidPublicKey(),
  });
});

router.get('/status', async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await userModel.getUserById(userId);
    const count = await pushModel.countForUser(userId);
    return res.json({
      configured: isWebPushConfigured(),
      push_notifications: user?.push_notifications === true,
      subscription_count: count,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/subscribe', async (req, res) => {
  try {
    if (!isWebPushConfigured()) {
      return res.status(503).json({ error: 'Web push is not configured' });
    }

    const userId = req.user.userId;
    const subscription = req.body?.subscription || req.body;
    if (!subscription?.endpoint || !subscription?.keys) {
      return res.status(400).json({ error: 'A valid PushSubscription is required' });
    }

    await pushModel.upsertSubscription(userId, subscription);
    await pushModel.setPushNotifications(userId, true);
    const user = await userModel.getUserById(userId);

    return res.status(201).json({
      message: 'Push subscription saved',
      user: formatAuthUser(user),
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.delete('/subscribe', async (req, res) => {
  try {
    const userId = req.user.userId;
    const endpoint = req.body?.endpoint;
    if (!endpoint) {
      return res.status(400).json({ error: 'endpoint is required' });
    }

    await pushModel.deleteByEndpoint(userId, endpoint);
    const remaining = await pushModel.countForUser(userId);
    if (remaining === 0) {
      await pushModel.setPushNotifications(userId, false);
    }
    const user = await userModel.getUserById(userId);

    return res.json({
      message: 'Push subscription removed',
      user: formatAuthUser(user),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** Turn off push preference and drop all device subscriptions for this user. */
router.post('/disable', async (req, res) => {
  try {
    const userId = req.user.userId;
    await pushModel.deleteAllForUser(userId);
    await pushModel.setPushNotifications(userId, false);
    const user = await userModel.getUserById(userId);
    return res.json({
      message: 'Push notifications disabled',
      user: formatAuthUser(user),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
