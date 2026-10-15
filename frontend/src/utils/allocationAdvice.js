/**
 * Fund-need advice for priority reorders (mirrors backend getNaturalFundNeedScores).
 * Uses target size + deadline only — not manual priority.
 */

const AVERAGE_MS_PER_DAY = 1000 * 60 * 60 * 24;

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isActiveForAllocation = (goal) => !goal?.is_complete && !goal?.is_paused;

const getDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.ceil((end - start) / AVERAGE_MS_PER_DAY);
  return Math.max(diffDays, 1);
};

export const getNaturalFundNeedScores = (goals, currentDate = new Date()) => {
  const activeGoals = (Array.isArray(goals) ? goals : []).filter(isActiveForAllocation);
  if (activeGoals.length === 0) return new Map();

  const metrics = activeGoals.map((goal) => {
    const deadline = new Date(goal.deadline);
    const daysRemaining = getDaysBetween(currentDate, deadline);
    return {
      goal_id: Number(goal.goal_id),
      name: goal.name || 'This goal',
      target_amount: Math.max(0, toNumber(goal.target_amount)),
      urgencyReciprocal: 1 / daysRemaining,
    };
  });

  const totalTargetAmount = metrics.reduce((sum, goal) => sum + goal.target_amount, 0);
  const totalUrgencyReciprocal = metrics.reduce((sum, goal) => sum + goal.urgencyReciprocal, 0);
  const equalWeight = 1 / metrics.length;
  const scores = new Map();

  metrics.forEach((goal) => {
    const weightMagnitude = totalTargetAmount > 0
      ? goal.target_amount / totalTargetAmount
      : equalWeight;
    const weightUrgency = totalUrgencyReciprocal > 0
      ? goal.urgencyReciprocal / totalUrgencyReciprocal
      : equalWeight;
    scores.set(goal.goal_id, {
      score: (weightMagnitude * 0.5) + (weightUrgency * 0.5),
      name: goal.name,
    });
  });

  return scores;
};

const activeOrderIds = (goals) => (
  (Array.isArray(goals) ? goals : [])
    .filter(isActiveForAllocation)
    .map((goal) => Number(goal.goal_id))
);

/**
 * If the user moves a goal above others that deadline+target say need funding more,
 * return a soft warning. Caller may still proceed.
 */
export const buildPriorityReorderWarning = (previousGoals, nextGoals, movedGoalId) => {
  const movedId = Number(movedGoalId);
  if (!Number.isInteger(movedId)) return null;

  const prevOrder = activeOrderIds(previousGoals);
  const nextOrder = activeOrderIds(nextGoals);
  const prevIndex = prevOrder.indexOf(movedId);
  const nextIndex = nextOrder.indexOf(movedId);
  if (prevIndex < 0 || nextIndex < 0 || nextIndex >= prevIndex) {
    // Only advise when the goal actually moves up the folio
    return null;
  }

  const scores = getNaturalFundNeedScores(nextGoals);
  const moved = scores.get(movedId);
  if (!moved) return null;

  const strongerBelow = nextOrder
    .slice(nextIndex + 1)
    .map((id) => ({ id, ...scores.get(id) }))
    .filter((item) => item.score != null && item.score > moved.score + 1e-9)
    .sort((a, b) => b.score - a.score);

  if (strongerBelow.length === 0) return null;

  const rival = strongerBelow[0];
  return {
    title: 'Priority may not match funding need',
    message:
      `Based on target size and deadline, “${rival.name}” still looks like it needs funding more urgently than “${moved.name}”. `
      + `Moving “${moved.name}” higher will boost its share a little, but it may not be the most helpful priority for your plan. `
      + 'You can keep this new order anyway if you prefer.',
    confirmLabel: 'Change priority anyway',
    cancelLabel: 'Keep current order',
  };
};
