import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from './Pagination';
import { formatMoney } from '../utils/currency';

const parseAmount = (value) => parseFloat(value) || 0;

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const TypeBadge = ({ type }) => (
  <span className={`rounded-full px-2.5 py-0.5 font-sans text-[10px] font-bold uppercase ${
    type === 'deposit' ? 'bg-primary-dark text-cream' : 'bg-red-100 text-red-800'
  }`}>
    {type}
  </span>
);

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
  const [goalFilter, setGoalFilter] = useState(initialGoalFilter);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  useEffect(() => {
    setGoalFilter(initialGoalFilter);
    setPage(1);
  }, [initialGoalFilter]);

  useEffect(() => {
    fetchLedger();
  }, [userId, goalFilter, refreshKey, page, limit, search]);

  const fetchLedger = async () => {
    setLoading(true);

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
    } catch (err) {
      console.error('Error fetching activity ledger:', err);
      setTransactions([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleExport = async () => {
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

      if (allRows.length === 0) {
        return;
      }

      const headers = ['Date', 'Goal', 'Description', 'Amount', 'Type', 'Balance'];
      const rows = allRows.map((tx) => {
        const amount = parseAmount(tx.amount);
        const signed = tx.type === 'deposit' ? amount : -amount;

        return [
          formatDate(tx.created_at),
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
      console.error('Error exporting ledger:', err);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="font-sans text-xs font-bold uppercase tracking-widest text-gold">
          Activity
        </p>
        <h2 className="mt-2 font-serif text-4xl font-bold text-primary-dark md:text-5xl">
          Savings Ledger
        </h2>
        <p className="mt-3 max-w-2xl font-sans text-base text-taupe">
          Full transaction history across all your goals. Filter by goal, search notes, or export your ledger.
        </p>
      </section>

      <section className="rounded-lg border border-cream bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-cream px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={goalFilter}
              onChange={(e) => {
                setGoalFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-cream bg-white px-3 py-2 font-sans text-sm focus:border-gold focus:outline-none"
            >
              <option value="all">All goals</option>
              {goals.map((goal) => (
                <option key={goal.goal_id} value={goal.goal_id}>
                  {goal.name}
                </option>
              ))}
            </select>

            <form onSubmit={handleSearchSubmit} className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-lg text-taupe">
                search
              </span>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search notes or goals..."
                className="rounded-lg border border-cream py-2 pl-9 pr-3 font-sans text-sm focus:border-gold focus:outline-none"
              />
            </form>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={!pagination?.total_count}
            className="rounded-lg border-2 border-primary-dark px-4 py-2 font-sans text-xs font-bold uppercase tracking-widest text-primary-dark transition-colors hover:bg-primary-dark hover:text-cream disabled:opacity-40"
          >
            Export Ledger
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-10">
            <p className="font-sans text-sm text-taupe">Loading ledger...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="font-serif text-xl font-bold text-primary-dark">No activity found</p>
            <p className="mt-2 font-sans text-sm text-taupe">
              {search || goalFilter !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Record a deposit on any savings goal to build your ledger.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-cream bg-cream/30">
                    {['Date', 'Description', 'Amount', 'Type', 'Balance'].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-3 font-sans text-[10px] font-bold uppercase tracking-widest text-taupe/70"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const isDeposit = tx.type === 'deposit';
                    const amount = parseAmount(tx.amount);
                    const description = tx.note?.trim()
                      ? `${tx.goal_name}: ${tx.note}`
                      : tx.goal_name;

                    return (
                      <tr key={tx.transaction_id} className="border-b border-cream/60 last:border-0">
                        <td className="px-5 py-3 font-sans text-sm text-taupe">
                          {formatDate(tx.created_at)}
                        </td>
                        <td className="px-5 py-3 font-sans text-sm font-semibold text-primary-dark">
                          {description}
                        </td>
                        <td className={`px-5 py-3 font-money text-sm font-bold ${
                          isDeposit ? 'text-primary-dark' : 'text-red-700'
                        }`}>
                          {isDeposit ? '+' : '−'}{fmt(amount)}
                        </td>
                        <td className="px-5 py-3">
                          <TypeBadge type={tx.type} />
                        </td>
                        <td className="px-5 py-3 font-money text-sm text-primary-dark">
                          {fmt(parseAmount(tx.balance_after))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
      </section>
    </div>
  );
}

export default ActivityLedger;
