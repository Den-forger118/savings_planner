const express = require('express');
const adminModel = require('../models/adminModel');

const router = express.Router();

router.get('/stats', async (req, res) => {
  try {
    const stats = await adminModel.getPlatformStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { search = '', sort = 'created_at', order = 'desc' } = req.query;

    const users = await adminModel.listUsers({ search, sort, order });

    res.json({
      users,
      total_count: users.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const detail = await adminModel.getUserDetail(userId);

    if (!detail) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      ...detail,
      read_only: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active: isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    const user = await adminModel.setUserActiveStatus(
      userId,
      isActive,
      req.user.userId
    );

    res.json({
      message: isActive ? 'Account reactivated' : 'Account deactivated',
      user,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

module.exports = router;
