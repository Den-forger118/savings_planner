// imports
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const goalRoutes = require('./routes/goalRoutes');
const pool = require('./dbcon');
const suggestionsRoute = require('./routes/suggestionsRoute');

// app setup
const app = express();

// middleware
app.use(cors());
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
app.use('/api/goals', goalRoutes);
app.use('/api/suggestions', suggestionsRoute);
// health check route
app.get('/', (request, response) => {
  response.json({'message': 'Savings Planner API is running!'});
});

// server setup 
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

