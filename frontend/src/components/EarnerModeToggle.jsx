import { useState } from 'react';
import api from '../services/api';

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
      setError(err.response?.data?.error || 'Failed to update savings mode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-lg border border-cream bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <p className="font-sans text-xs font-bold uppercase tracking-widest text-gold">
            Savings Mode
          </p>
          <h3 className="mt-2 font-serif text-2xl font-bold text-primary-dark">
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

        <div className="flex shrink-0 flex-col items-end gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isEarner}
            aria-label="Toggle earner mode"
            disabled={loading}
            onClick={handleToggle}
            className={`relative h-8 w-14 rounded-full transition-colors duration-200 disabled:opacity-50 ${
              isEarner ? 'bg-gold' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
                isEarner ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
          <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">
            {loading ? 'Saving...' : isEarner ? 'Earner' : 'Non-Earner'}
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border-l-4 border-red-500 bg-red-50 p-4">
          <p className="font-sans text-sm text-red-700">{error}</p>
        </div>
      )}
    </section>
  );
}

export default EarnerModeToggle;
