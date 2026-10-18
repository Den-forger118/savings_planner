const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { toMinorUnits, fromMinorUnits } = require('../src/utils/paystack');

describe('paystack amount helpers', () => {
  it('converts major units to pesewas/kobo', () => {
    assert.equal(toMinorUnits(10), 1000);
    assert.equal(toMinorUnits(24.49), 2449);
  });

  it('converts minor units back to major', () => {
    assert.equal(fromMinorUnits(1000), 10);
    assert.equal(fromMinorUnits(2449), 24.49);
  });
});
