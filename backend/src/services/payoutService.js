const crypto = require('crypto');
const pool = require('../dbcon');
const payoutModel = require('../models/payoutModel');
const userModel = require('../models/userModel');
const ledgerService = require('./ledgerService');
const {
  isPaystackConfigured,
  getPaystackCurrency,
  createTransferRecipient,
  initiateTransfer,
  listBanks,
} = require('../utils/paystack');

const ALLOWED_RECIPIENT_TYPES = new Set(['mobile_money', 'ghipss', 'nuban']);

function buildPayoutReference(userId) {
  const suffix = crypto.randomBytes(4).toString('hex');
  return `quant_payout_${userId}_${Date.now()}_${suffix}`;
}

async function getPayoutDestinations(currency = null) {
  const cur = (currency || getPaystackCurrency()).toUpperCase();
  const destinations = { currency: cur, mobile_money: [], banks: [] };

  if (!isPaystackConfigured()) {
    return destinations;
  }

  try {
    const momo = await listBanks({ currency: cur, type: 'mobile_money' });
    destinations.mobile_money = Array.isArray(momo) ? momo : [];
  } catch (err) {
    console.warn('[payout] list MoMo banks failed:', err.message);
  }

  try {
    const banks = await listBanks({ currency: cur, type: cur === 'GHS' ? 'ghipss' : undefined });
    destinations.banks = Array.isArray(banks) ? banks : [];
  } catch (err) {
    console.warn('[payout] list banks failed:', err.message);
  }

  return destinations;
}

/**
 * Debit wallet and send funds via Paystack Transfer.
 * Body fields: amount, type (mobile_money|ghipss|nuban), accountNumber, bankCode, name?
 */
async function requestWalletWithdrawal(userId, {
  amount,
  type = 'mobile_money',
  accountNumber,
  bankCode,
  name,
}) {
  if (!isPaystackConfigured()) {
    const error = new Error('Paystack is not configured');
    error.statusCode = 503;
    throw error;
  }

  const recipientType = String(type || 'mobile_money').toLowerCase();
  if (!ALLOWED_RECIPIENT_TYPES.has(recipientType)) {
    const error = new Error('Unsupported payout type. Use mobile_money, ghipss, or nuban.');
    error.statusCode = 400;
    throw error;
  }

  const parsedAmount = Number.parseFloat(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount < 1) {
    const error = new Error('Withdrawal amount must be at least 1.00');
    error.statusCode = 400;
    throw error;
  }

  const account = String(accountNumber || '').replace(/\s+/g, '').trim();
  const code = String(bankCode || '').trim();
  if (!account || !code) {
    const error = new Error('accountNumber and bankCode are required');
    error.statusCode = 400;
    throw error;
  }

  const user = await userModel.getUserById(userId);
  if (!user || user.is_active === false) {
    const error = new Error('Account not available for withdrawals');
    error.statusCode = 403;
    throw error;
  }

  const currency = getPaystackCurrency();
  const recipientName = String(name || `${user.first_name} ${user.last_name}`).trim()
    || 'QUANT member';

  let recipient;
  try {
    recipient = await createTransferRecipient({
      type: recipientType,
      name: recipientName,
      accountNumber: account,
      bankCode: code,
      currency,
      metadata: { user_id: String(userId), platform: 'QUANT' },
    });
  } catch (err) {
    const error = new Error(err.message || 'Could not create Paystack transfer recipient');
    error.statusCode = err.statusCode || 502;
    error.paystack = err.paystack;
    throw error;
  }

  const recipientCode = recipient.recipient_code;
  if (!recipientCode) {
    const error = new Error('Paystack did not return a recipient_code');
    error.statusCode = 502;
    throw error;
  }

  const paystackRef = buildPayoutReference(userId);
  const payout = await payoutModel.createPayout({
    userId,
    amount: parsedAmount,
    currency,
    paystackRef,
    recipientCode,
    recipientType,
    accountNumber: account,
    bankCode: code,
    accountName: recipient.details?.account_name || recipientName,
  });

  const client = await pool.connect();
  let journalEntry;
  let walletBalance;
  try {
    await client.query('BEGIN');

    const locked = await client.query(
      `
        SELECT user_id, wallet_balance
        FROM users
        WHERE user_id = $1
        FOR UPDATE
      `,
      [userId]
    );
    if (locked.rows.length === 0) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    const balance = Number.parseFloat(locked.rows[0].wallet_balance);
    if (parsedAmount > balance + 0.00001) {
      throw Object.assign(
        new Error(`Withdrawal exceeds wallet balance (${balance.toFixed(2)}).`),
        { statusCode: 400 }
      );
    }

    const balUpdate = await client.query(
      `
        UPDATE users
        SET wallet_balance = wallet_balance - $2
        WHERE user_id = $1
        RETURNING wallet_balance
      `,
      [userId, parsedAmount]
    );
    walletBalance = Number.parseFloat(balUpdate.rows[0].wallet_balance);

    const journalResult = await ledgerService.postWithdrawPendingJournal({
      userId,
      amount: parsedAmount,
      idempotencyKey: `${paystackRef}:pending`,
      currency,
      description: `Wallet withdrawal pending ${paystackRef}`,
      client,
    });
    journalEntry = journalResult.journalEntry;

    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    await payoutModel.markFailed({
      paystackRef,
      failureReason: err.message || 'Failed before transfer initiate',
    });
    throw err;
  } finally {
    client.release();
  }

  await payoutModel.markProcessing({
    paystackRef,
    journalEntryId: journalEntry?.journal_entry_id || null,
  });

  let transfer;
  try {
    transfer = await initiateTransfer({
      amount: parsedAmount,
      recipientCode,
      reference: paystackRef,
      reason: 'QUANT wallet withdrawal',
      currency,
    });
  } catch (err) {
    // Transfer never left Paystack — revert wallet + ledger.
    await finalizeFailedPayout({
      reference: paystackRef,
      reason: err.message || 'Paystack transfer initiate failed',
    });
    const error = new Error(err.message || 'Paystack transfer failed to start');
    error.statusCode = err.statusCode || 502;
    error.paystack = err.paystack;
    throw error;
  }

  const transferCode = transfer.transfer_code || transfer.code || null;
  await payoutModel.markProcessing({
    paystackRef,
    transferCode,
    journalEntryId: journalEntry?.journal_entry_id || null,
  });

  // Some test transfers settle immediately as success
  const status = String(transfer.status || '').toLowerCase();
  if (status === 'success' || status === 'otp') {
    if (status === 'success') {
      await finalizeSuccessfulPayout({
        reference: paystackRef,
        transferCode,
      });
    }
  }

  const updated = await payoutModel.getByReference(paystackRef);
  return {
    payout: updated,
    walletBalance,
    transfer,
  };
}

async function finalizeSuccessfulPayout({ reference, transferCode = null }) {
  const payout = await payoutModel.getByReference(reference);
  if (!payout) {
    const error = new Error('Payout not found');
    error.statusCode = 404;
    throw error;
  }
  if (payout.status === 'success') {
    return { alreadyProcessed: true, payout };
  }
  if (payout.status === 'failed') {
    const error = new Error('Payout already marked failed');
    error.statusCode = 409;
    throw error;
  }

  const client = await pool.connect();
  let finalizeJournal;
  try {
    await client.query('BEGIN');
    const journalResult = await ledgerService.postWithdrawSuccessJournal({
      userId: payout.user_id,
      amount: payout.amount,
      idempotencyKey: `${reference}:success`,
      currency: payout.currency,
      description: `Wallet withdrawal settled ${reference}`,
      client,
    });
    finalizeJournal = journalResult.journalEntry;
    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }

  const marked = await payoutModel.markSuccess({
    paystackRef: reference,
    transferCode,
    finalizeJournalEntryId: finalizeJournal?.journal_entry_id || null,
  });

  return { alreadyProcessed: false, payout: marked };
}

async function finalizeFailedPayout({ reference, reason = null }) {
  const payout = await payoutModel.getByReference(reference);
  if (!payout) {
    const error = new Error('Payout not found');
    error.statusCode = 404;
    throw error;
  }
  if (payout.status === 'failed') {
    return { alreadyProcessed: true, payout };
  }
  if (payout.status === 'success') {
    const error = new Error('Payout already marked success');
    error.statusCode = 409;
    throw error;
  }

  const client = await pool.connect();
  let finalizeJournal;
  let walletBalance;
  try {
    await client.query('BEGIN');

    await client.query(
      `
        SELECT user_id, wallet_balance
        FROM users
        WHERE user_id = $1
        FOR UPDATE
      `,
      [payout.user_id]
    );

    // Only restore wallet if we had reserved funds (pending/processing with pending journal).
    const bal = await client.query(
      `
        UPDATE users
        SET wallet_balance = wallet_balance + $2
        WHERE user_id = $1
        RETURNING wallet_balance
      `,
      [payout.user_id, payout.amount]
    );
    walletBalance = Number.parseFloat(bal.rows[0].wallet_balance);

    const journalResult = await ledgerService.postWithdrawRevertJournal({
      userId: payout.user_id,
      amount: payout.amount,
      idempotencyKey: `${reference}:revert`,
      currency: payout.currency,
      description: `Wallet withdrawal reverted ${reference}`,
      client,
    });
    finalizeJournal = journalResult.journalEntry;

    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }

  const marked = await payoutModel.markFailed({
    paystackRef: reference,
    failureReason: reason,
    finalizeJournalEntryId: finalizeJournal?.journal_entry_id || null,
  });

  return { alreadyProcessed: false, payout: marked, walletBalance };
}

/**
 * Handle transfer.success / transfer.failed / transfer.reversed webhook payloads.
 */
async function handleTransferWebhookEvent(eventName, data = {}) {
  const reference = data.reference || data.transfer_code || null;
  if (!reference) {
    console.warn('[payout] Transfer webhook missing reference');
    return { ignored: true };
  }

  // Prefer our quant_payout_* reference; fall back to lookup by transfer_code.
  let payout = await payoutModel.getByReference(reference);
  if (!payout && data.transfer_code) {
    const byCode = await pool.query(
      `SELECT * FROM payouts WHERE transfer_code = $1 LIMIT 1`,
      [data.transfer_code]
    );
    payout = byCode.rows[0] || null;
  }
  if (!payout && data.reference) {
    payout = await payoutModel.getByReference(data.reference);
  }

  if (!payout) {
    console.warn(`[payout] No local payout for transfer reference ${reference}`);
    return { ignored: true };
  }

  const name = String(eventName || '').toLowerCase();
  if (name === 'transfer.success') {
    return finalizeSuccessfulPayout({
      reference: payout.paystack_ref,
      transferCode: data.transfer_code || null,
    });
  }

  if (name === 'transfer.failed' || name === 'transfer.reversed') {
    return finalizeFailedPayout({
      reference: payout.paystack_ref,
      reason: data.reason || data.failures?.message || name,
    });
  }

  return { ignored: true };
}

module.exports = {
  getPayoutDestinations,
  requestWalletWithdrawal,
  finalizeSuccessfulPayout,
  finalizeFailedPayout,
  handleTransferWebhookEvent,
  buildPayoutReference,
  ALLOWED_RECIPIENT_TYPES,
};
