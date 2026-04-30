// Calculate days between two dates
const getDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert ms to days
  return Math.max(diffDays, 1); // At least 1 day
};

// Calculate remaining amount to save
const getRemainingAmount = (targetAmount, savedAmount) => {
  return Math.max(0, targetAmount - savedAmount);
};

// Calculate daily savings needed
const calculateDailySavings = (remainingAmount, daysRemaining) => {
  return (remainingAmount / daysRemaining).toFixed(2);
};

// Calculate weekly savings needed
const calculateWeeklySavings = (remainingAmount, daysRemaining) => {
  const weeks = daysRemaining / 7;
  return (remainingAmount / weeks).toFixed(2);
};

// Calculate monthly savings needed
const calculateMonthlySavings = (remainingAmount, daysRemaining) => {
  const months = daysRemaining / 30.44; // Average days per month
  return (remainingAmount / months).toFixed(2);
};

// Calculate annual savings needed
const calculateAnnualSavings = (remainingAmount, daysRemaining) => {
  const years = daysRemaining / 365.25;
  return (remainingAmount / years).toFixed(2);
};

// Determine if goal is on track
const isOnTrack = (targetAmount, savedAmount, daysRemaining, daysTotal) => {
  if (daysRemaining <= 0) return savedAmount >= targetAmount;
  
  const progressRequired = (daysTotal - daysRemaining) / daysTotal;
  const progressActual = savedAmount / targetAmount;
  
  return progressActual >= progressRequired * 0.9; // Allow 10% buffer
};

// Get full breakdown for a goal
const getGoalBreakdown = (goal) => {
  const today = new Date();
  const deadline = new Date(goal.deadline);
  
  const daysRemaining = getDaysBetween(today, deadline);
  const remainingAmount = getRemainingAmount(goal.target_amount, goal.saved_amount);
  
  // Calculate original total days when goal was created
  const created = new Date(goal.created_at);
  const daysTotal = getDaysBetween(created, deadline);
  
  // Calculate savings needed at different intervals
  const dailySavings = calculateDailySavings(remainingAmount, daysRemaining);
  const weeklySavings = calculateWeeklySavings(remainingAmount, daysRemaining);
  const monthlySavings = calculateMonthlySavings(remainingAmount, daysRemaining);
  const annualSavings = calculateAnnualSavings(remainingAmount, daysRemaining);
  
  // Calculate progress
  const percentageComplete = ((goal.saved_amount / goal.target_amount) * 100).toFixed(1);
  const onTrack = isOnTrack(goal.target_amount, goal.saved_amount, daysRemaining, daysTotal);
  
  return {
    goal_id: goal.goal_id,
    name: goal.name,
    target_amount: parseFloat(goal.target_amount),
    saved_amount: parseFloat(goal.saved_amount),
    remaining_amount: parseFloat(remainingAmount),
    deadline: goal.deadline,
    days_remaining: daysRemaining,
    percentage_complete: parseFloat(percentageComplete),
    on_track: onTrack,
    savings_needed: {
      daily: parseFloat(dailySavings),
      weekly: parseFloat(weeklySavings),
      monthly: parseFloat(monthlySavings),
      annual: parseFloat(annualSavings)
    },
    user_monthly_contribution: goal.monthly_contribution ? parseFloat(goal.monthly_contribution) : null,
    is_feasible: goal.monthly_contribution ? 
      parseFloat(goal.monthly_contribution) >= parseFloat(monthlySavings) : null
  };
};

module.exports = {
  getDaysBetween,
  getRemainingAmount,
  calculateDailySavings,
  calculateWeeklySavings,
  calculateMonthlySavings,
  calculateAnnualSavings,
  isOnTrack,
  getGoalBreakdown
};