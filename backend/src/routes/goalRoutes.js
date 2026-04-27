const express = require('express');
const router = express.Router();
const goalModel = require('../models/goalModel');

// GET /api/goals?userId=1 — fetch all goals for a user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }
    
    const goals = await goalModel.getGoalsByUserId(userId);
    res.json({ goals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/goals — create a new goal
router.post('/', async (req, res) => {
  try {
    const { userId, name, targetAmount, deadline, monthlyContribution, priority } = req.body;
    
    // Validation
    if (!userId || !name || !targetAmount || !deadline) {
      return res.status(400).json({ 
        error: 'Please provide userId, name, targetAmount, and deadline' 
      });
    }
    
    const goal = await goalModel.createGoal(
      userId, 
      name, 
      targetAmount, 
      deadline, 
      monthlyContribution,
      priority
    );
    
    res.status(201).json({ message: 'Goal created successfully', goal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/goals/:id — fetch a single goal
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const goal = await goalModel.getGoalById(id);
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    res.json({ goal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/goals/:id — update a goal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, targetAmount, deadline, monthlyContribution, priority } = req.body;
    
    if (!name || !targetAmount || !deadline) {
      return res.status(400).json({ 
        error: 'Please provide name, targetAmount, and deadline' 
      });
    }
    
    const goal = await goalModel.updateGoal(id, name, targetAmount, deadline, monthlyContribution, priority);
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    res.json({ message: 'Goal updated successfully', goal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/goals/:id — delete a goal
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedGoal = await goalModel.deleteGoal(id);
    
    if (!deletedGoal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    res.json({ message: 'Goal deleted successfully', goal_id: deletedGoal.goal_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;