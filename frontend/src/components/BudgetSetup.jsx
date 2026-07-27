import { useState, useEffect } from 'react';
import api from '../services/api';
import { formatMoney } from '../utils/currency';
import { getFriendlyError } from '../utils/friendlyError';
import ErrorBanner from './ErrorBanner';

function BudgetSetup({
  userId,
  currentBudget,
  isEarnerMode = false,
  onBudgetSet,
  currencyCode = 'USD',
  currencySymbol = '$',
  hideWhenSet = false,
  editRequest = 0,
}) {
  const [monthlyBudget, setMonthlyBudget] = useState(currentBudget || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasBudget = parseFloat(currentBudget) > 0;

  useEffect(() => {
    if (editRequest > 0) {
      setIsEditing(true);
    }
  }, [editRequest]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!monthlyBudget || monthlyBudget <= 0) {
      setError('Please enter a monthly budget greater than zero.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.put(
        `/users/${userId}/budget`,
        { monthly_budget: parseFloat(monthlyBudget) }
      );

      onBudgetSet(parseFloat(monthlyBudget), response.data.user);
      setIsEditing(false);
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t update your budget. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (!isEditing && hasBudget && hideWhenSet) {
    return null;
  }

  if (!isEditing && hasBudget && isEarnerMode) {
    return (
      <section className="surface-navy flex flex-col gap-6 p-5 text-cream md:flex-row md:items-center md:justify-between md:p-6">
        <div className="min-w-0">
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold/80">
            Monthly Budget
          </p>
          <p className="mt-3 break-words font-money text-3xl font-light tracking-[0.02em] sm:text-4xl">
            {formatMoney(currentBudget, currencyCode, currencySymbol)}
          </p>
          <p className="mt-2 max-w-lg font-sans text-sm text-cream/55">
            Reserved for goal allocation each month in Earner mode.
          </p>
        </div>
        <button type="button" onClick={() => setIsEditing(true)} className="btn-outline-gold min-h-[44px]">
          Edit Budget
        </button>
      </section>
    );
  }

  if (!isEditing && hasBudget && !isEarnerMode) {
    return (
      <section className="surface overflow-hidden">
        <div className="border-b border-primary-dark/[0.06] px-5 py-4">
          <p className="eyebrow">Budget</p>
          <h3 className="mt-1 card-title">Monthly Budget Saved</h3>
        </div>
        <div className="px-5 py-5">
          <p className="font-money text-2xl font-light tracking-[0.02em] text-primary-dark">
            {formatMoney(currentBudget, currencyCode, currencySymbol)}
            <span className="ml-2 font-sans text-sm font-light text-taupe">/ month</span>
          </p>
          <p className="mt-3 max-w-2xl font-sans text-sm font-light leading-relaxed text-taupe">
            Stored but inactive while Non-Earner mode is on. Enable Earner mode to allocate across goals.
          </p>
          <button type="button" onClick={() => setIsEditing(true)} className="btn-ghost mt-5 min-h-[44px]">
            Edit Budget
          </button>
        </div>
      </section>
    );
  }

  if (!isEditing && !hasBudget) {
    return (
      <section className="surface overflow-hidden">
        <div className="border-b border-primary-dark/[0.06] px-5 py-4">
          <p className="eyebrow">{isEarnerMode ? 'Required' : 'Mode'}</p>
          <h3 className="mt-1 card-title">
            {isEarnerMode ? 'Set a Monthly Budget' : 'Non-Earner Mode'}
          </h3>
        </div>
        <div className="px-5 py-5">
          <p className="max-w-2xl font-sans text-sm font-light leading-relaxed text-taupe">
            {isEarnerMode
              ? 'Earner mode needs a monthly savings amount before it can allocate across your goals.'
              : 'Track what you need to save without a fixed income. Set a budget anytime, then enable Earner mode for allocation.'}
          </p>
          <button type="button" onClick={() => setIsEditing(true)} className="btn-primary mt-5 min-h-[44px]">
            Set Monthly Budget
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="surface overflow-hidden">
      <div className="border-b border-primary-dark/[0.06] px-5 py-4">
        <p className="eyebrow">Budget</p>
        <h3 className="mt-1 card-title">Set Monthly Budget</h3>
        <p className="mt-1 font-sans text-sm text-taupe">
          Define the monthly amount available for your savings strategy.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
        <div>
          <label className="field-label" htmlFor="monthly-budget-input">
            Monthly Budget
          </label>
          <input
            id="monthly-budget-input"
            type="number"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            placeholder={`${currencySymbol}500.00`}
            step="0.01"
            min="0"
            className="field"
          />
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={loading}
            className="btn-navy min-h-[44px] flex-1 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Set Budget'}
          </button>
          {hasBudget && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="btn-ghost min-h-[44px]"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

export default BudgetSetup;
