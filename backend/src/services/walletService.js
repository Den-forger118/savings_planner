const pool = require('../dbcon');
const paymentModel = require('../models/paymentModel');
const transactionModel = require('../models/transactionModel');
const userModel = require('../models/userModel');
const goalModel = require('../models/goalModel');
const ledgerService = require('./ledgerService');
const {
  isPaystackConfigured,
  getPaystackCurrency,
  createCustomer,
  fetchCustomer,
  createDedicatedAccount,
  listDedicatedAccounts,
  fromMinorUnits,
} = require('../utils/paystack');
const { resolveLedgerFee } = require('./paymentService');
const { sendWalletCreditNotice } = require('../utils/mailer');

function normalizePhone(phone) {
  const cleaned = String(phone || '').replace(/[^\d+]/g, '').trim();
  return cleaned;
}

/**
 * Waterfall plan: fill highest-priority goals first (lowest priority number),
 * up to each goal's remaining need, until available wallet funds run out.
 */
function planWalletAllocations(goals, availableAmount) {
  let remainingFunds = Number.parseFloat(availableAmount) || 0;
  if (remainingFunds <= 0) return [];

  const sorted = [...(goals || [])]
    .filter((goal) => goal && !goal.is_complete && !goal.is_paused && !goal.deleted_at)
    .sort((a, b) => {
      const pa = Number.parseInt(a.priority, 10) || 1;
      const pb = Number.parseInt(b.priority, 10) || 1;
      if (pa !== pb) return pa - pb;
      return Number(a.goal_id) - Number(b.goal_id);
    });

  const plan = [];
  for (const goal of sorted) {
    if (remainingFunds <= 0.00001) break;
    const need = Math.max(
      0,
      Number.parseFloat(goal.target_amount) - Number.parseFloat(goal.saved_amount || 0)
    );
    if (need <= 0.00001) continue;
    const slice = Math.min(remainingFunds, need);
    const amount = Number(slice.toFixed(2));
    if (amount <= 0) continue;
    plan.push({
      goalId: goal.goal_id,
      goalName: goal.name,
      amount,
    });
    remainingFunds = Number((remainingFunds - amount).toFixed(2));
  }
  return plan;
}

/**
 * Create or reuse Paystack customer + Dedicated Virtual Account for a user.
 */
async function ensureDvaForUser(userId, phone, { consent = false } = {}) {
  if (!consent) {
    const error = new Error('Consent is required to create a dedicated virtual account');
    error.statusCode = 400;
    throw error;
  }

  if (!isPaystackConfigured()) {
    const error = new Error('Paystack is not configured');
    error.statusCode = 503;
    throw error;
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone || normalizedPhone.replace(/\D/g, '').length < 9) {
    const error = new Error('A valid phone number is required for bank transfer setup');
    error.statusCode = 400;
    throw error;
  }

  const user = await userModel.getUserById(userId);
  if (!user || user.is_active === false) {
    const error = new Error('Account not available');
    error.statusCode = 403;
    throw error;
  }

  if (user.virtual_account_number && user.paystack_customer_code) {
    const updated = await userModel.updateDvaFields(userId, { phone: normalizedPhone });
    return { alreadyProvisioned: true, user: updated || user };
  }

  await ledgerService.ensureUserWalletAccount(userId);

  let customerCode = user.paystack_customer_code;
  if (!customerCode) {
    try {
      const customer = await createCustomer({
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: normalizedPhone,
        metadata: { user_id: String(userId), platform: 'QUANT' },
      });
      customerCode = customer.customer_code;
    } catch (err) {
      // Customer may already exist for this email — fetch and reuse.
      try {
        const existing = await fetchCustomer(user.email);
        customerCode = existing.customer_code || existing.customer?.customer_code;
      } catch {
        throw err;
      }
      if (!customerCode) throw err;
    }
  }

  let accountNumber = user.virtual_account_number;
  let accountBank = user.virtual_account_bank;
  let accountName = user.virtual_account_name;

  if (!accountNumber) {
    let dva;
    try {
      dva = await createDedicatedAccount({ customerCode });
    } catch (err) {
      // Recover if DVA already exists for customer.
      try {
        const listed = await listDedicatedAccounts({ customerCode });
        const rows = Array.isArray(listed) ? listed : listed?.data || [];
        dva = rows[0] || null;
      } catch {
        throw err;
      }
      if (!dva) throw err;
    }

    accountNumber = dva.account_number || dva.dedicated_account?.account_number;
    accountBank = dva.bank?.name
      || dva.bank_name
      || dva.dedicated_account?.bank?.name
      || null;
    accountName = dva.account_name
      || dva.dedicated_account?.account_name
      || `${user.first_name} ${user.last_name}`.trim();
  }

  if (!accountNumber) {
    const error = new Error(
      'Paystack did not return a virtual account number. Confirm DVA is enabled for this business.'
    );
    error.statusCode = 502;
    throw error;
  }

  const updated = await userModel.updateDvaFields(userId, {
    phone: normalizedPhone,
    paystackCustomerCode: customerCode,
    virtualAccountNumber: accountNumber,
    virtualAccountBank: accountBank,
    virtualAccountName: accountName,
  });

  return { alreadyProvisioned: false, user: updated };
}

/**
 * Credit unallocated wallet from a DVA / blind Paystack charge (idempotent by reference).
 */
async function applyWalletCredit({
  reference,
  amountMinor,
  currency,
  feesMinor = null,
  customerCode = null,
  accountNumber = null,
  userId: explicitUserId = null,
}) {
  if (!reference) {
    const error = new Error('Payment reference is required');
    error.statusCode = 400;
    throw error;
  }

  const existing = await paymentModel.getByReference(reference);
  if (existing?.status === 'success') {
    return { alreadyProcessed: true, payment: existing };
  }

  let user = null;
  if (explicitUserId) {
    user = await userModel.getUserById(explicitUserId);
  }
  if (!user && customerCode) {
    user = await userModel.getUserByPaystackCustomerCode(customerCode);
  }
  if (!user && accountNumber) {
    user = await userModel.getUserByVirtualAccountNumber(accountNumber);
  }
  if (!user) {
    const error = new Error('No QUANT user matched this dedicated account payment');
    error.statusCode = 404;
    throw error;
  }

  const amount = fromMinorUnits(amountMinor);
  if (!Number.isFinite(amount) || amount <= 0) {
    const error = new Error('Invalid wallet credit amount');
    error.statusCode = 400;
    throw error;
  }

  const settlementCurrency = String(currency || getPaystackCurrency()).toUpperCase();
  const feeAmount = resolveLedgerFee({
    feesMinor,
    feeCurrency: settlementCurrency,
    ledgerCurrency: settlementCurrency,
  });

  let payment = existing;
  if (!payment) {
    try {
      payment = await paymentModel.createPendingPayment({
        userId: user.user_id,
        goalId: null,
        paystackRef: reference,
        amount,
        currency: settlementCurrency,
        kind: 'wallet_deposit',
      });
    } catch (err) {
      payment = await paymentModel.getByReference(reference);
      if (payment?.status === 'success') {
        return { alreadyProcessed: true, payment };
      }
      if (!payment) throw err;
    }
  }

  if (payment.kind && payment.kind !== 'wallet_deposit') {
    const error = new Error('Payment reference belongs to a goal deposit, not the wallet');
    error.statusCode = 409;
    throw error;
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
      return { alreadyProcessed: true, payment: finalRow, inFlight: true };
    }
    const error = new Error('Could not claim wallet payment for processing');
    error.statusCode = 409;
    throw error;
  }

  const client = await pool.connect();
  let journalEntry;
  let newBalance;
  try {
    await client.query('BEGIN');

    const locked = await client.query(
      `
        SELECT user_id, wallet_balance
        FROM users
        WHERE user_id = $1
        FOR UPDATE
      `,
      [user.user_id]
    );
    if (locked.rows.length === 0) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    const journalResult = await ledgerService.postDepositJournal({
      userId: user.user_id,
      grossAmount: amount,
      feeAmount,
      idempotencyKey: reference,
      currency: settlementCurrency,
      description: 'Paystack DVA wallet deposit',
      client,
    });
    journalEntry = journalResult.journalEntry;

    if (!journalResult.alreadyProcessed) {
      const bal = await client.query(
        `
          UPDATE users
          SET wallet_balance = wallet_balance + $2
          WHERE user_id = $1
          RETURNING wallet_balance
        `,
        [user.user_id, amount]
      );
      newBalance = Number.parseFloat(bal.rows[0].wallet_balance);
    } else {
      newBalance = Number.parseFloat(locked.rows[0].wallet_balance);
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
    journalEntryId: journalEntry?.journal_entry_id || null,
  });

  let allocations = [];
  let walletBalanceAfter = newBalance;
  const freshUser = await userModel.getUserById(user.user_id);
  if (freshUser?.auto_allocate_wallet !== false) {
    try {
      const auto = await autoAllocateWalletToGoals(user.user_id);
      allocations = auto.allocations || [];
      if (Number.isFinite(auto.walletBalance)) {
        walletBalanceAfter = auto.walletBalance;
      }
    } catch (err) {
      console.error('[wallet] Auto-allocate after DVA credit failed:', err.message);
    }
  }

  void notifyWalletCredit(freshUser || user, amount, settlementCurrency, allocations);

  return {
    alreadyProcessed: false,
    payment: marked || (await paymentModel.getByReference(reference)),
    walletBalance: walletBalanceAfter,
    journalEntry,
    allocations,
  };
}

async function notifyWalletCredit(user, amount, currency, allocations = []) {
  try {
    if (user.email_notifications === false) return;
    await sendWalletCreditNotice(user, amount, currency, allocations);
  } catch (err) {
    console.error('[wallet] Credit notice failed:', err.message);
  }
}

/**
 * Apply a waterfall of wallet → goal deposits (same mechanics as manual allocate).
 */
async function autoAllocateWalletToGoals(userId) {
  const client = await pool.connect();
  const allocations = [];
  let walletBalance = 0;

  try {
    await client.query('BEGIN');

    const locked = await client.query(
      `
        SELECT user_id, wallet_balance, auto_allocate_wallet
        FROM users
        WHERE user_id = $1
        FOR UPDATE
      `,
      [userId]
    );
    if (locked.rows.length === 0) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    walletBalance = Number.parseFloat(locked.rows[0].wallet_balance) || 0;
    if (walletBalance <= 0) {
      await client.query('COMMIT');
      return { allocations: [], walletBalance };
    }

    const goalsResult = await client.query(
      `
        SELECT goal_id, name, target_amount, saved_amount, priority,
               is_complete, is_paused, deleted_at
        FROM saving_goals
        WHERE user_id = $1
          AND deleted_at IS NULL
          AND is_complete = false
          AND is_paused = false
        ORDER BY priority ASC, goal_id ASC
        FOR UPDATE
      `,
      [userId]
    );

    const plan = planWalletAllocations(goalsResult.rows, walletBalance);
    for (const item of plan) {
      await client.query(
        `
          UPDATE users
          SET wallet_balance = wallet_balance - $2
          WHERE user_id = $1
        `,
        [userId, item.amount]
      );

      await transactionModel.recordTransaction(
        userId,
        item.goalId,
        item.amount,
        'deposit',
        'Auto-allocated from wallet',
        { client }
      );

      allocations.push(item);
      walletBalance = Number((walletBalance - item.amount).toFixed(2));
    }

    const bal = await client.query(
      `SELECT wallet_balance FROM users WHERE user_id = $1`,
      [userId]
    );
    walletBalance = Number.parseFloat(bal.rows[0].wallet_balance) || 0;

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

  for (const item of allocations) {
    try {
      await transactionModel.checkAndMarkComplete(item.goalId);
    } catch (err) {
      console.error('[wallet] checkAndMarkComplete failed:', err.message);
    }
  }

  return { allocations, walletBalance };
}

/**
 * Move funds from unallocated wallet into a savings goal (internal only).
 */
async function allocateFromWallet(userId, goalId, amount) {
  const parsedAmount = Number.parseFloat(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    const error = new Error('Amount must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  const goal = await goalModel.getGoalById(goalId);
  if (!goal || Number(goal.user_id) !== Number(userId) || goal.deleted_at) {
    const error = new Error('Goal not found');
    error.statusCode = 404;
    throw error;
  }
  if (goal.is_paused) {
    const error = new Error('Cannot allocate to a paused goal');
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();
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
      const error = new Error(
        `Allocation exceeds wallet balance (${balance.toFixed(2)}).`
      );
      error.statusCode = 400;
      throw error;
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

    const { transaction, savedAmount } = await transactionModel.recordTransaction(
      userId,
      goalId,
      parsedAmount,
      'deposit',
      'Allocated from wallet',
      { client }
    );

    await client.query('COMMIT');

    const completedGoal = await transactionModel.checkAndMarkComplete(goalId);

    return {
      transaction,
      savedAmount,
      walletBalance: Number.parseFloat(balUpdate.rows[0].wallet_balance),
      goalCompleted: Boolean(completedGoal),
      completedGoal,
    };
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
}

/**
 * Decide whether a charge.success payload is an Option 1 goal deposit.
 */
function isGoalDepositCharge(data, localPayment = null) {
  if (localPayment?.kind === 'goal_deposit') return true;
  if (localPayment?.kind === 'wallet_deposit') return false;

  const meta = data?.metadata || {};
  const txType = String(meta.transaction_type || '').toLowerCase();
  if (txType === 'goal_deposit') return true;
  if (meta.goal_id != null && String(meta.goal_id).trim() !== '') return true;

  const ref = String(data?.reference || '');
  if (/^quant_\d+_\d+_/.test(ref)) return true;

  return false;
}

function extractDvaIdentifiers(data = {}) {
  const customerCode = data.customer?.customer_code
    || data.customer?.customerCode
    || null;
  const accountNumber = data.authorization?.receiver_bank_account_number
    || data.authorization?.account_number
    || data.dedicated_account?.account_number
    || data.metadata?.receiver_account_number
    || null;
  return { customerCode, accountNumber };
}

module.exports = {
  ensureDvaForUser,
  applyWalletCredit,
  allocateFromWallet,
  autoAllocateWalletToGoals,
  planWalletAllocations,
  isGoalDepositCharge,
  extractDvaIdentifiers,
  normalizePhone,
};
