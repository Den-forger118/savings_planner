const paymentModel = require('../models/paymentModel');
const transactionModel = require('../models/transactionModel');
const userModel = require('../models/userModel');
const goalModel = require('../models/goalModel');
const reminderModel = require('../models/reminderModel');
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
 * Credit a goal from a successful Paystack charge (idempotent by paystack_ref).
 */
async function applySuccessfulPayment({
  reference,
  amountMinor,
  currency,
  metadata = {},
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

  let transaction;
  try {
    ({ transaction } = await transactionModel.recordTransaction(
      userId,
      goalId,
      creditAmount,
      'deposit',
      'Paystack deposit'
    ));
  } catch (err) {
    await paymentModel.resetToPending(reference);
    throw err;
  }

  const marked = await paymentModel.markSuccess({
    paystackRef: reference,
    transactionId: transaction.transaction_id,
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
    goalCompleted: Boolean(completedGoal),
    completedGoalName: completedGoal?.name || null,
  };
}

module.exports = {
  applySuccessfulPayment,
};
