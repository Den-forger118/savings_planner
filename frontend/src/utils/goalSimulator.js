const AVERAGE_DAYS_PER_MONTH = 30.44;
const DAYS_IN_YEAR = 365.25;

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundToTwo = (value) => Number(toNumber(value).toFixed(2));

export const SIM_MODES = [
  { id: 'deadline', label: 'Deadline' },
  { id: 'contribution', label: 'Contribution' },
  { id: 'horizon', label: 'Horizon' },
  { id: 'compare', label: 'Compare' },
];

export const FREQUENCIES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

export const HORIZON_PRESETS = [6, 12, 24];

export const todayInputValue = (now = new Date()) => {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const remainingAmount = (targetAmount, savedAmount = 0) =>
  Math.max(0, toNumber(targetAmount) - toNumber(savedAmount));

export const getDaysRemaining = (fromDate, toDate) => {
  const start = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
};

export const addDays = (fromDate, days) => {
  const start = new Date(`${fromDate}T00:00:00`);
  start.setDate(start.getDate() + Math.max(0, Math.ceil(toNumber(days))));
  return todayInputValue(start);
};

export const cadenceFromDays = (remaining, days) => {
  const safeDays = Math.max(days, 1);
  const leftover = toNumber(remaining);

  return {
    daily: roundToTwo(leftover / safeDays),
    weekly: roundToTwo(leftover / (safeDays / 7)),
    monthly: roundToTwo(leftover / (safeDays / AVERAGE_DAYS_PER_MONTH)),
    yearly: safeDays < DAYS_IN_YEAR ? 0 : roundToTwo(leftover / (safeDays / DAYS_IN_YEAR)),
  };
};

export const toDailyRate = (amount, frequency) => {
  const value = toNumber(amount);
  if (value <= 0) return 0;
  if (frequency === 'weekly') return value / 7;
  if (frequency === 'monthly') return value / AVERAGE_DAYS_PER_MONTH;
  if (frequency === 'yearly') return value / DAYS_IN_YEAR;
  return value;
};

export const simulate = ({
  targetAmount,
  savedAmount = 0,
  mode,
  deadline,
  contributionAmount,
  contributionFrequency = 'monthly',
  horizonMonths,
  asOf,
} = {}) => {
  const today = asOf || todayInputValue();
  const remaining = remainingAmount(targetAmount, savedAmount);

  if (toNumber(targetAmount) <= 0) {
    return { ok: false, error: 'Enter a target greater than zero.' };
  }

  if (remaining <= 0) {
    return {
      ok: true,
      met: true,
      remaining: 0,
      message: 'This scenario is already funded.',
    };
  }

  if (mode === 'deadline') {
    if (!deadline) {
      return { ok: false, error: 'Choose a deadline to solve for cadence.' };
    }
    const days = getDaysRemaining(today, deadline);
    if (days === null) {
      return { ok: false, error: 'Enter a valid deadline.' };
    }
    if (days < 1) {
      return { ok: false, error: 'Deadline must be today or later.' };
    }
    return {
      ok: true,
      remaining,
      days,
      finishDate: deadline,
      cadence: cadenceFromDays(remaining, days),
      kind: 'cadence',
    };
  }

  if (mode === 'contribution') {
    const amount = toNumber(contributionAmount);
    if (amount <= 0) {
      return { ok: false, error: 'Enter how much you can save each period.' };
    }
    const daily = toDailyRate(amount, contributionFrequency);
    const days = Math.max(1, Math.ceil(remaining / daily));
    const finishDate = addDays(today, days);
    return {
      ok: true,
      remaining,
      days,
      finishDate,
      cadence: cadenceFromDays(remaining, days),
      kind: 'date',
    };
  }

  if (mode === 'horizon') {
    const months = toNumber(horizonMonths);
    if (months <= 0) {
      return { ok: false, error: 'Choose a horizon in months.' };
    }
    const days = Math.max(1, Math.ceil(months * AVERAGE_DAYS_PER_MONTH));
    const finishDate = addDays(today, days);
    return {
      ok: true,
      remaining,
      days,
      finishDate,
      cadence: cadenceFromDays(remaining, days),
      kind: 'cadence',
    };
  }

  return { ok: false, error: 'Choose a scenario mode.' };
};
