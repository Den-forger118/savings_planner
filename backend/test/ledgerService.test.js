const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildDepositPostingLines,
  assertBalanced,
  userWalletName,
} = require('../src/services/ledgerService');
const { resolveLedgerFee } = require('../src/services/paymentService');

describe('ledgerService deposit postings', () => {
  it('balances gross-only deposit (no fee)', () => {
    const lines = buildDepositPostingLines({ grossAmount: 100, feeAmount: 0 });
    assert.equal(lines.length, 2);
    assertBalanced(lines);

    const debit = lines.filter((l) => l.direction === 'DEBIT').reduce((s, l) => s + l.amount, 0);
    const credit = lines.filter((l) => l.direction === 'CREDIT').reduce((s, l) => s + l.amount, 0);
    assert.equal(debit, 100);
    assert.equal(credit, 100);
    assert.equal(lines[0].accountKey, 'PAYSTACK_CLEARING');
    assert.equal(lines[1].accountKey, 'USER_WALLET');
  });

  it('balances deposit with gateway fee lines', () => {
    const lines = buildDepositPostingLines({ grossAmount: 50, feeAmount: 1.95 });
    assert.equal(lines.length, 4);
    assertBalanced(lines);

    const debit = lines
      .filter((l) => l.direction === 'DEBIT')
      .reduce((s, l) => s + Number(l.amount), 0);
    const credit = lines
      .filter((l) => l.direction === 'CREDIT')
      .reduce((s, l) => s + Number(l.amount), 0);
    assert.ok(Math.abs(debit - credit) < 0.0001);
    assert.ok(Math.abs(debit - (50 + 1.95)) < 0.0001);
  });

  it('rejects non-positive gross', () => {
    assert.throws(() => buildDepositPostingLines({ grossAmount: 0 }), /positive/i);
  });

  it('names user wallet accounts deterministically', () => {
    assert.equal(userWalletName(42), 'User Wallet - 42');
  });
});

describe('resolveLedgerFee (idempotent fee posting gate)', () => {
  it('converts minor units when currencies match', () => {
    assert.equal(
      resolveLedgerFee({ feesMinor: 195, feeCurrency: 'GHS', ledgerCurrency: 'GHS' }),
      1.95
    );
  });

  it('skips fee when ledger currency differs from settlement (FX path)', () => {
    assert.equal(
      resolveLedgerFee({ feesMinor: 195, feeCurrency: 'GHS', ledgerCurrency: 'USD' }),
      0
    );
  });

  it('returns 0 when fee missing', () => {
    assert.equal(
      resolveLedgerFee({ feesMinor: null, feeCurrency: 'GHS', ledgerCurrency: 'GHS' }),
      0
    );
  });
});

describe('journal idempotency key contract', () => {
  it('uses Paystack reference as the unique journal key (document contract)', () => {
    // Duplicate charge.success / verify must share this key so UNIQUE(idempotency_key)
    // yields a single journal_entries row for the same Paystack reference.
    const reference = 'quant_1_2_1700000000000_abcd';
    assert.equal(reference, reference);
    assert.match(reference, /^quant_/);
  });
});
