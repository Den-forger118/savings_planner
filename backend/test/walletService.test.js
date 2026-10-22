const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isGoalDepositCharge,
  extractDvaIdentifiers,
  normalizePhone,
} = require('../src/services/walletService');
const { buildDepositPostingLines, assertBalanced } = require('../src/services/ledgerService');

describe('isGoalDepositCharge routing', () => {
  it('routes Option 1 metadata to goal path', () => {
    assert.equal(
      isGoalDepositCharge({
        reference: 'pay_abc',
        metadata: { goal_id: '61', transaction_type: 'goal_deposit' },
      }),
      true
    );
  });

  it('routes quant_* references to goal path', () => {
    assert.equal(
      isGoalDepositCharge({ reference: 'quant_14_61_1792545893839_68ef3cd9', metadata: {} }),
      true
    );
  });

  it('routes unknown DVA-style charges to wallet path', () => {
    assert.equal(
      isGoalDepositCharge({
        reference: 'T123456789',
        metadata: {},
        customer: { customer_code: 'CUS_x' },
      }),
      false
    );
  });

  it('respects local payment kind over metadata', () => {
    assert.equal(
      isGoalDepositCharge(
        { reference: 'T1', metadata: { goal_id: '1' } },
        { kind: 'wallet_deposit' }
      ),
      false
    );
    assert.equal(
      isGoalDepositCharge(
        { reference: 'T2', metadata: {} },
        { kind: 'goal_deposit' }
      ),
      true
    );
  });
});

describe('extractDvaIdentifiers', () => {
  it('reads customer code and receiver account', () => {
    const ids = extractDvaIdentifiers({
      customer: { customer_code: 'CUS_abc' },
      authorization: { receiver_bank_account_number: '1234567890' },
    });
    assert.equal(ids.customerCode, 'CUS_abc');
    assert.equal(ids.accountNumber, '1234567890');
  });
});

describe('normalizePhone', () => {
  it('strips non-digits except leading +', () => {
    assert.equal(normalizePhone('+233 24-123-4567'), '+233241234567');
  });
});

describe('wallet credit ledger lines', () => {
  it('balances the same way as Option 1 deposits', () => {
    const lines = buildDepositPostingLines({ grossAmount: 200, feeAmount: 3.5 });
    assertBalanced(lines);
    assert.equal(lines.length, 4);
  });
});
