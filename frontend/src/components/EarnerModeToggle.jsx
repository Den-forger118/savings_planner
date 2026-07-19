import { useState } from 'react';
import api from '../services/api';
import { getFriendlyError } from '../utils/friendlyError';
import ErrorBanner from './ErrorBanner';

function EarnerModeToggle({ userId, isEarner, hasBudget, onModeChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleToggle = async () => {
    const nextMode = !isEarner;

    if (nextMode && !hasBudget) {
      setError('Set a monthly budget before enabling Earner mode.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.put(`/users/${userId}/earner-mode`, {
        is_earner: nextMode,
      });

      onModeChange(response.data.user, response.data.mode);
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t update your savings mode. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-lg border border-cream bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <p className="font-sans text-[10px] font-normal uppercase tracking-[0.14em] text-gold">
            Savings Mode
          </p>
          <h3 className="mt-2 font-serif text-2xl font-light tracking-[-0.02em] text-primary-dark">
            {isEarner ? 'Earner Mode' : 'Non-Earner Mode'}
          </h3>
          <p className="mt-3 font-sans text-sm leading-relaxed text-taupe">
            {isEarner
              ? 'Your monthly budget is split across goals with allocation, feasibility checks, and funding recommendations.'
              : 'Track what you need to save for each goal without tying plans to a fixed monthly income.'}
          </p>
          {!hasBudget && !isEarner && (
            <p className="mt-3 font-sans text-xs text-taupe">
              Set a monthly budget below to unlock Earner mode.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={isEarner}
            aria-label={isEarner ? 'Switch to Non-Earner mode' : 'Switch to Earner mode'}
            disabled={loading}
            onClick={handleToggle}
            className={`group relative h-5 w-9 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-wait disabled:opacity-50 ${
              isEarner ? 'bg-primary-dark' : 'bg-taupe/25'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-[left] duration-200 ease-out ${
                isEarner ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </button>
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-taupe/70">
            {loading ? 'Saving…' : isEarner ? 'Earner' : 'Non-Earner'}
          </p>
        </div>
      </div>

      {error && <ErrorBanner className="mt-4" message={error} />}
    </section>
  );
}

export default EarnerModeToggle;
