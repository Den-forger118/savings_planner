const AVERAGE_DAYS_PER_MONTH = 30.44;
const MAGNITUDE_WEIGHT = 0.5;
const URGENCY_WEIGHT = 0.5;

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundToTwo = (value) => Number(toNumber(value).toFixed(2));

// Calculate days between two dates
const getDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 1);
};

// Calculate remaining amount to save
const getRemainingAmount = (targetAmount, savedAmount) => {
  return Math.max(0, toNumber(targetAmount) - toNumber(savedAmount));
};

// Calculate daily savings needed
const calculateDailySavings = (remainingAmount, daysRemaining) => {
  return roundToTwo(toNumber(remainingAmount) / Math.max(daysRemaining, 1));
};

// Calculate weekly savings needed
const calculateWeeklySavings = (remainingAmount, daysRemaining) => {
  const weeks = Math.max(daysRemaining, 1) / 7;
  return roundToTwo(toNumber(remainingAmount) / weeks);
};

// Calculate monthly savings needed
const calculateMonthlySavings = (remainingAmount, daysRemaining) => {
  const months = Math.max(daysRemaining, 1) / AVERAGE_DAYS_PER_MONTH;
  return roundToTwo(toNumber(remainingAmount) / months);
};

// Calculate annual savings needed
const calculateAnnualSavings = (remainingAmount, daysRemaining) => {
  const years = Math.max(daysRemaining, 1) / 365.25;
  return roundToTwo(toNumber(remainingAmount) / years);
};

// Determine if goal is on track
const isOnTrack = (targetAmount, savedAmount, daysRemaining, daysTotal) => {
  const target = toNumber(targetAmount);
  const saved = toNumber(savedAmount);

  if (target <= 0) {
    return true;
  }

  if (daysRemaining <= 0) {
    return saved >= target;
  }

  const progressRequired = (daysTotal - daysRemaining) / Math.max(daysTotal, 1);
  const progressActual = saved / target;

  return progressActual >= progressRequired * 0.9;
};

const buildGoalTiming = (goal, currentDate = new Date()) => {
  const today = new Date(currentDate);
  const deadline = new Date(goal.deadline);
  const created = goal.created_at ? new Date(goal.created_at) : today;

  const daysRemaining = getDaysBetween(today, deadline);
  const daysTotal = getDaysBetween(created, deadline);
  const targetAmount = toNumber(goal.target_amount);
  const savedAmount = toNumber(goal.saved_amount);
  const remainingAmount = getRemainingAmount(targetAmount, savedAmount);

  return {
    today,
    deadline,
    created,
    daysRemaining,
    daysTotal,
    targetAmount,
    savedAmount,
    remainingAmount,
  };
};

const distributeRoundedAllocations = (goalsWithScores, userMonthlyBudget) => {
  const budgetCents = Math.round(toNumber(userMonthlyBudget) * 100);
  const enriched = goalsWithScores.map((goal) => {
    const rawCents = toNumber(goal.rawAllocation) * 100;
    const flooredCents = Math.floor(rawCents);

    return {
      ...goal,
      rawCents,
      flooredCents,
      fractionalCents: rawCents - flooredCents,
    };
  });

  const flooredSum = enriched.reduce((sum, goal) => sum + goal.flooredCents, 0);
  let remainingCents = budgetCents - flooredSum;

  enriched
    .sort((a, b) => {
      if (b.fractionalCents !== a.fractionalCents) {
        return b.fractionalCents - a.fractionalCents;
      }
      return a.goal_id - b.goal_id;
    })
    .forEach((goal) => {
      if (remainingCents <= 0) {
        goal.allocatedCents = goal.flooredCents;
        return;
      }

      goal.allocatedCents = goal.flooredCents + 1;
      remainingCents -= 1;
    });

  return enriched
    .map((goal) => ({
      ...goal,
      allocated_monthly_amount: roundToTwo((goal.allocatedCents ?? goal.flooredCents) / 100),
    }))
    .sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return (a.goal_id ?? 0) - (b.goal_id ?? 0);
    });
};

const calculateAutoAllocations = (goals, userMonthlyBudget, currentDate = new Date()) => {
  const monthlyBudget = roundToTwo(userMonthlyBudget);
  const baseGoals = Array.isArray(goals) ? goals : [];

  if (baseGoals.length === 0) {
    return [];
  }

  if (monthlyBudget <= 0) {
    return baseGoals.map((goal) => ({
      ...goal,
      allocated_monthly_amount: 0,
      allocation_percentage: 0,
      score: 0,
      weight_magnitude: 0,
      weight_urgency: 0,
      days_remaining: buildGoalTiming(goal, currentDate).daysRemaining,
    }));
  }

  const goalMetrics = baseGoals.map((goal) => {
    const timing = buildGoalTiming(goal, currentDate);

    return {
      ...goal,
      days_remaining: timing.daysRemaining,
      target_amount: timing.targetAmount,
      saved_amount: timing.savedAmount,
      remaining_amount: timing.remainingAmount,
      urgencyReciprocal: 1 / Math.max(timing.daysRemaining, 1),
    };
  });

  const totalTargetAmount = goalMetrics.reduce((sum, goal) => sum + goal.target_amount, 0);
  const totalUrgencyReciprocal = goalMetrics.reduce((sum, goal) => sum + goal.urgencyReciprocal, 0);

  const goalsWithScores = goalMetrics.map((goal) => {
    const equalMagnitudeWeight = 1 / goalMetrics.length;
    const weightMagnitude = totalTargetAmount > 0
      ? goal.target_amount / totalTargetAmount
      : equalMagnitudeWeight;
    const weightUrgency = totalUrgencyReciprocal > 0
      ? goal.urgencyReciprocal / totalUrgencyReciprocal
      : equalMagnitudeWeight;
    const score = (weightMagnitude * MAGNITUDE_WEIGHT) + (weightUrgency * URGENCY_WEIGHT);

    return {
      ...goal,
      weight_magnitude: roundToTwo(weightMagnitude),
      weight_urgency: roundToTwo(weightUrgency),
      score: roundToTwo(score),
      rawScore: score,
    };
  });

  const totalScore = goalsWithScores.reduce((sum, goal) => sum + goal.rawScore, 0);

  const withRawAllocations = goalsWithScores.map((goal) => {
    const proportionalShare = totalScore > 0 ? goal.rawScore / totalScore : 1 / goalsWithScores.length;
    return {
      ...goal,
      rawAllocation: monthlyBudget * proportionalShare,
    };
  });

  return distributeRoundedAllocations(withRawAllocations, monthlyBudget).map((goal) => ({
    ...goal,
    allocation_percentage: monthlyBudget > 0
      ? roundToTwo((goal.allocated_monthly_amount / monthlyBudget) * 100)
      : 0,
  }));
};

// Get full breakdown for a goal
const getGoalBreakdown = (goal, allocatedMonthlyAmount = 0, currentDate = new Date()) => {
  const timing = buildGoalTiming(goal, currentDate);
  const monthlySavings = calculateMonthlySavings(timing.remainingAmount, timing.daysRemaining);
  const allocatedAmount = roundToTwo(allocatedMonthlyAmount);
  const percentageComplete = timing.targetAmount > 0
    ? roundToTwo((timing.savedAmount / timing.targetAmount) * 100)
    : 100;
  const onTrack = isOnTrack(
    timing.targetAmount,
    timing.savedAmount,
    timing.daysRemaining,
    timing.daysTotal
  );

  return {
    goal_id: goal.goal_id,
    user_id: goal.user_id,
    name: goal.name,
    target_amount: roundToTwo(timing.targetAmount),
    saved_amount: roundToTwo(timing.savedAmount),
    remaining_amount: roundToTwo(timing.remainingAmount),
    deadline: goal.deadline,
    created_at: goal.created_at,
    days_remaining: timing.daysRemaining,
    percentage_complete: percentageComplete,
    on_track: onTrack,
    savings_needed: {
      daily: calculateDailySavings(timing.remainingAmount, timing.daysRemaining),
      weekly: calculateWeeklySavings(timing.remainingAmount, timing.daysRemaining),
      monthly: monthlySavings,
      annual: calculateAnnualSavings(timing.remainingAmount, timing.daysRemaining),
    },
    allocated_monthly_amount: allocatedAmount,
    is_feasible: allocatedAmount >= monthlySavings,
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
  calculateAutoAllocations,
  getGoalBreakdown,
  roundToTwo,
};
