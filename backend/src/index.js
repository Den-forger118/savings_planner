// imports
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const goalRoutes = require('./routes/goalRoutes');

// app setup
const app = express();

// middleware
app.use(cors());
app.use(express.json());

//mount routes
app.use('/api/goals', goalRoutes);

// health check route
app.get('/', (request, response) => {
  response.json({'message': 'Savings Planner API is running!'});
});

// server setup 
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});