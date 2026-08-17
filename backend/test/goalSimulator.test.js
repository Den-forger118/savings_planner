const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const loadMath = () =>
  import(pathToFileURL(path.join(__dirname, '../../frontend/src/utils/goalSimulator.js')).href);

test('remaining amount never goes negative', async () => {
  const { remainingAmount } = await loadMath();
  assert.equal(remainingAmount(1000, 250), 750);
  assert.equal(remainingAmount(1000, 1000), 0);
  assert.equal(remainingAmount(1000, 1400), 0);
});

test('deadline mode returns cadence from remaining time', async () => {
  const { simulate } = await loadMath();
  const result = simulate({
    targetAmount: 1200,
    savedAmount: 0,
    mode: 'deadline',
    deadline: '2026-09-16',
    asOf: '2026-08-17',
  });

  assert.equal(result.ok, true);
  assert.equal(result.days, 30);
  assert.equal(result.cadence.daily, 40);
  assert.equal(result.cadence.yearly, 0);
});

test('contribution mode solves for a finish date', async () => {
  const { simulate } = await loadMath();
  const result = simulate({
    targetAmount: 300,
    savedAmount: 0,
    mode: 'contribution',
    contributionAmount: 10,
    contributionFrequency: 'daily',
    asOf: '2026-08-17',
  });

  assert.equal(result.ok, true);
  assert.equal(result.days, 30);
  assert.equal(result.finishDate, '2026-09-16');
});

test('horizon mode uses month length 30.44', async () => {
  const { simulate } = await loadMath();
  const result = simulate({
    targetAmount: 3044,
    savedAmount: 0,
    mode: 'horizon',
    horizonMonths: 12,
    asOf: '2026-01-01',
  });

  assert.equal(result.ok, true);
  assert.equal(result.days, 366);
  assert.ok(result.cadence.monthly > 0);
  assert.ok(result.cadence.yearly > 0);
});

test('past deadline is rejected rather than clamped', async () => {
  const { simulate } = await loadMath();
  const result = simulate({
    targetAmount: 500,
    mode: 'deadline',
    deadline: '2026-08-01',
    asOf: '2026-08-17',
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /today or later/i);
});

test('simulator never accepts a budget or allocation field', async () => {
  const { simulate } = await loadMath();
  const result = simulate({
    targetAmount: 1000,
    mode: 'horizon',
    horizonMonths: 6,
    allocationBudget: 99999,
    monthly_budget: 1,
    asOf: '2026-08-17',
  });

  assert.equal(result.ok, true);
  assert.equal(result.score, undefined);
  assert.equal(result.allocated_monthly_amount, undefined);
});
