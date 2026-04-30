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

router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const monthlyBudget = await getUserBudgetOrThrow(userId);
    const goals = await goalModel.getGoalsByUserId(userId);
    const allocatedGoals = calculationModel.calculateAutoAllocations(goals, monthlyBudget);
    const goalBreakdowns = goals.map((goal) => {
      const allocation = allocatedGoals.find((item) => item.goal_id === goal.goal_id);
      const breakdown = calculationModel.getGoalBreakdown(
        goal,
        allocation?.allocated_monthly_amount ?? 0
      );

      return {
        goal_id: goal.goal_id,
        goal_name: goal.name,
        target_amount: breakdown.target_amount,
        remaining_amount: breakdown.remaining_amount,
        deadline: breakdown.deadline,
        days_remaining: breakdown.days_remaining,
        monthly_needed: breakdown.savings_needed.monthly,
        allocated_monthly_amount: breakdown.allocated_monthly_amount,
        shortfall: calculationModel.roundToTwo(
          Math.max(0, breakdown.savings_needed.monthly - breakdown.allocated_monthly_amount)
        ),
        surplus: calculationModel.roundToTwo(
          Math.max(0, breakdown.allocated_monthly_amount - breakdown.savings_needed.monthly)
        ),
        is_feasible: breakdown.is_feasible,
        on_track: breakdown.on_track,
        issues: [],
        recommendations: [],
      };
    });

    goalBreakdowns.forEach((goal) => {
      if (!goal.is_feasible) {
        goal.issues.push(
          `Allocated $${goal.allocated_monthly_amount.toFixed(2)}/month but need $${goal.monthly_needed.toFixed(2)}/month. Shortfall: $${goal.shortfall.toFixed(2)}.`
        );
        goal.recommendations.push(
          `Increase monthly_budget by at least $${goal.shortfall.toFixed(2)} to fully fund this goal on time.`
        );
      } else {
        goal.recommendations.push(
          `This goal is currently fundable with a $${goal.surplus.toFixed(2)}/month buffer.`
        );
      }

      if (!goal.on_track) {
        goal.issues.push('Current saved progress is behind the pace required for the deadline.');
      }

      if (goal.days_remaining <= 30) {
        goal.issues.push('Less than a month remains before this deadline.');
      }
    });

    const totalAllocation = calculationModel.roundToTwo(
      goalBreakdowns.reduce((sum, goal) => sum + goal.allocated_monthly_amount, 0)
    );
    const totalMonthlyNeeded = calculationModel.roundToTwo(
      goalBreakdowns.reduce((sum, goal) => sum + goal.monthly_needed, 0)
    );
    const budgetGap = calculationModel.roundToTwo(
      Math.max(0, totalMonthlyNeeded - monthlyBudget)
    );
    const anyGoalsUnderfunded = goalBreakdowns.some((goal) => !goal.is_feasible);
    const overAllocated = totalAllocation > monthlyBudget;

    const recommendations = [];

    if (budgetGap > 0) {
      recommendations.push(`Increase monthly_budget to $${totalMonthlyNeeded.toFixed(2)} to fully fund every goal on time.`);
    } else if (goalBreakdowns.length > 0) {
      recommendations.push('Current monthly_budget is sufficient for the system-generated allocation plan.');
    }

    if (overAllocated) {
      recommendations.push('Review allocation rounding because total allocation exceeds the monthly budget.');
    }

    res.json({
      user_id: Number.parseInt(userId, 10),
      monthly_budget: monthlyBudget,
      total_monthly_allocation: totalAllocation,
      total_monthly_needed: totalMonthlyNeeded,
      over_allocated: overAllocated,
      any_goals_underfunded: anyGoalsUnderfunded,
      warnings: overAllocated ? ['Total allocation exceeds monthly_budget.'] : [],
      recommendations,
      goals: goalBreakdowns,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

module.exports = router;
