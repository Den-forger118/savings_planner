const test = require('node:test');
const assert = require('node:assert/strict');
const { sortGoalsDisplayOrder, goalStatusRank } = require('../src/utils/goalOrder');
const { calculateAutoAllocations } = require('../src/models/calculationModel');

test('display order is status group, then manual priority, then goal_id', () => {
  const goals = [
    { goal_id: 4, name: 'Newest active', is_complete: false, is_paused: false, priority: 3 },
    { goal_id: 1, name: 'First active', is_complete: false, is_paused: false, priority: 1 },
    { goal_id: 9, name: 'Complete', is_complete: true, is_paused: false, priority: 1 },
    { goal_id: 2, name: 'Second active', is_complete: false, is_paused: false, priority: 2 },
    { goal_id: 6, name: 'Hold B', is_complete: false, is_paused: true, priority: 2 },
    { goal_id: 5, name: 'Hold A', is_complete: false, is_paused: true, priority: 1 },
  ];

  const ordered = sortGoalsDisplayOrder([...goals]).map((goal) => goal.goal_id);
  assert.deepEqual(ordered, [1, 2, 4, 5, 6, 9]);
});

test('priority ties break on goal_id ascending, not created_at', () => {
  const goals = [
    { goal_id: 30, is_complete: false, is_paused: false, priority: 1, created_at: '2026-08-01' },
    { goal_id: 10, is_complete: false, is_paused: false, priority: 1, created_at: '2026-08-17' },
  ];

  const ordered = sortGoalsDisplayOrder([...goals]).map((goal) => goal.goal_id);
  assert.deepEqual(ordered, [10, 30]);
});

test('goalStatusRank treats complete above paused even if both flags were set', () => {
  assert.equal(goalStatusRank({ is_complete: true, is_paused: true }), 2);
  assert.equal(goalStatusRank({ is_complete: false, is_paused: true }), 1);
  assert.equal(goalStatusRank({ is_complete: false, is_paused: false }), 0);
});

test('manual priority does not change earner allocation shares', () => {
  const referenceDate = new Date('2025-04-30T00:00:00.000Z');
  const base = [
    {
      goal_id: 1,
      user_id: 10,
      name: 'Goal A',
      target_amount: 5000,
      saved_amount: 0,
      deadline: '2025-12-31',
      created_at: '2025-01-01T00:00:00.000Z',
      priority: 1,
    },
    {
      goal_id: 2,
      user_id: 10,
      name: 'Goal B',
      target_amount: 10000,
      saved_amount: 0,
      deadline: '2025-06-30',
      created_at: '2025-01-01T00:00:00.000Z',
      priority: 2,
    },
  ];

  const flipped = [
    { ...base[0], priority: 99 },
    { ...base[1], priority: 1 },
  ];

  const original = calculateAutoAllocations(base, 500, referenceDate)
    .sort((a, b) => a.goal_id - b.goal_id);
  const afterIntent = calculateAutoAllocations(flipped, 500, referenceDate)
    .sort((a, b) => a.goal_id - b.goal_id);

  assert.equal(original[0].allocated_monthly_amount, 133.17);
  assert.equal(original[1].allocated_monthly_amount, 366.83);
  assert.equal(afterIntent[0].allocated_monthly_amount, original[0].allocated_monthly_amount);
  assert.equal(afterIntent[1].allocated_monthly_amount, original[1].allocated_monthly_amount);
});
