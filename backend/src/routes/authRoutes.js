const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../dbcon');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    // Validation
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ 
        error: 'Please provide first name, last name, email, and password' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters' 
      });
    }

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'An account with this email already exists' 
      });
    }

    // Hash the password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create the user
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, first_name, last_name, email, monthly_budget, created_at`,
      [first_name, last_name, email, password_hash]
    );

    const user = result.rows[0];

    // Create default categories for new user
    await pool.query(
      `INSERT INTO categories (user_id, name, colour) VALUES
       ($1, 'Food & Dining', '#D4A574'),
       ($1, 'Transport', '#243054'),
       ($1, 'Entertainment', '#E8C77A'),
       ($1, 'Shopping', '#4E4B46'),
       ($1, 'Healthcare', '#1A2340'),
       ($1, 'Utilities', '#D4A574'),
       ($1, 'Other', '#4E4B46')`,
      [user.user_id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        monthly_budget: user.monthly_budget
      },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Please provide email and password' 
      });
    }

    // Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    // Check if user exists
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Compare password with hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        monthly_budget: user.monthly_budget
      },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;