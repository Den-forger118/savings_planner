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
const allowVercelPreviews = String(process.env.ALLOW_VERCEL_PREVIEWS || '').toLowerCase() === 'true';

const isAllowedOrigin = (origin) => {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return true;
  if (allowedOrigins.includes(normalized)) return true;

  // Vercel preview URLs change every deploy; optional allowlist for *.vercel.app
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

//Public routes for authentication (no auth middleware)
app.use('/api/auth', authRoutes);
// health check route
app.get('/', (request, response) => {
  response.json({'message': 'Savings Planner API is running!'});
});


// server setup 
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

