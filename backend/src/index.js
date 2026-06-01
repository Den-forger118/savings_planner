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
const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/authMiddleware');


// app setup
const app = express();

// middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Adjust this to match your frontend URL
  credentials: true, // Allow cookies to be sent
}));
app.use(express.json());



// test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err){
    console.error('Error connecting to the database', err);
  } else {
    console.log('Database connection test successful:', res.rows[0]);
    console.log('Connected to the database successfully!(postgreSQL)');
  }
});



//mount routes
app.use('/api/goals', authMiddleware, goalRoutes);
app.use('/api/suggestions', authMiddleware, suggestionsRoute);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/transactions', authMiddleware, transactionRoute);
app.use('/api/expenses', authMiddleware, expenseRoutes);

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

