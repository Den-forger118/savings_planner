const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildWithdrawPendingLines,
  buildWithdrawSuccessLines,
  buildWithdrawRevertLines,
  assertBalanced,
} = require('../src/services/ledgerService');
const { buildPayoutReference, ALLOWED_RECIPIENT_TYPES } = require('../src/services/payoutService');

describe('withdrawal ledger lines', () => {
  it('balances pending reservation (wallet → pending disbursal)', () => {
    const lines = buildWithdrawPendingLines(40);
    assertBalanced(lines);
    assert.equal(lines.length, 2);
    assert.equal(lines[0].direction, 'DEBIT');
    assert.equal(lines[0].accountKey, 'USER_WALLET');
    assert.equal(lines[1].accountKey, 'PENDING_DISBURSAL');
  });

  it('balances success settlement (pending → clearing)', () => {
    const lines = buildWithdrawSuccessLines(40);
    assertBalanced(lines);
    assert.equal(lines[0].accountKey, 'PENDING_DISBURSAL');
    assert.equal(lines[1].accountKey, 'PAYSTACK_CLEARING');
  });

  it('balances failed revert (pending → wallet)', () => {
    const lines = buildWithdrawRevertLines(40);
    assertBalanced(lines);
    assert.equal(lines[0].accountKey, 'PENDING_DISBURSAL');
    assert.equal(lines[1].accountKey, 'USER_WALLET');
    assert.equal(lines[1].direction, 'CREDIT');
  });
});

describe('payout reference + recipient types', () => {
  it('builds unique-looking payout references', () => {
    const ref = buildPayoutReference(15);
    assert.match(ref, /^quant_payout_15_\d+_[a-f0-9]+$/);
  });

  it('allows MoMo and bank recipient types', () => {
    assert.ok(ALLOWED_RECIPIENT_TYPES.has('mobile_money'));
    assert.ok(ALLOWED_RECIPIENT_TYPES.has('ghipss'));
    assert.ok(ALLOWED_RECIPIENT_TYPES.has('nuban'));
  });
});
