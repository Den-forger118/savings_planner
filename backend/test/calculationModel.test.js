const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateAutoAllocations,
  getGoalBreakdown,
} = require('../src/models/calculationModel');

const referenceDate = new Date('2025-04-30T00:00:00.000Z');

test('automatic allocation follows the weighted budget distribution example', () => {
  const goals = [
    {
      goal_id: 1,
      user_id: 10,
      name: 'Goal A',
      target_amount: 5000,
      saved_amount: 0,
      deadline: '2025-12-31',
      created_at: '2025-01-01T00:00:00.000Z',
    },
    {
      goal_id: 2,
      user_id: 10,
      name: 'Goal B',
      target_amount: 10000,
      saved_amount: 0,
      deadline: '2025-06-30',
      created_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  const allocations = calculateAutoAllocations(goals, 500, referenceDate)
    .sort((a, b) => a.goal_id - b.goal_id);

  assert.equal(allocations[0].days_remaining, 245);
  assert.equal(allocations[1].days_remaining, 61);
  assert.equal(allocations[0].allocated_monthly_amount, 133.17);
  assert.equal(allocations[1].allocated_monthly_amount, 366.83);
  assert.equal(
    Number((allocations[0].allocated_monthly_amount + allocations[1].allocated_monthly_amount).toFixed(2)),
    500
  );
});

test('allocated totals always sum to the monthly budget after rounding', () => {
  const goals = [
    {
      goal_id: 1,
      user_id: 22,
      name: 'Emergency Fund',
      target_amount: 0,
      saved_amount: 0,
      deadline: '2025-10-01',
      created_at: '2025-04-01T00:00:00.000Z',
    },
    {
      goal_id: 2,
      user_id: 22,
      name: 'Vacation',
      target_amount: 7000,
      saved_amount: 500,
      deadline: '2025-07-15',
      created_at: '2025-04-01T00:00:00.000Z',
    },
    {
      goal_id: 3,
      user_id: 22,
      name: 'Laptop',
      target_amount: 2000,
      saved_amount: 250,
      deadline: '2025-08-20',
      created_at: '2025-04-01T00:00:00.000Z',
    },
  ];

  const allocations = calculateAutoAllocations(goals, 500, referenceDate);
  const total = Number(
    allocations.reduce((sum, goal) => sum + goal.allocated_monthly_amount, 0).toFixed(2)
  );

  assert.equal(total, 500);
});

test('goal breakdown uses allocated monthly amount for feasibility', () => {
  const goal = {
    goal_id: 3,
    user_id: 7,
    name: 'Laptop',
    target_amount: 1200,
    saved_amount: 200,
    deadline: '2025-06-29',
    created_at: '2025-04-01T00:00:00.000Z',
  };

  const breakdown = getGoalBreakdown(goal, 300, referenceDate);

  assert.equal(breakdown.allocated_monthly_amount, 300);
  assert.equal(breakdown.savings_needed.monthly, 507.33);
  assert.equal(breakdown.is_feasible, false);
});

test('paused goals are excluded from automatic allocation', () => {
  const goals = [
    {
      goal_id: 1,
      user_id: 10,
      name: 'Active Goal',
      target_amount: 5000,
      saved_amount: 0,
      deadline: '2025-12-31',
      created_at: '2025-01-01T00:00:00.000Z',
      is_paused: false,
    },
    {
      goal_id: 2,
      user_id: 10,
      name: 'Paused Goal',
      target_amount: 10000,
      saved_amount: 0,
      deadline: '2025-12-31',
      created_at: '2025-01-01T00:00:00.000Z',
      is_paused: true,
    },
  ];

  const allocations = calculateAutoAllocations(goals, 500, referenceDate)
    .sort((a, b) => a.goal_id - b.goal_id);

  assert.equal(allocations[0].allocated_monthly_amount, 500);
  assert.equal(allocations[1].allocated_monthly_amount, 0);
});

test('yearly savings is zero for goals shorter than one year', () => {
  const goal = {
    goal_id: 4,
    user_id: 7,
    name: 'Short Trip',
    target_amount: 1200,
    saved_amount: 0,
    deadline: '2025-08-01',
    created_at: '2025-04-01T00:00:00.000Z',
  };

  const breakdown = getGoalBreakdown(goal, 0, referenceDate);

  assert.equal(breakdown.savings_needed.annual, 0);
  assert.ok(breakdown.savings_needed.monthly > 0);
  assert.ok(breakdown.savings_needed.weekly > 0);
  assert.ok(breakdown.savings_needed.daily > 0);
});

test('yearly savings is calculated for goals spanning at least one year', () => {
  const goal = {
    goal_id: 5,
    user_id: 7,
    name: 'House Deposit',
    target_amount: 12000,
    saved_amount: 0,
    deadline: '2026-06-01',
    created_at: '2025-04-01T00:00:00.000Z',
  };

  const breakdown = getGoalBreakdown(goal, 0, referenceDate);

  assert.ok(breakdown.savings_needed.annual > 0);
});

test('paused goals report zero payment frequencies', () => {
  const goal = {
    goal_id: 6,
    user_id: 7,
    name: 'Paused Laptop',
    target_amount: 2000,
    saved_amount: 200,
    deadline: '2026-06-01',
    created_at: '2025-04-01T00:00:00.000Z',
    is_paused: true,
  };

  const breakdown = getGoalBreakdown(goal, 0, referenceDate);

  assert.equal(breakdown.savings_needed.annual, 0);
  assert.equal(breakdown.savings_needed.monthly, 0);
  assert.equal(breakdown.savings_needed.weekly, 0);
  assert.equal(breakdown.savings_needed.daily, 0);
});
