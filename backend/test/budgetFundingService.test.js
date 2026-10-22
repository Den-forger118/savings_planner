const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { classifyBudgetFunding } = require('../src/services/budgetFundingService');

describe('classifyBudgetFunding', () => {
  it('returns no_budget when target is missing', () => {
    const result = classifyBudgetFunding({ monthlyBudget: null, fundedMtd: 120 });
    assert.equal(result.status, 'no_budget');
    assert.equal(result.funded_mtd, 120);
    assert.equal(result.monthly_budget, null);
  });

  it('marks behind when funded is under budget', () => {
    const result = classifyBudgetFunding({ monthlyBudget: 500, fundedMtd: 200 });
    assert.equal(result.status, 'behind');
    assert.equal(result.remaining, 300);
    assert.equal(result.surplus, 0);
  });

  it('marks on_track when funded meets budget', () => {
    const result = classifyBudgetFunding({ monthlyBudget: 500, fundedMtd: 500 });
    assert.equal(result.status, 'on_track');
    assert.equal(result.remaining, 0);
    assert.equal(result.surplus, 0);
  });

  it('marks ahead when funded exceeds budget', () => {
    const result = classifyBudgetFunding({ monthlyBudget: 500, fundedMtd: 650 });
    assert.equal(result.status, 'ahead');
    assert.equal(result.surplus, 150);
    assert.equal(result.remaining, 0);
  });
});
