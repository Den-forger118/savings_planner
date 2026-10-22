const PAYSTACK_SECRET_KEY = (process.env.PAYSTACK_SECRET_KEY || '').trim();
const PAYSTACK_PUBLIC_KEY = (process.env.PAYSTACK_PUBLIC_KEY || '').trim();
/** Settlement / charge currency for this Paystack business (usually GHS or NGN). */
const PAYSTACK_CURRENCY = (process.env.PAYSTACK_CURRENCY || 'GHS').trim().toUpperCase();
/**
 * Ledger currencies allowed to pay via Paystack.
 * Non-settlement currencies are FX-converted for the charge; the goal is credited in display currency.
 */
const DEFAULT_LEDGER_CURRENCIES = 'GHS,USD,EUR,GBP,NGN';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function isPaystackConfigured() {
  return Boolean(PAYSTACK_SECRET_KEY && PAYSTACK_PUBLIC_KEY);
}

function getPaystackPublicKey() {
  return PAYSTACK_PUBLIC_KEY || null;
}

function getPaystackCurrency() {
  return PAYSTACK_CURRENCY || 'GHS';
}

function getPaystackLedgerCurrencies() {
  const raw = (process.env.PAYSTACK_LEDGER_CURRENCIES || DEFAULT_LEDGER_CURRENCIES).trim();
  const list = raw
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  const settlement = getPaystackCurrency();
  if (!list.includes(settlement)) list.unshift(settlement);
  return [...new Set(list)];
}

function isPaystackLedgerCurrency(code) {
  return getPaystackLedgerCurrencies().includes(String(code || '').toUpperCase());
}

async function paystackRequest(path, { method = 'GET', body } = {}) {
  if (!PAYSTACK_SECRET_KEY) {
    const error = new Error('Paystack is not configured (missing PAYSTACK_SECRET_KEY)');
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.status === false) {
    const error = new Error(payload.message || `Paystack request failed (${response.status})`);
    // Never forward Paystack 401/403 — those are key/business gates, not the member's QUANT session.
    // (The frontend clears the session on session-like 403s.)
    let statusCode = response.status >= 400 && response.status < 600 ? response.status : 502;
    if (statusCode === 401 || statusCode === 403) {
      statusCode = 502;
    }
    error.statusCode = statusCode;
    error.paystack = payload;
    throw error;
  }

  return payload.data;
}

function toMinorUnits(amount) {
  return Math.round(Number.parseFloat(amount) * 100);
}

function fromMinorUnits(minor) {
  return Number.parseFloat((Number(minor) / 100).toFixed(2));
}

async function initializeTransaction({
  email,
  amount,
  currency,
  reference,
  callbackUrl,
  metadata,
}) {
  return paystackRequest('/transaction/initialize', {
    method: 'POST',
    body: {
      email,
      amount: toMinorUnits(amount),
      currency: currency || getPaystackCurrency(),
      reference,
      callback_url: callbackUrl,
      metadata,
    },
  });
}

async function verifyTransaction(reference) {
  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!PAYSTACK_SECRET_KEY || !signatureHeader) return false;

  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');

  return hash === signatureHeader;
}

async function createCustomer({ email, firstName, lastName, phone, metadata }) {
  return paystackRequest('/customer', {
    method: 'POST',
    body: {
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
      metadata,
    },
  });
}

async function fetchCustomer(emailOrCode) {
  return paystackRequest(`/customer/${encodeURIComponent(emailOrCode)}`);
}

/**
 * Create a Dedicated Virtual Account for a Paystack customer.
 * Optional PAYSTACK_DVA_BANK (e.g. wema-bank, test-bank) sets preferred_bank.
 */
async function createDedicatedAccount({ customerCode, preferredBank }) {
  const body = {
    customer: customerCode,
    preferred_bank: preferredBank || process.env.PAYSTACK_DVA_BANK || undefined,
  };
  if (!body.preferred_bank) {
    delete body.preferred_bank;
  }
  return paystackRequest('/dedicated_account', {
    method: 'POST',
    body,
  });
}

async function listDedicatedAccounts({ customerCode } = {}) {
  const params = new URLSearchParams();
  if (customerCode) params.set('customer', customerCode);
  const qs = params.toString();
  return paystackRequest(`/dedicated_account${qs ? `?${qs}` : ''}`);
}

/** List banks / MoMo providers (e.g. currency=GHS&type=mobile_money). */
async function listBanks({ currency, type } = {}) {
  const params = new URLSearchParams();
  if (currency) params.set('currency', currency);
  if (type) params.set('type', type);
  const qs = params.toString();
  return paystackRequest(`/bank${qs ? `?${qs}` : ''}`);
}

async function createTransferRecipient({
  type,
  name,
  accountNumber,
  bankCode,
  currency,
  metadata,
}) {
  return paystackRequest('/transferrecipient', {
    method: 'POST',
    body: {
      type,
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: currency || getPaystackCurrency(),
      metadata,
    },
  });
}

async function initiateTransfer({
  amount,
  recipientCode,
  reference,
  reason,
  currency,
}) {
  return paystackRequest('/transfer', {
    method: 'POST',
    body: {
      source: 'balance',
      amount: toMinorUnits(amount),
      recipient: recipientCode,
      reference,
      reason: reason || 'QUANT wallet withdrawal',
      currency: currency || getPaystackCurrency(),
    },
  });
}

async function verifyTransfer(referenceOrCode) {
  return paystackRequest(`/transfer/verify/${encodeURIComponent(referenceOrCode)}`);
}

module.exports = {
  isPaystackConfigured,
  getPaystackPublicKey,
  getPaystackCurrency,
  getPaystackLedgerCurrencies,
  isPaystackLedgerCurrency,
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  createCustomer,
  fetchCustomer,
  createDedicatedAccount,
  listDedicatedAccounts,
  listBanks,
  createTransferRecipient,
  initiateTransfer,
  verifyTransfer,
  toMinorUnits,
  fromMinorUnits,
};
