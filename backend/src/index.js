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

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:8080',
  'http://localhost:3000',
].filter(Boolean);

const isDevelopment = process.env.NODE_ENV !== 'production';

const corsOptions = {
  origin(origin, callback) {
    if (isDevelopment || !origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS origin not allowed: ${origin}`));
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

