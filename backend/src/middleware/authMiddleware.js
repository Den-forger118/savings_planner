const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

  // No token provided
  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied. Please log in.' 
    });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to request
    next(); // Move to the next handler
  } catch (err) {
    return res.status(403).json({ 
      error: 'Invalid or expired token. Please log in again.' 
    });
  }
};

module.exports = authMiddleware;