const userModel = require('../models/userModel');
const calculationModel = require('../models/calculationModel');

const getUserBudgetContext = async (userId) => {
  const user = await userModel.getUserMonthlyBudgetById(userId);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const monthlyBudget = calculationModel.roundToTwo(user.monthly_budget);
  const mode = user.is_earner ? 'earner' : 'non-earner';

  return {
    monthlyBudget: monthlyBudget > 0 ? monthlyBudget : null,
    allocationBudget: mode === 'earner' && monthlyBudget > 0 ? monthlyBudget : 0,
    mode,
    isEarner: user.is_earner,
  };
};

const buildGoalResponse = (goal, allocatedGoals, mode = 'earner') => {
  const allocatedGoal = allocatedGoals.find((item) => item.goal_id === goal.goal_id);
  const allocatedAmount = mode === 'earner'
    ? allocatedGoal?.allocated_monthly_amount ?? 0
    : 0;
  const breakdown = calculationModel.getGoalBreakdown(goal, allocatedAmount);

  return {
    ...breakdown,
    allocated_monthly_amount: mode === 'earner' ? breakdown.allocated_monthly_amount : null,
    is_feasible: mode === 'earner' ? breakdown.is_feasible : null,
    allocation_percentage: mode === 'earner' ? allocatedGoal?.allocation_percentage ?? 0 : null,
    weight_magnitude: mode === 'earner' ? allocatedGoal?.weight_magnitude ?? 0 : null,
    weight_urgency: mode === 'earner' ? allocatedGoal?.weight_urgency ?? 0 : null,
    score: mode === 'earner' ? allocatedGoal?.score ?? 0 : null,
    mode,
  };
};

module.exports = {
  getUserBudgetContext,
  buildGoalResponse,
};
