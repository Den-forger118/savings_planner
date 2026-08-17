export const goalStatusRank = (goal) => {
  if (goal?.is_complete) return 2;
  if (goal?.is_paused) return 1;
  return 0;
};

export const toRoman = (value) => {
  let remaining = Number.parseInt(value, 10);
  if (!Number.isFinite(remaining) || remaining < 1) return '';

  const glyphs = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let roman = '';
  for (const [numeric, glyph] of glyphs) {
    while (remaining >= numeric) {
      roman += glyph;
      remaining -= numeric;
    }
  }
  return roman;
};

export const folioIndexInGroup = (goals, goalId) => {
  const match = goals.find((goal) => Number(goal.goal_id) === Number(goalId));
  if (!match) return 0;

  const rank = goalStatusRank(match);
  return goals
    .filter((goal) => goalStatusRank(goal) === rank)
    .findIndex((goal) => Number(goal.goal_id) === Number(goalId)) + 1;
};

export const canMoveGoal = (goals, goalId, direction) => {
  const index = goals.findIndex((goal) => Number(goal.goal_id) === Number(goalId));
  if (index < 0) return false;

  const neighborIndex = index + direction;
  if (neighborIndex < 0 || neighborIndex >= goals.length) return false;

  return goalStatusRank(goals[index]) === goalStatusRank(goals[neighborIndex]);
};

export const moveGoalInGroup = (goals, goalId, direction) => {
  const index = goals.findIndex((goal) => Number(goal.goal_id) === Number(goalId));
  if (index < 0) return goals;

  const neighborIndex = index + direction;
  if (neighborIndex < 0 || neighborIndex >= goals.length) return goals;
  if (goalStatusRank(goals[index]) !== goalStatusRank(goals[neighborIndex])) return goals;

  const next = [...goals];
  const [item] = next.splice(index, 1);
  next.splice(neighborIndex, 0, item);
  return next;
};

export const insertGoalAt = (goals, draggedId, targetId) => {
  const from = goals.findIndex((goal) => Number(goal.goal_id) === Number(draggedId));
  const to = goals.findIndex((goal) => Number(goal.goal_id) === Number(targetId));
  if (from < 0 || to < 0 || from === to) return goals;
  if (goalStatusRank(goals[from]) !== goalStatusRank(goals[to])) return goals;

  const next = [...goals];
  const [item] = next.splice(from, 1);
  const insertAt = from < to ? to - 1 : to;
  next.splice(insertAt, 0, item);
  return next;
};
