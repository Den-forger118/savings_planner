const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../dbcon');
const { formatAuthUser } = require('../utils/authUser');
const userModel = require('../models/userModel');
const {
  FRONTEND_URL,
  sendLoginNotice,
  sendPasswordResetEmail,
} = require('../utils/mailer');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_MS = 5 * 60 * 1000;

function buildLockPayload(lockedUntil) {
  const until = new Date(lockedUntil);
  const retryAfterSeconds = Math.max(0, Math.ceil((until.getTime() - Date.now()) / 1000));
  return {
    code: 'LOGIN_LOCKED',
    error: 'For your security, sign-in is paused for a few minutes.',
    lockedUntil: until.toISOString(),
    retryAfterSeconds,
  };
}

async function clearLoginLock(userId) {
  await pool.query(
    `UPDATE users
     SET failed_login_attempts = 0,
         login_locked_until = NULL
     WHERE user_id = $1`,
    [userId]
  );
}

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
       RETURNING user_id, first_name, last_name, email, monthly_budget, monthly_income,
         is_earner, is_admin, currency, currency_symbol, onboarding_complete, created_at`,
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
      user: formatAuthUser(user),
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

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Please provide email and password' 
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    const user = result.rows[0];

    // Same generic message whether or not the account exists
    if (!user) {
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        error: 'That email or password doesn’t look right.',
      });
    }

    const lockedUntilRaw = user.login_locked_until;
    if (lockedUntilRaw) {
      const lockedUntil = new Date(lockedUntilRaw);
      if (lockedUntil.getTime() > Date.now()) {
        return res.status(429).json(buildLockPayload(lockedUntil));
      }
      await clearLoginLock(user.user_id);
      user.failed_login_attempts = 0;
      user.login_locked_until = null;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      const nextAttempts = (Number(user.failed_login_attempts) || 0) + 1;

      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        await pool.query(
          `UPDATE users
           SET failed_login_attempts = $1,
               login_locked_until = $2
           WHERE user_id = $3`,
          [nextAttempts, lockedUntil.toISOString(), user.user_id]
        );
        return res.status(429).json(buildLockPayload(lockedUntil));
      }

      await pool.query(
        `UPDATE users
         SET failed_login_attempts = $1,
             login_locked_until = NULL
         WHERE user_id = $2`,
        [nextAttempts, user.user_id]
      );

      const attemptsRemaining = MAX_FAILED_ATTEMPTS - nextAttempts;
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        error: 'That email or password doesn’t look right.',
        failedAttempts: nextAttempts,
        attemptsRemaining,
      });
    }

    if (user.is_active === false) {
      return res.status(403).json({
        code: 'ACCOUNT_DEACTIVATED',
        error: 'This account is deactivated. Please contact support.',
      });
    }

    await clearLoginLock(user.user_id);

    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    void sendLoginNotice(user);

    res.json({
      message: 'Login successful',
      user: formatAuthUser(user),
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const FORGOT_ACK =
  'If an account exists for that email, a reset link is on its way.';

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Please provide your email address' });
    }

    const result = await pool.query(
      'SELECT user_id, first_name, last_name, email, is_active FROM users WHERE LOWER(email) = $1',
      [normalizedEmail]
    );
    const user = result.rows[0];

    if (!user || user.is_active === false) {
      return res.json({ message: FORGOT_ACK });
    }

    const recent = await pool.query(
      `SELECT created_at
       FROM password_reset_tokens
       WHERE user_id = $1
         AND used_at IS NULL
         AND created_at > NOW() - INTERVAL '2 minutes'
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.user_id]
    );

    if (recent.rows.length > 0) {
      return res.json({ message: FORGOT_ACK });
    }

    await pool.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1
         AND used_at IS NULL`,
      [user.user_id]
    );

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.user_id, tokenHash, expiresAt.toISOString()]
    );

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}`;
    void sendPasswordResetEmail(user, resetUrl);

    return res.json({ message: FORGOT_ACK });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const rawToken = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');

    if (!rawToken || !password) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const tokenHash = hashResetToken(rawToken);
    const result = await pool.query(
      `SELECT token_id, user_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );
    const row = result.rows[0];

    if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) {
      return res.status(400).json({
        error: 'This reset link is invalid or has expired. Request a new one.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await userModel.updatePassword(row.user_id, passwordHash);
    await clearLoginLock(row.user_id);

    await pool.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1
         AND used_at IS NULL`,
      [row.user_id]
    );

    return res.json({ message: 'Password updated. You can sign in with your new password.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
