// imports
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const goalRoutes = require('./routes/goalRoutes');
const pool = require('./dbcon');
const suggestionsRoute = require('./routes/suggestionsRoute');
const userRoutes = require('./routes/userRoutes');
const transactionRoute = require('./routes/transactionRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const reportRoutes = require('./routes/reportRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const adminMiddleware = require('./middleware/adminMiddleware');
const { runMigrations } = require('./migrate');
const { startReminderCron, runReminderJob } = require('./jobs/reminderJob');
const paymentRoutes = require('./routes/paymentRoutes');
const { handlePaystackWebhook } = require('./routes/paymentRoutes');


// app setup
const app = express();

const normalizeOrigin = (value) => String(value || '').trim().replace(/\/$/, '');

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_WWW,
  ...(process.env.FRONTEND_URLS || '').split(','),
  'http://localhost:8080',
  'http://localhost:3000',
]
  .map(normalizeOrigin)
  .filter(Boolean);

const isDevelopment = process.env.NODE_ENV !== 'production';
// Preview URLs change every deploy. Default on; set ALLOW_VERCEL_PREVIEWS=false to disable.
const allowVercelPreviews =
  String(process.env.ALLOW_VERCEL_PREVIEWS || 'true').toLowerCase() !== 'false';

const isAllowedOrigin = (origin) => {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return true;
  if (allowedOrigins.includes(normalized)) return true;

  // Any https://*.vercel.app origin (production + preview deployments)
  if (allowVercelPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized)) {
    return true;
  }

  return false;
};

const corsOptions = {
  origin(origin, callback) {
    if (isDevelopment || isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    // Do not throw — a thrown error becomes HTTP 500 on preflight
    console.warn(`[cors] Blocked origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

// middleware
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// Paystack webhook needs the raw body for HMAC verification — mount before JSON parser
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  handlePaystackWebhook
);

app.use(express.json());



// test database connection and apply pending migrations
pool.query('SELECT NOW()', async (err, res) => {
  if (err) {
    console.error('Error connecting to the database', err);
    return;
  }

  console.log('Database connection test successful:', res.rows[0]);
  console.log('Connected to the database successfully!(postgreSQL)');

  try {
    await runMigrations();
    console.log('Database migrations applied successfully');
  } catch (migrationErr) {
    console.error('Error applying database migrations', migrationErr);
  }
});



//mount routes
app.use('/api/goals', authMiddleware, goalRoutes);
app.use('/api/suggestions', authMiddleware, suggestionsRoute);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/transactions', authMiddleware, transactionRoute);
app.use('/api/expenses', authMiddleware, expenseRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);
app.use('/api/payments', authMiddleware, paymentRoutes);
app.use('/api/push', authMiddleware, require('./routes/pushRoutes'));
app.use('/api/ai', authMiddleware, require('./routes/aiRoutes'));

//Public routes for authentication (no auth middleware)
app.use('/api/auth', authRoutes);

// Optional external cron trigger (Railway cron / cron-job.org)
app.post('/api/internal/reminders/run', async (req, res) => {
  const secret = (process.env.REMINDER_CRON_SECRET || '').trim();
  if (!secret || req.get('x-reminder-secret') !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await runReminderJob();
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[reminders] Manual run failed:', err.message);
    return res.status(500).json({ error: 'Reminder job failed' });
  }
});

// health check route
app.get('/', (request, response) => {
  response.json({'message': 'Savings Planner API is running!'});
});


// server setup 
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startReminderCron();
});

