const express = require('express');
const router = express.Router();
const userModel = require('../models/userModel');
const goalModel = require('../models/goalModel');
const calculationModel = require('../models/calculationModel');

router.get('/:userId/budget-allocation', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await userModel.getUserMonthlyBudgetById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.monthly_budget === null || user.monthly_budget === undefined) {
      return res.status(400).json({ error: 'Please set your monthly budget first' });
    }

    const monthlyBudget = calculationModel.roundToTwo(user.monthly_budget);
    const goals = await goalModel.getGoalsByUserId(userId);
    const allocatedGoals = calculationModel.calculateAutoAllocations(goals, monthlyBudget);

    const goalBreakdown = goals.map((goal) => {
      const allocation = allocatedGoals.find((item) => item.goal_id === goal.goal_id);
      const details = calculationModel.getGoalBreakdown(
        goal,
        allocation?.allocated_monthly_amount ?? 0
      );

      return {
        goal_id: goal.goal_id,
        name: goal.name,
        target_amount: details.target_amount,
        deadline: details.deadline,
        days_remaining: details.days_remaining,
        daily_needed: details.savings_needed.daily,
        monthly_needed: details.savings_needed.monthly,
        allocated_monthly: details.allocated_monthly_amount,
        allocation_percentage: allocation?.allocation_percentage ?? 0,
        is_feasible: details.is_feasible,
      };
    });

    const totalAllocationSum = calculationModel.roundToTwo(
      goalBreakdown.reduce((sum, goal) => sum + goal.allocated_monthly, 0)
    );

    res.json({
      user_id: Number.parseInt(userId, 10),
      monthly_budget: monthlyBudget,
      goals: goalBreakdown,
      total_allocation_sum: totalAllocationSum,
      any_goals_underfunded: goalBreakdown.some((goal) => !goal.is_feasible),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
