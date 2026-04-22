const express = require('express');
const router = express.Router();

// GET /api/goals - Get all goals
router.get('/', (req, res) => {
  // Placeholder response - replace with actual database logic
  res.json({ 
    message: 'Get all goals',
    goals: []
  });
});

// POST /api/goals - Create a new goal
router.post('/', (req, res) => {
  const { name, targetAmount, deadline } = req.body; 
  
  //basic validation
  if (!name || !targetAmount || !deadline) {
    return res.status(400).json({ error: 
        'Name, target amount, and deadline are required' });
    }


res.status(201).json({
    message: "Goal created successfully",
    goals: {name, targetAmount, deadline}
});

});

//fetch a specific or single goal by id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  // Placeholder response - replace with actual database logic
  res.json({
    message: `Get goal with ID: ${id}`,
    goal: { id }
  });
});

module.exports = router;