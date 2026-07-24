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
      <section className="relative overflow-hidden rounded-card bg-primary-dark p-5 text-cream shadow-soft sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold-light">
              Monthly Savings Mandate
            </p>
            <p className="mt-3 break-words font-money text-3xl font-light tracking-[0.02em] text-gold sm:text-4xl md:text-5xl">
              {formatMoney(currentBudget, currencyCode, currencySymbol)}
            </p>
            <p className="mt-2 max-w-lg font-sans text-sm text-cream/70">
              Capital reserved for goal allocation each month in Earner mode.
            </p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-lg border-2 border-gold px-6 py-3 font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold transition-colors hover:bg-gold hover:text-primary-dark"
          >
            Edit Budget
          </button>
        </div>
      </section>
    );
  }

  if (!isEditing && hasBudget && !isEarnerMode) {
    return (
      <section className="rounded-lg border-l-4 border-gold bg-white p-8 shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
          Monthly Budget Saved
        </p>
        <h2 className="mt-2 font-money text-2xl font-light tracking-[0.02em] text-primary-dark">
          {formatMoney(currentBudget, currencyCode, currencySymbol)} / month
        </h2>
        <p className="mt-3 max-w-2xl font-sans text-base leading-relaxed text-taupe">
          Your budget is stored but inactive while Non-Earner mode is on.
          Enable Earner mode above to unlock smart allocation across goals.
        </p>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="mt-6 rounded-lg border-2 border-gold px-6 py-3 font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold transition-colors hover:bg-gold hover:text-primary-dark"
        >
          Edit Budget
        </button>
      </section>
    );
  }

  if (!isEditing && !hasBudget) {
    return (
      <section className="rounded-lg border-l-4 border-gold bg-white p-8 shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
          {isEarnerMode ? 'Monthly Budget Required' : 'Non-Earner Mode'}
        </p>
        <h2 className="mt-2 font-serif text-2xl font-light tracking-[-0.02em] text-primary-dark">
          {isEarnerMode
            ? 'Set a monthly budget to use Earner mode.'
            : "You're in Non-Earner Mode."}
        </h2>
        <p className="mt-3 max-w-2xl font-sans text-base leading-relaxed text-taupe">
          {isEarnerMode
            ? 'Earner mode needs a monthly savings mandate before it can allocate funds across your goals.'
            : 'The app shows what you need to save without requiring a fixed income. Set a monthly budget anytime, then enable Earner mode to unlock smart allocation.'}
        </p>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="mt-6 rounded-lg bg-gold px-6 py-3 font-sans text-xs font-normal uppercase tracking-[0.12em] text-primary-dark transition-colors hover:bg-gold-light"
        >
          Set Monthly Budget
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-lg border-t-4 border-gold bg-white p-8 shadow-sm transition-shadow duration-300 hover:shadow-lg">
      <div className="mb-6">
        <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
          Savings Mandate
        </p>
        <h2 className="mt-2 font-serif text-2xl font-light tracking-[-0.02em] text-primary-dark">
          Set Monthly Budget
        </h2>
        <p className="mt-2 font-sans text-base text-taupe">
          Define the monthly amount available for your savings strategy.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="mb-2 block font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
            Monthly Budget
          </label>
          <div className="flex items-center gap-3">
            <span className="font-money text-3xl font-light tracking-[0.02em] text-gold">{currencySymbol}</span>
            <input
              type="number"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              placeholder="500.00"
              step="0.01"
              min="0"
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 font-sans text-base transition-colors focus:border-gold focus:outline-none"
            />
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-gold px-6 py-4 font-sans text-xs font-normal uppercase tracking-[0.12em] text-primary-dark transition-colors hover:bg-gold-light disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Set Budget'}
          </button>
          {hasBudget && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border-2 border-gold px-6 py-4 font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold transition-colors hover:bg-gold hover:text-primary-dark"
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
