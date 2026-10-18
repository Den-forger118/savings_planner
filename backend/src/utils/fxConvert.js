/**
 * Convert between currencies for Paystack charges.
 * Prefer free public rate feeds that include GHS (Frankfurter/ECB does not).
 */

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`FX HTTP ${response.status}`);
  }
  return response.json();
}

async function rateFromCurrencyApi(from, to) {
  const base = from.toLowerCase();
  const quote = to.toLowerCase();
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base}.min.json`,
    `https://latest.currency-api.pages.dev/v1/currencies/${base}.min.json`,
  ];

  let lastError;
  for (const url of urls) {
    try {
      const data = await fetchJson(url);
      const rate = data?.[base]?.[quote];
      if (Number.isFinite(rate) && rate > 0) {
        return { rate, source: 'currency-api', date: data?.date || null };
      }
      lastError = new Error(`No ${from}→${to} rate in currency-api`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('FX lookup failed');
}

async function rateFromOpenErApi(from, to) {
  const data = await fetchJson(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`);
  if (data?.result !== 'success') {
    throw new Error(data?.['error-type'] || 'open.er-api failed');
  }
  const rate = data.rates?.[to];
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`No ${from}→${to} rate in open.er-api`);
  }
  return { rate, source: 'open.er-api', date: data.time_last_update_utc || null };
}

async function getFxRate(fromCurrency, toCurrency) {
  const from = String(fromCurrency || '').toUpperCase();
  const to = String(toCurrency || '').toUpperCase();

  if (!from || !to) {
    throw new Error('Both currencies are required for conversion');
  }
  if (from === to) {
    return { rate: 1, source: 'identity', date: null };
  }

  try {
    return await rateFromCurrencyApi(from, to);
  } catch {
    return rateFromOpenErApi(from, to);
  }
}

async function convertAmount(amount, fromCurrency, toCurrency) {
  const value = Number.parseFloat(amount);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Invalid amount for conversion');
  }

  const { rate, source, date } = await getFxRate(fromCurrency, toCurrency);
  const decimals = String(toCurrency).toUpperCase() === 'JPY' ? 0 : 2;
  const result = Number((value * rate).toFixed(decimals));

  return {
    amount: value,
    from: String(fromCurrency).toUpperCase(),
    to: String(toCurrency).toUpperCase(),
    rate,
    result,
    source,
    date,
  };
}

module.exports = {
  getFxRate,
  convertAmount,
};
