import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { formatMoney } from '../utils/currency';
import { getFriendlyError } from '../utils/friendlyError';
import ErrorBanner from './ErrorBanner';

const parseAmount = (value) => parseFloat(value) || 0;

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next.getTime();
};

const formatDayLabel = (dateString) => {
  const date = new Date(dateString);
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const dayMs = 24 * 60 * 60 * 1000;

  if (target === today) return 'Today';
  if (target === today - dayMs) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (dateString) => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const groupTransactionsByDay = (transactions) => {
  const groups = [];
  const indexByKey = new Map();

  transactions.forEach((tx) => {
    const key = startOfDay(tx.created_at);
    if (!indexByKey.has(key)) {
      indexByKey.set(key, groups.length);
      groups.push({
        key,
        label: formatDayLabel(tx.created_at),
        items: [],
      });
    }
    groups[indexByKey.get(key)].items.push(tx);
  });

  return groups;
};

function RecentActivity({
  userId,
  refreshKey = 0,
  limit = 8,
  onViewAll,
  currencyCode = 'USD',
  currencySymbol = '$',
}) {
  const fmt = (value) => formatMoney(value, currencyCode, currencySymbol);
  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecent();
  }, [userId, refreshKey, limit]);

  const fetchRecent = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(
        `/transactions?userId=${userId}&page=1&limit=${limit}`
      );
      setTransactions(response.data.transactions || []);
      setTotalCount(response.data.pagination?.total_count || 0);
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t load recent activity. Please try again.'));
      setTransactions([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const dayGroups = useMemo(
    () => groupTransactionsByDay(transactions),
    [transactions]
  );

  if (loading) {
    return (
      <section className="surface p-6">
        <p className="font-sans text-sm text-taupe">Loading recent activity...</p>
      </section>
    );
  }

  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-primary-dark/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Savings Activity</p>
          <h3 className="mt-1 card-title">Recent Activity</h3>
        </div>
        {totalCount > 0 && onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="font-sans text-sm font-normal text-gold hover:underline"
          >
            View all {totalCount} →
          </button>
        )}
      </div>

      {error ? (
        <div className="px-5 py-6">
          <ErrorBanner message={error} />
        </div>
      ) : transactions.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="font-serif text-lg font-light tracking-[-0.015em] text-primary-dark">No transactions yet</p>
          <p className="mt-1 font-sans text-sm text-taupe">
            Record a deposit on any savings goal to see activity here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-cream/80 px-4 py-2 sm:px-5">
          {dayGroups.map((group) => (
            <div key={group.key} className="py-4">
              <p className="mb-3 font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
                {group.label}
              </p>
              <ol className="space-y-0">
                {group.items.map((tx) => {
                  const isDeposit = tx.type === 'deposit';
                  const amount = parseAmount(tx.amount);

                  return (
                    <li
                      key={tx.transaction_id}
                      className="grid grid-cols-[0.875rem_minmax(0,1fr)] gap-x-3 pb-4 last:pb-0"
                    >
                      <div className="relative flex justify-center" aria-hidden="true">
                        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-primary-dark/15" />
                        <span
                          className={`relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] bg-cream ${
                            isDeposit ? 'border-gold' : 'border-red-400'
                          }`}
                        />
                      </div>
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-serif text-base font-light tracking-[-0.015em] text-primary-dark">
                            {tx.goal_name || 'Goal'}
                          </p>
                          {tx.note?.trim() ? (
                            <p className="mt-0.5 line-clamp-1 font-sans text-sm font-light text-taupe">
                              {tx.note}
                            </p>
                          ) : null}
                          <p className="mt-0.5 font-sans text-xs font-light text-taupe">
                            {formatTime(tx.created_at)} · {isDeposit ? 'Deposit' : 'Withdrawal'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`font-money text-sm font-light tracking-[0.02em] ${
                            isDeposit ? 'text-primary-dark' : 'text-red-700'
                          }`}>
                            {isDeposit ? '+' : '−'}{fmt(amount)}
                          </p>
                          <p className="mt-0.5 font-money text-xs font-light text-taupe">
                            Bal {fmt(parseAmount(tx.balance_after))}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default RecentActivity;
