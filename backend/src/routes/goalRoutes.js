const express = require('express');
const router = express.Router();
const goalModel = require('../models/goalModel');
const userModel = require('../models/userModel');
const calculationModel = require('../models/calculationModel');

const getUserBudgetOrThrow = async (userId) => {
  const user = await userModel.getUserMonthlyBudgetById(userId);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.monthly_budget === null || user.monthly_budget === undefined) {
    const error = new Error('Please set your monthly budget first');
    error.statusCode = 400;
    throw error;
  }

  return calculationModel.roundToTwo(user.monthly_budget);
};

const buildGoalResponse = (goal, allocatedGoals) => {
  const allocatedGoal = allocatedGoals.find((item) => item.goal_id === goal.goal_id);
  const allocatedAmount = allocatedGoal?.allocated_monthly_amount ?? 0;

  return {
    ...calculationModel.getGoalBreakdown(goal, allocatedAmount),
    allocation_percentage: allocatedGoal?.allocation_percentage ?? 0,
    weight_magnitude: allocatedGoal?.weight_magnitude ?? 0,
    weight_urgency: allocatedGoal?.weight_urgency ?? 0,
    score: allocatedGoal?.score ?? 0,
  };
};

const sendError = (res, err) => {
  res.status(err.statusCode || 500).json({ error: err.message });
};

const handleUserGoalsRequest = async (userId, res) => {
  const monthlyBudget = await getUserBudgetOrThrow(userId);
  const goals = await goalModel.getGoalsByUserId(userId);
  const allocatedGoals = calculationModel.calculateAutoAllocations(goals, monthlyBudget);
  const goalsWithCalculations = goals.map((goal) => buildGoalResponse(goal, allocatedGoals));

  res.json({
    user_id: Number.parseInt(userId, 10),
    monthly_budget: monthlyBudget,
    count: goalsWithCalculations.length,
    goals: goalsWithCalculations,
  });
};

// GET /api/goals?userId=1 - fetch all goals with automatic allocations
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    await handleUserGoalsRequest(userId, res);
  } catch (err) {
    sendError(res, err);
  }
});

// GET /api/goals/user/:userId - alias for fetching all goals by user id
router.get('/user/:userId', async (req, res) => {
  try {
    await handleUserGoalsRequest(req.params.userId, res);
  } catch (err) {
    sendError(res, err);
  }
});

// POST /api/goals - create a new goal and return its allocation
router.post('/', async (req, res) => {
  try {
    const { userId, name, targetAmount, deadline, priority } = req.body;

    if (!userId || !name || targetAmount === undefined || !deadline) {
      return res.status(400).json({
        error: 'Please provide userId, name, targetAmount, and deadline',
      });
    }

    const monthlyBudget = await getUserBudgetOrThrow(userId);
    const goal = await goalModel.createGoal(userId, name, targetAmount, deadline, priority);
    const userGoals = await goalModel.getGoalsByUserId(userId);
    const allocatedGoals = calculationModel.calculateAutoAllocations(userGoals, monthlyBudget);
    const goalWithCalculations = buildGoalResponse(goal, allocatedGoals);

    res.status(201).json({
      message: 'Goal created successfully',
      goal: goalWithCalculations,
    });
  } catch (err) {
    sendError(res, err);
  }
});

// GET /api/goals/:id - fetch a single goal with automatic allocation
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const goal = await goalModel.getGoalById(id);

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const monthlyBudget = await getUserBudgetOrThrow(goal.user_id);
    const userGoals = await goalModel.getGoalsByUserId(goal.user_id);
    const allocatedGoals = calculationModel.calculateAutoAllocations(userGoals, monthlyBudget);
    const goalWithCalculations = buildGoalResponse(goal, allocatedGoals);

    res.json({ goal: goalWithCalculations });
  } catch (err) {
    sendError(res, err);
  }
});

// PUT /api/goals/:id - update a goal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, targetAmount, deadline, priority } = req.body;

    if (!name || targetAmount === undefined || !deadline) {
      return res.status(400).json({
        error: 'Please provide name, targetAmount, and deadline',
      });
    }

    const existingGoal = await goalModel.getGoalById(id);

    if (!existingGoal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const monthlyBudget = await getUserBudgetOrThrow(existingGoal.user_id);
    const goal = await goalModel.updateGoal(id, name, targetAmount, deadline, priority);
    const userGoals = await goalModel.getGoalsByUserId(existingGoal.user_id);
    const allocatedGoals = calculationModel.calculateAutoAllocations(userGoals, monthlyBudget);
    const goalWithCalculations = buildGoalResponse(goal, allocatedGoals);

    res.json({
      message: 'Goal updated successfully',
      goal: goalWithCalculations,
    });
  } catch (err) {
    sendError(res, err);
  }
});

// DELETE /api/goals/:id - delete a goal
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedGoal = await goalModel.deleteGoal(id);

    if (!deletedGoal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({
      message: 'Goal deleted successfully',
      goal_id: deletedGoal.goal_id,
    });
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;
