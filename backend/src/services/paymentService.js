const pool = require('../dbcon');
const paymentModel = require('../models/paymentModel');
const transactionModel = require('../models/transactionModel');
const userModel = require('../models/userModel');
const goalModel = require('../models/goalModel');
const reminderModel = require('../models/reminderModel');
const ledgerService = require('./ledgerService');
const { fromMinorUnits } = require('../utils/paystack');
const { sendGoalCompleteCelebration } = require('../utils/mailer');
const { getLocalParts } = require('../utils/localTime');

async function maybeSendCelebration(userId, completedGoal) {
  if (!completedGoal) return;
  try {
    const user = await userModel.getUserById(userId);
    if (!user || user.email_notifications === false || user.is_active === false) {
      return;
    }
    const local = getLocalParts(new Date(), user.timezone || 'UTC');
    const claimed = await reminderModel.recordSend({
      userId: user.user_id,
      kind: 'celebration',
      sendDate: local.dateStr,
      goalId: completedGoal.goal_id,
    });
    if (!claimed) return;
    await sendGoalCompleteCelebration(user, completedGoal.name);
  } catch (err) {
    console.error('[payments] Celebration email failed:', err.message);
  }
}

/**
 * Resolve gateway fee in ledger currency.
 * Only post fee lines when settlement currency matches the payment ledger currency.
 */
function resolveLedgerFee({ feesMinor, feeCurrency, ledgerCurrency }) {
  const fee = fromMinorUnits(feesMinor);
  if (!Number.isFinite(fee) || fee <= 0) {
    return 0;
  }
  const settlement = String(feeCurrency || '').toUpperCase();
  const ledger = String(ledgerCurrency || '').toUpperCase();
  if (settlement && ledger && settlement !== ledger) {
    console.warn(
      `[payments] Skipping fee posting (fee currency ${settlement} ≠ ledger ${ledger})`
    );
    return 0;
  }
  return fee;
}

/**
 * Credit a goal from a successful Paystack charge (idempotent by paystack_ref).
 * Also posts a balanced double-entry journal (Paystack clearing ↔ user wallet ± fees).
 */
async function applySuccessfulPayment({
  reference,
  amountMinor,
  currency,
  metadata = {},
  feesMinor = null,
}) {
  const existing = await paymentModel.getByReference(reference);

  if (existing?.status === 'success') {
    return { alreadyProcessed: true, payment: existing };
  }

  let payment = existing;
  const metaUserId = Number.parseInt(metadata.user_id, 10);
  const metaGoalId = Number.parseInt(metadata.goal_id, 10);
  const amount = fromMinorUnits(amountMinor);

  if (!payment) {
    if (!Number.isFinite(metaUserId) || !Number.isFinite(metaGoalId) || amount <= 0) {
      const error = new Error('Payment reference unknown and metadata incomplete');
      error.statusCode = 400;
      throw error;
    }

    const goal = await goalModel.getGoalById(metaGoalId);
    if (!goal || Number(goal.user_id) !== metaUserId) {
      const error = new Error('Goal not found for payment metadata');
      error.statusCode = 404;
      throw error;
    }

    try {
      payment = await paymentModel.createPendingPayment({
        userId: metaUserId,
        goalId: metaGoalId,
        paystackRef: reference,
        amount,
        currency: currency || 'GHS',
      });
    } catch (err) {
      payment = await paymentModel.getByReference(reference);
      if (payment?.status === 'success') {
        return { alreadyProcessed: true, payment };
      }
      if (!payment) throw err;
    }
  }

  const claimed = await paymentModel.claimForProcessing(reference);
  if (!claimed) {
    const again = await paymentModel.getByReference(reference);
    if (again?.status === 'success') {
      return { alreadyProcessed: true, payment: again };
    }
    if (again?.status === 'processing') {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const finalRow = await paymentModel.getByReference(reference);
      if (finalRow?.status === 'success') {
        return { alreadyProcessed: true, payment: finalRow };
      }
      return { alreadyProcessed: true, payment: finalRow, inFlight: true };
    }
    const error = new Error('Could not claim payment for processing');
    error.statusCode = 409;
    throw error;
  }

  payment = claimed;

  // Pending amount is ledger (display) currency; webhook amount is settlement (e.g. GHS).
  // Only warn when currencies match and values diverge.
  const pendingCurrency = String(payment.currency || '').toUpperCase();
  const webhookCurrency = String(currency || '').toUpperCase();
  if (
    pendingCurrency
    && webhookCurrency
    && pendingCurrency === webhookCurrency
    && Number(payment.amount) !== amount
  ) {
    console.warn(
      `[payments] Amount mismatch for ${reference}: pending=${payment.amount} webhook=${amount}`
    );
  }

  const creditAmount = Number.parseFloat(payment.amount);
  const userId = payment.user_id;
  const goalId = payment.goal_id;
  const feeAmount = resolveLedgerFee({
    feesMinor,
    feeCurrency: currency,
    ledgerCurrency: payment.currency,
  });

  const goal = await goalModel.getGoalById(goalId);
  if (!goal || Number(goal.user_id) !== Number(userId)) {
    await paymentModel.markFailed(reference);
    const error = new Error('Goal not found for this payment');
    error.statusCode = 404;
    throw error;
  }

  if (goal.is_paused) {
    await paymentModel.markFailed(reference);
    const error = new Error('Cannot deposit to a paused goal');
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();
  let transaction;
  let journalEntry;
  try {
    await client.query('BEGIN');

    const journalResult = await ledgerService.postDepositJournal({
      userId,
      grossAmount: creditAmount,
      feeAmount,
      idempotencyKey: reference,
      currency: payment.currency,
      description: `Paystack deposit goal ${goalId}`,
      client,
    });
    journalEntry = journalResult.journalEntry;

    if (journalResult.alreadyProcessed && payment.transaction_id) {
      // Journal + goal credit already done for this reference; avoid double deposit.
      transaction = { transaction_id: payment.transaction_id };
    } else if (journalResult.alreadyProcessed) {
      // Recovery: journal exists but goal row was never linked — credit once.
      ({ transaction } = await transactionModel.recordTransaction(
        userId,
        goalId,
        creditAmount,
        'deposit',
        'Paystack deposit',
        { client }
      ));
    } else {
      ({ transaction } = await transactionModel.recordTransaction(
        userId,
        goalId,
        creditAmount,
        'deposit',
        'Paystack deposit',
        { client }
      ));
    }

    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    await paymentModel.resetToPending(reference);
    throw err;
  } finally {
    client.release();
  }

  const marked = await paymentModel.markSuccess({
    paystackRef: reference,
    transactionId: transaction.transaction_id,
    journalEntryId: journalEntry?.journal_entry_id || null,
  });

  if (!marked) {
    const again = await paymentModel.getByReference(reference);
    return { alreadyProcessed: true, payment: again };
  }

  const completedGoal = await transactionModel.checkAndMarkComplete(goalId);
  void maybeSendCelebration(userId, completedGoal);

  return {
    alreadyProcessed: false,
    payment: marked,
    transaction,
    journalEntry,
    goalCompleted: Boolean(completedGoal),
    completedGoalName: completedGoal?.name || null,
  };
}

module.exports = {
  applySuccessfulPayment,
  resolveLedgerFee,
};
