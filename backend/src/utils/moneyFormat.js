const CURRENCY_SYMBOLS = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  GHS: '₵',
  NGN: '₦',
  KES: 'KSh',
  ZAR: 'R',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  BRL: 'R$',
  MXN: 'MX$',
  CHF: 'Fr',
  SEK: 'kr',
  NZD: 'NZ$',
  SGD: 'S$',
  AED: 'د.إ',
  SAR: '﷼',
};

function formatMoney(value, currencyCode = 'USD', currencySymbol = null) {
  const amount = Number.parseFloat(value);
  const safe = Number.isFinite(amount) ? amount : 0;
  const code = String(currencyCode || 'USD').toUpperCase();
  const symbol = currencySymbol || CURRENCY_SYMBOLS[code] || `${code} `;
  const decimals = code === 'JPY' ? 0 : 2;
  return `${symbol}${safe.toFixed(decimals)}`;
}

module.exports = { formatMoney, CURRENCY_SYMBOLS };
