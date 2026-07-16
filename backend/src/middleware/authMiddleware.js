const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Access denied. Please log in.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Account not found.' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: 'Account deactivated. Contact support.' });
    }

    req.user = { userId: decoded.userId, email: decoded.email };
    next();
  } catch (err) {
    return res.status(403).json({
      error: 'Invalid or expired token. Please log in again.',
    });
  }
};

module.exports = authMiddleware;
