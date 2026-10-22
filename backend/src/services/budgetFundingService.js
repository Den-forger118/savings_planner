const pool = require('../dbcon');
const userModel = require('../models/userModel');
const calculationModel = require('../models/calculationModel');
const { getLocalParts } = require('../utils/localTime');
const { getPaystackCurrency } = require('../utils/paystack');

/**
 * Classify month-to-date inbound funding vs monthly budget target.
 * Pure helper for tests + API.
 */
function classifyBudgetFunding({ monthlyBudget, fundedMtd }) {
  const budget = calculationModel.roundToTwo(monthlyBudget);
  const funded = calculationModel.roundToTwo(fundedMtd);

  if (!Number.isFinite(budget) || budget <= 0) {
    return {
      status: 'no_budget',
      monthly_budget: null,
      funded_mtd: funded,
      remaining: null,
      surplus: null,
    };
  }

  const remaining = calculationModel.roundToTwo(Math.max(0, budget - funded));
  const surplus = calculationModel.roundToTwo(Math.max(0, funded - budget));

  let status = 'on_track';
  if (funded + 0.009 < budget) status = 'behind';
  else if (funded > budget + 0.009) status = 'ahead';

  return {
    status,
    monthly_budget: budget,
    funded_mtd: funded,
    remaining: status === 'behind' ? remaining : 0,
    surplus: status === 'ahead' ? surplus : 0,
  };
}

/**
 * Sum successful Paystack inbound credits this local calendar month.
 * Counts wallet_deposit (VA) and goal_deposit (legacy checkout) — not manual ledger entries.
 */
async function sumInboundFundingMtd(userId, timeZone = 'UTC') {
  const zone = timeZone && String(timeZone).trim() ? String(timeZone).trim() : 'UTC';

  const result = await pool.query(
    `
      SELECT COALESCE(SUM(amount), 0)::float AS funded
      FROM payment_references
      WHERE user_id = $1
        AND status = 'success'
        AND kind IN ('wallet_deposit', 'goal_deposit')
        AND (COALESCE(completed_at, created_at) AT TIME ZONE $2)
              >= date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE $2))
        AND (COALESCE(completed_at, created_at) AT TIME ZONE $2)
              < date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE $2)) + INTERVAL '1 month'
    `,
    [userId, zone]
  );

  return calculationModel.roundToTwo(result.rows[0]?.funded || 0);
}

/**
 * Month-to-date funding progress vs Earner monthly budget.
 */
async function getBudgetFundingProgress(userId) {
  const user = await userModel.getUserById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const timeZone = user.timezone || 'UTC';
  const local = getLocalParts(new Date(), timeZone);
  const fundedMtd = await sumInboundFundingMtd(userId, timeZone);
  const monthlyBudget = user.is_earner
    ? calculationModel.roundToTwo(user.monthly_budget)
    : 0;

  const classified = classifyBudgetFunding({
    monthlyBudget: user.is_earner ? monthlyBudget : 0,
    fundedMtd,
  });

  const [year, month] = local.dateStr.split('-');

  return {
    ...classified,
    is_earner: user.is_earner === true,
    currency: getPaystackCurrency(),
    display_currency: user.currency || getPaystackCurrency(),
    timezone: timeZone,
    period: {
      year: Number.parseInt(year, 10),
      month: Number.parseInt(month, 10),
      label: local.dateStr.slice(0, 7),
    },
    note:
      'Funded = successful transfers into QUANT this month (VA / Paystack). Manual ledger entries do not count.',
  };
}

module.exports = {
  classifyBudgetFunding,
  sumInboundFundingMtd,
  getBudgetFundingProgress,
};
