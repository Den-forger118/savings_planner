const express = require('express');
const crypto = require('crypto');
const paymentModel = require('../models/paymentModel');
const userModel = require('../models/userModel');
const goalModel = require('../models/goalModel');
const { applySuccessfulPayment } = require('../services/paymentService');
const {
  applyWalletCredit,
  isGoalDepositCharge,
  extractDvaIdentifiers,
} = require('../services/walletService');
const { handleTransferWebhookEvent } = require('../services/payoutService');
const {
  isPaystackConfigured,
  getPaystackPublicKey,
  getPaystackCurrency,
  getPaystackLedgerCurrencies,
  isPaystackLedgerCurrency,
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
} = require('../utils/paystack');
const { convertAmount } = require('../utils/fxConvert');

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/$/, '');

const router = express.Router();

function buildReference(userId, goalId) {
  const suffix = crypto.randomBytes(4).toString('hex');
  return `quant_${userId}_${goalId}_${Date.now()}_${suffix}`;
}

/**
 * Resolve what Paystack should charge vs what QUANT credits on the goal.
 * GH businesses settle in GHS: USD/EUR/GBP amounts are converted for the charge only.
 */
async function resolvePaystackCharge(ledgerAmount, ledgerCurrency) {
  const settlement = getPaystackCurrency();
  const from = String(ledgerCurrency || settlement).toUpperCase();
  const amount = Number(Number.parseFloat(ledgerAmount).toFixed(2));

  if (from === settlement) {
    return {
      ledgerAmount: amount,
      ledgerCurrency: from,
      chargeAmount: amount,
      chargeCurrency: settlement,
      fxRate: 1,
      fxSource: 'identity',
    };
  }

  const converted = await convertAmount(amount, from, settlement);
  const chargeAmount = converted.result;
  if (!Number.isFinite(chargeAmount) || chargeAmount < 1) {
    const error = new Error(
      `Converted charge is too small (${settlement} ${chargeAmount}). Try a larger amount.`
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    ledgerAmount: amount,
    ledgerCurrency: from,
    chargeAmount,
    chargeCurrency: settlement,
    fxRate: converted.rate,
    fxSource: converted.source,
  };
}

/** Public config for the frontend (no secret). */
router.get('/config', (req, res) => {
  const supportedCurrencies = getPaystackLedgerCurrencies();
  res.json({
    enabled: isPaystackConfigured(),
    publicKey: isPaystackConfigured() ? getPaystackPublicKey() : null,
    currency: getPaystackCurrency(),
    settlementCurrency: getPaystackCurrency(),
    supportedCurrencies,
  });
});

/**
 * Start a Paystack checkout for a specific goal deposit.
 * Body: { goalId, amount }
 */
router.post('/initialize', async (req, res) => {
  try {
    if (!isPaystackConfigured()) {
      return res.status(503).json({
        error: 'Paystack is not configured yet. Add PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY.',
        code: 'PAYSTACK_NOT_CONFIGURED',
      });
    }

    const userId = req.user.userId;
    const goalId = Number.parseInt(req.body?.goalId, 10);
    const amount = Number.parseFloat(req.body?.amount);

    if (!Number.isFinite(goalId) || goalId < 1) {
      return res.status(400).json({ error: 'A valid goalId is required' });
    }

    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({ error: 'Amount must be at least 1.00' });
    }

    const user = await userModel.getUserById(userId);
    if (!user || user.is_active === false) {
      return res.status(403).json({ error: 'Account not available for payments' });
    }

    const userCurrency = String(user.currency || 'USD').toUpperCase();
    if (!isPaystackLedgerCurrency(userCurrency)) {
      return res.status(400).json({
        error: `Paystack deposits support ${getPaystackLedgerCurrencies().join(', ')}. Switch display currency in Settings.`,
        code: 'CURRENCY_UNSUPPORTED',
        supported_currencies: getPaystackLedgerCurrencies(),
        user_currency: userCurrency,
      });
    }

    let chargePlan;
    try {
      chargePlan = await resolvePaystackCharge(amount, userCurrency);
    } catch (fxErr) {
      console.error('[payments] FX convert failed:', fxErr.message);
      return res.status(502).json({
        error: `Could not convert ${userCurrency} to ${getPaystackCurrency()} for checkout. Try again shortly.`,
        code: 'FX_FAILED',
      });
    }

    const goal = await goalModel.getGoalById(goalId);
    if (!goal || Number(goal.user_id) !== Number(userId) || goal.deleted_at) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (goal.is_paused) {
      return res.status(400).json({ error: 'Cannot deposit to a paused goal' });
    }

    if (goal.is_complete) {
      return res.status(400).json({ error: 'This goal is already fully funded' });
    }

    const reference = buildReference(userId, goalId);
    const callbackUrl = `${FRONTEND_URL}/payments/callback`;

    // Ledger credits display-currency amount; Paystack charges settlement currency.
    await paymentModel.createPendingPayment({
      userId,
      goalId,
      paystackRef: reference,
      amount: chargePlan.ledgerAmount,
      currency: chargePlan.ledgerCurrency,
    });

    const data = await initializeTransaction({
      email: user.email,
      amount: chargePlan.chargeAmount,
      currency: chargePlan.chargeCurrency,
      reference,
      callbackUrl,
      metadata: {
        user_id: String(userId),
        goal_id: String(goalId),
        goal_name: goal.name,
        transaction_type: 'goal_deposit',
        ledger_amount: String(chargePlan.ledgerAmount),
        ledger_currency: chargePlan.ledgerCurrency,
        charge_amount: String(chargePlan.chargeAmount),
        charge_currency: chargePlan.chargeCurrency,
        fx_rate: String(chargePlan.fxRate),
        custom_fields: [
          {
            display_name: 'Goal',
            variable_name: 'goal_name',
            value: goal.name,
          },
        ],
      },
    });

    return res.status(201).json({
      message: 'Payment initialized',
      reference,
      authorization_url: data.authorization_url,
      access_code: data.access_code,
      publicKey: getPaystackPublicKey(),
      amount: chargePlan.ledgerAmount,
      currency: chargePlan.ledgerCurrency,
      charge_amount: chargePlan.chargeAmount,
      charge_currency: chargePlan.chargeCurrency,
      fx_rate: chargePlan.fxRate,
    });
  } catch (err) {
    console.error('[payments] Initialize failed:', err.message);
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
});

/**
 * Confirm a payment after redirect (also safe if webhook already ran).
 */
router.get('/verify/:reference', async (req, res) => {
  try {
    if (!isPaystackConfigured()) {
      return res.status(503).json({ error: 'Paystack is not configured' });
    }

    const { reference } = req.params;
    const userId = req.user.userId;
    const local = await paymentModel.getByReference(reference);

    if (!local || Number(local.user_id) !== Number(userId)) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (local.status === 'success') {
      const goal = await goalModel.getGoalById(local.goal_id);
      return res.json({
        status: 'success',
        payment: local,
        goal_id: local.goal_id,
        goal_name: goal?.name || null,
        amount: local.amount,
        currency: local.currency,
      });
    }

    const verified = await verifyTransaction(reference);

    if (verified.status !== 'success') {
      if (verified.status === 'failed' || verified.status === 'abandoned') {
        await paymentModel.markFailed(reference);
      }
      return res.json({
        status: verified.status || 'pending',
        payment: await paymentModel.getByReference(reference),
      });
    }

    const result = await applySuccessfulPayment({
      reference,
      amountMinor: verified.amount,
      currency: verified.currency,
      metadata: verified.metadata || {},
      feesMinor: verified.fees ?? verified.fee ?? null,
    });

    const goal = await goalModel.getGoalById(result.payment.goal_id);

    return res.json({
      status: 'success',
      already_processed: result.alreadyProcessed,
      payment: result.payment,
      goal_id: result.payment.goal_id,
      goal_name: goal?.name || null,
      amount: result.payment.amount,
      currency: result.payment.currency,
      goal_completed: result.goalCompleted || false,
      completed_goal_name: result.completedGoalName || null,
    });
  } catch (err) {
    console.error('[payments] Verify failed:', err.message);
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
});

/**
 * Webhook must receive the raw body for signature verification.
 * Mounted separately in index.js before express.json().
 */
async function handlePaystackWebhook(req, res) {
  try {
    const signature = req.get('x-paystack-signature');
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn('[payments] Invalid Paystack webhook signature');
      return res.status(401).send('Invalid signature');
    }

    const event = JSON.parse(rawBody.toString('utf8'));

    if (event.event === 'charge.success') {
      const data = event.data || {};
      try {
        const local = data.reference
          ? await paymentModel.getByReference(data.reference)
          : null;

        if (isGoalDepositCharge(data, local)) {
          await applySuccessfulPayment({
            reference: data.reference,
            amountMinor: data.amount,
            currency: data.currency,
            metadata: data.metadata || {},
            feesMinor: data.fees ?? data.fee ?? null,
          });
        } else {
          const { customerCode, accountNumber } = extractDvaIdentifiers(data);
          await applyWalletCredit({
            reference: data.reference,
            amountMinor: data.amount,
            currency: data.currency,
            feesMinor: data.fees ?? data.fee ?? null,
            customerCode,
            accountNumber,
            userId: data.metadata?.user_id
              ? Number.parseInt(data.metadata.user_id, 10)
              : null,
          });
        }
      } catch (err) {
        console.error('[payments] Webhook apply failed:', err.message);
      }
    }

    if (event.event === 'dedicatedaccount.assign') {
      const data = event.data || {};
      try {
        const customerCode = data.customer?.customer_code
          || data.customer_code
          || null;
        const user = customerCode
          ? await userModel.getUserByPaystackCustomerCode(customerCode)
          : null;
        if (user) {
          await userModel.updateDvaFields(user.user_id, {
            virtualAccountNumber: data.account_number || undefined,
            virtualAccountBank: data.bank?.name || data.bank_name || undefined,
            virtualAccountName: data.account_name || undefined,
            paystackCustomerCode: customerCode,
          });
        }
      } catch (err) {
        console.error('[payments] dedicatedaccount.assign failed:', err.message);
      }
    }

    if (
      event.event === 'transfer.success'
      || event.event === 'transfer.failed'
      || event.event === 'transfer.reversed'
    ) {
      try {
        await handleTransferWebhookEvent(event.event, event.data || {});
      } catch (err) {
        console.error('[payments] Transfer webhook failed:', err.message);
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('[payments] Webhook handler error:', err.message);
    return res.sendStatus(200);
  }
}

module.exports = router;
module.exports.handlePaystackWebhook = handlePaystackWebhook;
module.exports.isGoalDepositCharge = isGoalDepositCharge;
