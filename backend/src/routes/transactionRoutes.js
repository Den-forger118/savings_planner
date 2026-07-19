const express = require('express');
const router = express.Router();
const transactionModel = require('../models/transactionModel');
const goalModel = require('../models/goalModel');
const calculationModel = require('../models/calculationModel');
const { getUserBudgetContext, buildGoalResponse } = require('../utils/budgetContext');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const buildUpdatedGoalResponse = async (goal) => {
  const budgetContext = await getUserBudgetContext(goal.user_id);
  const userGoals = await goalModel.getGoalsByUserId(goal.user_id);
  const allocatedGoals = budgetContext.mode === 'earner'
    ? calculationModel.calculateAutoAllocations(userGoals, budgetContext.allocationBudget)
    : [];

  return buildGoalResponse(goal, allocatedGoals, budgetContext.mode);
};

router.post('/', async (req, res) => {
  try {
    const { userId, goalId, amount, type, note } = req.body;

    if (!userId || !goalId || !amount || !type) {
      return res.status(400).json({
        error: 'Please provide userId, goalId, amount, and type (deposit/withdrawal)',
      });
    }

    if (!['deposit', 'withdrawal'].includes(type)) {
      return res.status(400).json({
        error: 'Type must be either "deposit" or "withdrawal"',
      });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than 0',
      });
    }

    const { transaction } = await transactionModel.recordTransaction(
      userId,
      goalId,
      parseFloat(amount),
      type,
      note || ''
    );

    const completedGoal = await transactionModel.checkAndMarkComplete(goalId);

    const updatedGoal = await goalModel.getGoalById(goalId);
    const goalWithCalculations = await buildUpdatedGoalResponse(updatedGoal);

    res.status(201).json({
      message: 'Transaction recorded successfully',
      transaction,
      updated_goal: goalWithCalculations,
      goal_completed: completedGoal ? true : false,
      completed_goal_name: completedGoal ? completedGoal.name : null,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
});

// GET /api/transactions?userId=1&page=1&limit=25&goalId=&search=&sort=created_at_desc
// GET /api/transactions?goalId=1&page=1&limit=10
router.get('/', async (req, res) => {
  try {
    const { goalId, userId, search, sort } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    if (userId) {
      const totalCount = await transactionModel.countTransactionsForUser(userId, {
        goalId: goalId || null,
        search: search?.trim() || null,
      });

      const transactions = await transactionModel.getPaginatedTransactionsForUser(userId, {
        goalId: goalId || null,
        search: search?.trim() || null,
        limit,
        offset,
        sort: sort || 'created_at_desc',
      });

      return res.json({
        user_id: Number.parseInt(userId, 10),
        goal_id: goalId ? Number.parseInt(goalId, 10) : null,
        transactions,
        pagination: buildPaginationMeta(totalCount, page, limit),
      });
    }

    if (!goalId) {
      return res.status(400).json({ error: 'userId or goalId query parameter is required' });
    }

    const totalCount = await transactionModel.countTransactionsForGoal(goalId);
    const transactions = await transactionModel.getPaginatedTransactionsForGoal(goalId, {
      limit,
      offset,
      sort: sort || 'created_at_desc',
    });

    res.json({
      goal_id: Number.parseInt(goalId, 10),
      transactions,
      pagination: buildPaginationMeta(totalCount, page, limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
