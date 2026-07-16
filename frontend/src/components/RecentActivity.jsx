import { useState, useEffect } from 'react';
import api from '../services/api';
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
  <span className={`rounded-full px-2 py-0.5 font-sans text-[10px] font-bold uppercase ${
    type === 'deposit' ? 'bg-primary-dark text-cream' : 'bg-red-100 text-red-800'
  }`}>
    {type}
  </span>
);

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

  useEffect(() => {
    fetchRecent();
  }, [userId, refreshKey, limit]);

  const fetchRecent = async () => {
    setLoading(true);

    try {
      const response = await api.get(
        `/transactions?userId=${userId}&page=1&limit=${limit}`
      );
      setTransactions(response.data.transactions || []);
      setTotalCount(response.data.pagination?.total_count || 0);
    } catch (err) {
      console.error('Error fetching recent activity:', err);
      setTransactions([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-lg border border-cream bg-white p-6 shadow-sm">
        <p className="font-sans text-sm text-taupe">Loading recent activity...</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-cream bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-cream px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-sans text-xs font-bold uppercase tracking-widest text-gold">
            Savings Activity
          </p>
          <h3 className="font-serif text-xl font-bold text-primary-dark">Recent Activity</h3>
        </div>
        {totalCount > 0 && onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="font-sans text-sm font-semibold text-gold hover:underline"
          >
            View all {totalCount} →
          </button>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="font-serif text-lg font-bold text-primary-dark">No transactions yet</p>
          <p className="mt-1 font-sans text-sm text-taupe">
            Record a deposit on any savings goal to see activity here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-cream bg-cream/30">
                {['Date', 'Goal', 'Amount', 'Type', 'Balance'].map((heading) => (
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

                return (
                  <tr key={tx.transaction_id} className="border-b border-cream/60 last:border-0">
                    <td className="px-5 py-3 font-sans text-sm text-taupe">
                      {formatDate(tx.created_at)}
                    </td>
                    <td className="px-5 py-3 font-sans text-sm font-semibold text-primary-dark">
                      {tx.goal_name || 'Goal'}
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
      )}
    </section>
  );
}

export default RecentActivity;
