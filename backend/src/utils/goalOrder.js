const goalStatusRank = (goal) => {
  if (goal.is_complete) return 2;
  if (goal.is_paused) return 1;
  return 0;
};

const numericPriority = (goal) => {
  const value = Number.parseInt(goal.priority, 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
};

const compareGoalsDisplayOrder = (a, b) => {
  const rankDiff = goalStatusRank(a) - goalStatusRank(b);
  if (rankDiff !== 0) return rankDiff;

  const priorityDiff = numericPriority(a) - numericPriority(b);
  if (priorityDiff !== 0) return priorityDiff;

  return Number(a.goal_id) - Number(b.goal_id);
};

const sortGoalsDisplayOrder = (goals) => goals.sort(compareGoalsDisplayOrder);

const DISPLAY_ORDER_SQL = `
  CASE
    WHEN is_complete THEN 2
    WHEN is_paused THEN 1
    ELSE 0
  END ASC,
  priority ASC,
  goal_id ASC
`;

module.exports = {
  goalStatusRank,
  compareGoalsDisplayOrder,
  sortGoalsDisplayOrder,
  DISPLAY_ORDER_SQL,
};
