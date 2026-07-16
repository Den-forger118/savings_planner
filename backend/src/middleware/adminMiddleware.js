const userModel = require('../models/userModel');

const adminMiddleware = async (req, res, next) => {
  try {
    const user = await userModel.getUserById(req.user.userId);

    if (!user || user.is_admin !== true) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = adminMiddleware;
