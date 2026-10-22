const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { planWalletAllocations } = require('../src/services/walletService');

describe('planWalletAllocations', () => {
  const goals = [
    {
      goal_id: 2,
      name: 'Emergency',
      target_amount: 100,
      saved_amount: 40,
      priority: 2,
    },
    {
      goal_id: 1,
      name: 'Phone',
      target_amount: 50,
      saved_amount: 10,
      priority: 1,
    },
    {
      goal_id: 3,
      name: 'Paused Trip',
      target_amount: 200,
      saved_amount: 0,
      priority: 1,
      is_paused: true,
    },
  ];

  it('fills highest priority goals first (waterfall)', () => {
    const plan = planWalletAllocations(goals, 70);
    assert.deepEqual(plan, [
      { goalId: 1, goalName: 'Phone', amount: 40 },
      { goalId: 2, goalName: 'Emergency', amount: 30 },
    ]);
  });

  it('skips paused and complete goals', () => {
    const plan = planWalletAllocations(goals, 1000);
    assert.equal(plan.some((row) => row.goalId === 3), false);
    assert.equal(plan.reduce((sum, row) => sum + row.amount, 0), 100);
  });

  it('returns empty when wallet is empty', () => {
    assert.deepEqual(planWalletAllocations(goals, 0), []);
  });
});
