import { ONBOARDING_CURRENCIES, getCurrencyByCode } from './currency';

const FRANKFURTER_BASE = 'https://api.frankfurter.dev/v1';

/** Currencies Frankfurter (ECB) publishes that also appear in QUANT's list. */
export const CONVERTER_CURRENCIES = ONBOARDING_CURRENCIES.filter((item) =>
  [
    'USD', 'GBP', 'EUR', 'ZAR', 'CAD', 'AUD', 'JPY', 'CNY', 'INR',
    'BRL', 'MXN', 'CHF', 'SEK', 'NZD', 'SGD',
  ].includes(item.code)
);

export const isConverterCurrency = (code) =>
  CONVERTER_CURRENCIES.some((item) => item.code === code);

/**
 * Convert amount from one currency to another via Frankfurter (ECB reference rates).
 * Same-currency returns the amount unchanged without a network call.
 */
export const convertCurrency = async (amount, from, to) => {
  const value = Number.parseFloat(amount);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Enter a valid amount to convert.');
  }

  const base = String(from || 'USD').toUpperCase();
  const quote = String(to || 'USD').toUpperCase();

  if (base === quote) {
    return {
      amount: value,
      base,
      quote,
      rate: 1,
      result: value,
      date: new Date().toISOString().slice(0, 10),
    };
  }

  const url = `${FRANKFURTER_BASE}/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(quote)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('We couldn’t fetch a rate right now. Please try again.');
  }

  const data = await response.json();
  const unitRate = data.rates?.[quote];

  if (!Number.isFinite(unitRate)) {
    throw new Error(`No rate available for ${base} → ${quote}.`);
  }

  const result = Number((value * unitRate).toFixed(quote === 'JPY' ? 0 : 2));

  return {
    amount: value,
    base,
    quote,
    rate: unitRate,
    result,
    date: data.date || null,
  };
};

export const resolveDefaultFrom = (preferredCode) => {
  if (isConverterCurrency(preferredCode)) return preferredCode;
  return 'USD';
};

export const resolveDefaultTo = (fromCode) => {
  if (fromCode === 'EUR') return 'USD';
  if (isConverterCurrency('EUR')) return 'EUR';
  const other = CONVERTER_CURRENCIES.find((item) => item.code !== fromCode);
  return other?.code || 'USD';
};

export { getCurrencyByCode };
