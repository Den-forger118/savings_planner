export const ONBOARDING_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', locale: 'en-GH' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', locale: 'en-KE' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', locale: 'en-ZA' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', locale: 'es-MX' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', locale: 'de-CH' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', locale: 'sv-SE' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', locale: 'en-NZ' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', locale: 'ar-SA' },
];

export const CURRENCIES = ONBOARDING_CURRENCIES;

export const FISCAL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const getCurrencyByCode = (code) =>
  ONBOARDING_CURRENCIES.find((item) => item.code === code) || ONBOARDING_CURRENCIES[0];

export const formatMoney = (value, currencyCode = 'USD', currencySymbol = null) => {
  const amount = Number.parseFloat(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const currency = getCurrencyByCode(currencyCode);
  const symbol = currencySymbol || currency.symbol;
  const decimals = currency.code === 'JPY' ? 0 : 2;

  return `${symbol}${safeAmount.toFixed(decimals)}`;
};

/** Tailwind class stack for currency / ledger figures (tabular mono). */
export const MONEY_TYPE = 'font-money tabular-nums';

export const formatCurrency = (value, currencyCode = 'USD') => {
  const amount = Number.parseFloat(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const currency = getCurrencyByCode(currencyCode);

  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: currency.code === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency.code === 'JPY' ? 0 : 2,
  }).format(safeAmount);
};

export const defaultAlertPreferences = () => ({
  budget_runway: [50, 75, 90],
  feasibility_decay: true,
});
