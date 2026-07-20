import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import Pagination from './Pagination';
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
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
};

const formatTime = (dateString) => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatExportDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

function ActivityLedger({
  userId,
  goals,
  refreshKey = 0,
  initialGoalFilter = 'all',
  currencyCode = 'USD',
  currencySymbol = '$',
}) {
  const fmt = (value) => formatMoney(value, currencyCode, currencySymbol);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [goalFilter, setGoalFilter] = useState(initialGoalFilter);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    setGoalFilter(initialGoalFilter);
    setPage(1);
  }, [initialGoalFilter]);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userId: String(userId),
        page: String(page),
        limit: String(limit),
      });

      if (goalFilter !== 'all') {
        params.set('goalId', goalFilter);
      }

      if (search.trim()) {
        params.set('search', search.trim());
      }

      const response = await api.get(`/transactions?${params.toString()}`);
      setTransactions(response.data.transactions || []);
      setPagination(response.data.pagination || null);
      setExpandedId(null);
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t load your activity ledger. Please try again.'));
      setTransactions([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [userId, goalFilter, page, limit, search]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger, refreshKey]);

  const filteredTransactions = useMemo(() => {
    if (typeFilter === 'all') return transactions;
    return transactions.filter((tx) => tx.type === typeFilter);
  }, [transactions, typeFilter]);

  const dayGroups = useMemo(
    () => groupTransactionsByDay(filteredTransactions),
    [filteredTransactions]
  );

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleFilterToGoal = (goalId) => {
    if (!goalId) return;
    setGoalFilter(String(goalId));
    setPage(1);
  };

  const handleExport = async () => {
    setExportError(null);
    try {
      const params = new URLSearchParams({
        userId: String(userId),
        page: '1',
        limit: '100',
      });

      if (goalFilter !== 'all') {
        params.set('goalId', goalFilter);
      }

      if (search.trim()) {
        params.set('search', search.trim());
      }

      const allRows = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        params.set('page', String(currentPage));
        const response = await api.get(`/transactions?${params.toString()}`);
        allRows.push(...(response.data.transactions || []));
        totalPages = response.data.pagination?.total_pages || 1;
        currentPage += 1;
      } while (currentPage <= totalPages);

      const exportRows = typeFilter === 'all'
        ? allRows
        : allRows.filter((tx) => tx.type === typeFilter);

      if (exportRows.length === 0) {
        return;
      }

      const headers = ['Date', 'Goal', 'Description', 'Amount', 'Type', 'Balance'];
      const rows = exportRows.map((tx) => {
        const amount = parseAmount(tx.amount);
        const signed = tx.type === 'deposit' ? amount : -amount;

        return [
          formatExportDate(tx.created_at),
          tx.goal_name || '',
          tx.note || '',
          signed.toFixed(2),
          tx.type,
          parseAmount(tx.balance_after).toFixed(2),
        ];
      });

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'savings-activity-ledger.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(getFriendlyError(err, 'We couldn’t export your ledger. Please try again.'));
    }
  };

  const typeFilters = [
    { id: 'all', label: 'All' },
    { id: 'deposit', label: 'Deposits' },
    { id: 'withdrawal', label: 'Withdrawals' },
  ];

  return (
    <div className="space-y-6">
      <section>
        <p className="eyebrow">Activity</p>
        <h2 className="page-title">Savings Ledger</h2>
        <p className="page-lede">
          A running timeline of deposits and withdrawals across your goals.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              value={goalFilter}
              onChange={(e) => {
                setGoalFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-cream bg-white px-3 py-2.5 font-sans text-sm focus:border-gold focus:outline-none sm:w-auto"
            >
              <option value="all">All goals</option>
              {goals.map((goal) => (
                <option key={goal.goal_id} value={goal.goal_id}>
                  {goal.name}
                </option>
              ))}
            </select>

            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
              <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-lg text-taupe">
                search
              </span>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search notes or goals..."
                className="w-full rounded-lg border border-cream py-2.5 pl-9 pr-3 font-sans text-sm focus:border-gold focus:outline-none"
              />
            </form>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={!pagination?.total_count}
            className="btn-navy w-full disabled:opacity-40 sm:w-auto"
          >
            Export Ledger
          </button>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Transaction type">
          {typeFilters.map(({ id, label }) => {
            const isActive = typeFilter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTypeFilter(id)}
                className={`rounded-lg px-3 py-1.5 font-sans text-xs font-medium uppercase tracking-wide transition-colors ${
                  isActive
                    ? 'bg-primary-dark text-cream'
                    : 'border border-cream bg-white text-taupe hover:text-primary-dark'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="surface">
          {(error || exportError) && (
            <div className="space-y-2 border-b border-cream px-5 py-4">
              {error && <ErrorBanner message={error} />}
              {exportError && <ErrorBanner message={exportError} />}
            </div>
          )}
          {loading ? (
            <div className="px-5 py-10">
              <p className="font-sans text-sm text-taupe">Loading ledger...</p>
            </div>
          ) : dayGroups.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="card-title">No activity found</p>
              <p className="mt-2 font-sans text-sm text-taupe">
                {search || goalFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Record a deposit on any savings goal to build your ledger.'}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-cream/80">
                {dayGroups.map((group) => (
                  <div key={group.key} className="px-4 py-5 sm:px-5">
                    <div className="mb-4 flex items-center gap-3">
                      <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
                        {group.label}
                      </p>
                      <div className="h-px flex-1 bg-cream" />
                      <p className="font-sans text-xs font-semibold uppercase tracking-wide text-taupe/60">
                        {group.items.length} {group.items.length === 1 ? 'entry' : 'entries'}
                      </p>
                    </div>

                    <ol className="space-y-0">
                      {group.items.map((tx) => {
                        const isDeposit = tx.type === 'deposit';
                        const amount = parseAmount(tx.amount);
                        const isExpanded = expandedId === tx.transaction_id;

                        return (
                          <li
                            key={tx.transaction_id}
                            className="grid grid-cols-[1rem_minmax(0,1fr)] gap-x-3 pb-5 last:pb-0 sm:grid-cols-[1.125rem_minmax(0,1fr)] sm:gap-x-4"
                          >
                            <div className="relative flex justify-center" aria-hidden="true">
                              <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-primary-dark/15" />
                              <span
                                className={`relative z-10 mt-2 h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] bg-cream sm:h-4 sm:w-4 ${
                                  isDeposit ? 'border-gold' : 'border-red-400'
                                }`}
                              />
                            </div>

                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : tx.transaction_id)}
                                className="w-full rounded-lg border border-transparent px-1 py-1.5 text-left transition-colors hover:border-cream hover:bg-cream/30 sm:px-2"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <p className="truncate font-serif text-base font-light tracking-[-0.015em] text-primary-dark sm:text-lg">
                                        {tx.goal_name || 'Goal'}
                                      </p>
                                      <span className={`font-sans text-xs font-normal uppercase tracking-[0.12em] ${
                                        isDeposit ? 'text-gold' : 'text-red-600'
                                      }`}>
                                        {isDeposit ? 'Deposit' : 'Withdrawal'}
                                      </span>
                                    </div>

                                    {tx.note?.trim() ? (
                                      <p className="mt-0.5 line-clamp-2 font-sans text-sm font-light text-taupe">
                                        {tx.note}
                                      </p>
                                    ) : (
                                      <p className="mt-0.5 font-sans text-sm font-light italic text-taupe/50">
                                        No note
                                      </p>
                                    )}

                                    <p className="mt-1 font-sans text-xs font-light text-taupe">
                                      {formatTime(tx.created_at)}
                                    </p>
                                  </div>

                                  <div className="shrink-0 text-right">
                                    <p className={`font-money text-base font-light tracking-[0.02em] sm:text-lg ${
                                      isDeposit ? 'text-primary-dark' : 'text-red-700'
                                    }`}>
                                      {isDeposit ? '+' : '−'}{fmt(amount)}
                                    </p>
                                    <p className="mt-0.5 font-money text-xs font-light text-taupe">
                                      Bal {fmt(parseAmount(tx.balance_after))}
                                    </p>
                                  </div>
                                </div>
                              </button>

                              {isExpanded && (
                                <div className="mt-2 flex flex-wrap gap-2 border-l-2 border-gold/40 pl-3">
                                  <button
                                    type="button"
                                    onClick={() => handleFilterToGoal(tx.goal_id)}
                                    className="rounded-lg border border-cream bg-cream/40 px-3 py-1.5 font-sans text-xs font-normal text-primary-dark transition-colors hover:bg-cream"
                                  >
                                    View this goal only
                                  </button>
                                  {goalFilter !== 'all' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGoalFilter('all');
                                        setPage(1);
                                      }}
                                      className="rounded-lg border border-cream bg-white px-3 py-1.5 font-sans text-xs font-normal text-taupe transition-colors hover:text-primary-dark"
                                    >
                                      Show all goals
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}
              </div>

              <Pagination
                pagination={pagination}
                onPageChange={setPage}
                onLimitChange={(nextLimit) => {
                  setLimit(nextLimit);
                  setPage(1);
                }}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default ActivityLedger;
