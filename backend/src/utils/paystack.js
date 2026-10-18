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
    error.statusCode = response.status >= 400 && response.status < 600 ? response.status : 502;
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

module.exports = {
  isPaystackConfigured,
  getPaystackPublicKey,
  getPaystackCurrency,
  getPaystackLedgerCurrencies,
  isPaystackLedgerCurrency,
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  toMinorUnits,
  fromMinorUnits,
};
