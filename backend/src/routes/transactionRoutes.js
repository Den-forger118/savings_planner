const express = require('express');
const router = express.Router();
const transactionModel = require('../models/transactionModel');
const goalModel = require('../models/goalModel');
const calculationModel = require('../models/calculationModel');

// POST /api/transactions — create a new transaction
router.post('/', async (req, res) => {
  try {
    const { userId, goalId, amount, type, note } = req.body;
    
    // Validation
    if (!userId || !goalId || !amount || !type) {
      return res.status(400).json({ 
        error: 'Please provide userId, goalId, amount, and type (deposit/withdrawal)' 
      });
    }
    
    if (!['deposit', 'withdrawal'].includes(type)) {
      return res.status(400).json({ 
        error: 'Type must be either "deposit" or "withdrawal"' 
      });
    }
    
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ 
        error: 'Amount must be greater than 0' 
      });
    }

    // Create transaction
    const transaction = await transactionModel.createTransaction(
      userId,
      goalId,
      parseFloat(amount),
      type,
      note || ''
    );

    // Update goal's saved_amount
    await transactionModel.updateGoalSavedAmount(goalId);

    // Fetch updated goal with calculations
    const updatedGoal = await goalModel.getGoalById(goalId);
    const goalWithCalculations = calculationModel.getGoalBreakdown(updatedGoal);

    res.status(201).json({ 
      message: 'Transaction recorded successfully',
      transaction,
      updated_goal: goalWithCalculations
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions?goalId=1 — get transactions for a goal
router.get('/', async (req, res) => {
  try {
    const { goalId } = req.query;
    
    if (!goalId) {
      return res.status(400).json({ error: 'goalId query parameter is required' });
    }
    
    const transactions = await transactionModel.getTransactionsByGoalId(goalId);
    
    res.json({ 
      goal_id: goalId,
      count: transactions.length,
      transactions 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;