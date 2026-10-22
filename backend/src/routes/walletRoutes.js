const express = require('express');
const userModel = require('../models/userModel');
const goalModel = require('../models/goalModel');
const {
  ensureDvaForUser,
  allocateFromWallet,
} = require('../services/walletService');
const {
  getPayoutDestinations,
  requestWalletWithdrawal,
} = require('../services/payoutService');
const payoutModel = require('../models/payoutModel');
const { isPaystackConfigured, getPaystackCurrency } = require('../utils/paystack');
const { formatAuthUser } = require('../utils/authUser');
const { getBudgetFundingProgress } = require('../services/budgetFundingService');

const router = express.Router();

/** Current wallet balance + DVA details. */
router.get('/', async (req, res) => {
  try {
    const user = await userModel.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let budget_funding = null;
    try {
      budget_funding = await getBudgetFundingProgress(req.user.userId);
    } catch (err) {
      console.warn('[wallet] budget funding progress skipped:', err.message);
    }

    return res.json({
      wallet_balance: Number.parseFloat(user.wallet_balance) || 0,
      auto_allocate_wallet: user.auto_allocate_wallet !== false,
      currency: getPaystackCurrency(),
      phone: user.phone || null,
      paystack_customer_code: user.paystack_customer_code || null,
      virtual_account_number: user.virtual_account_number || null,
      virtual_account_bank: user.virtual_account_bank || null,
      virtual_account_name: user.virtual_account_name || null,
      dva_enabled: Boolean(user.virtual_account_number),
      paystack_configured: isPaystackConfigured(),
      budget_funding,
    });
  } catch (err) {
    console.error('[wallet] GET failed:', err.message);
    return res.status(500).json({ error: 'Could not load wallet' });
  }
});

/**
 * Consent-gated Dedicated Virtual Account provisioning.
 * Body: { phone, consent: true }
 */
router.post('/dva', async (req, res) => {
  try {
    const consent = req.body?.consent === true;
    const phone = req.body?.phone;

    const result = await ensureDvaForUser(req.user.userId, phone, { consent });
    return res.status(result.alreadyProvisioned ? 200 : 201).json({
      message: result.alreadyProvisioned
        ? 'Dedicated account already provisioned'
        : 'Dedicated account created',
      user: formatAuthUser(result.user),
      wallet: {
        wallet_balance: Number.parseFloat(result.user.wallet_balance) || 0,
        phone: result.user.phone,
        virtual_account_number: result.user.virtual_account_number,
        virtual_account_bank: result.user.virtual_account_bank,
        virtual_account_name: result.user.virtual_account_name,
        paystack_customer_code: result.user.paystack_customer_code,
        dva_enabled: Boolean(result.user.virtual_account_number),
      },
    });
  } catch (err) {
    console.error('[wallet] DVA provision failed:', err.message);
    return res.status(err.statusCode || 500).json({
      error: err.message || 'Could not create dedicated account',
      paystack: err.paystack || undefined,
    });
  }
});

/** MoMo / bank destination codes for cash-out forms. */
router.get('/payout-destinations', async (req, res) => {
  try {
    const destinations = await getPayoutDestinations();
    return res.json(destinations);
  } catch (err) {
    console.error('[wallet] payout destinations failed:', err.message);
    return res.status(500).json({ error: 'Could not load payout destinations' });
  }
});

/** Recent wallet withdrawals. */
router.get('/payouts', async (req, res) => {
  try {
    const payouts = await payoutModel.listForUser(req.user.userId, { limit: 25 });
    return res.json({ payouts });
  } catch (err) {
    console.error('[wallet] list payouts failed:', err.message);
    return res.status(500).json({ error: 'Could not load payouts' });
  }
});

/**
 * Withdraw from wallet via Paystack Transfer (MoMo / bank).
 * Body: { amount, type, accountNumber, bankCode, name? }
 */
router.post('/withdraw', async (req, res) => {
  try {
    const result = await requestWalletWithdrawal(req.user.userId, {
      amount: req.body?.amount,
      type: req.body?.type,
      accountNumber: req.body?.accountNumber,
      bankCode: req.body?.bankCode,
      name: req.body?.name,
    });

    return res.status(201).json({
      message: 'Withdrawal submitted',
      payout: result.payout,
      wallet_balance: result.walletBalance,
      transfer_status: result.transfer?.status || result.payout?.status,
    });
  } catch (err) {
    console.error('[wallet] Withdraw failed:', err.message);
    return res.status(err.statusCode || 500).json({
      error: err.message || 'Withdrawal failed',
      paystack: err.paystack || undefined,
    });
  }
});

/**
 * Allocate unallocated wallet funds to a goal (internal DB only).
 * Body: { goalId, amount }
 */
router.post('/allocate', async (req, res) => {
  try {
    const goalId = Number.parseInt(req.body?.goalId, 10);
    const amount = Number.parseFloat(req.body?.amount);

    if (!Number.isFinite(goalId) || goalId < 1) {
      return res.status(400).json({ error: 'A valid goalId is required' });
    }

    const result = await allocateFromWallet(req.user.userId, goalId, amount);
    const goal = await goalModel.getGoalById(goalId);

    return res.status(201).json({
      message: 'Allocated from wallet',
      transaction: result.transaction,
      wallet_balance: result.walletBalance,
      updated_goal: goal,
      goal_completed: result.goalCompleted || false,
      completed_goal_name: result.completedGoal?.name || null,
    });
  } catch (err) {
    console.error('[wallet] Allocate failed:', err.message);
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
});

module.exports = router;
