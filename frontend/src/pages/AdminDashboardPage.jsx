import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../services/api';
import { formatMoney } from '../utils/currency';
import { getFriendlyError } from '../utils/friendlyError';
import ErrorBanner from '../components/ErrorBanner';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const CATEGORY_COLORS = [
  '#243054',
  '#D4A574',
  '#E8C77A',
  '#4E4B46',
  '#1A2340',
  '#6B7280',
  '#9CA3AF',
  '#C4B5A0',
];

const CategoryTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const { name, expense_count, total_amount } = payload[0].payload;

  return (
    <div className="rounded bg-primary-dark px-4 py-3 shadow-lg">
      <p className="font-sans text-[10px] font-normal uppercase tracking-[0.14em] text-gold">
        {name}
      </p>
      <p className="mt-1 font-money text-2xl font-light tracking-[0.02em] text-white">
        {expense_count} expense{expense_count === 1 ? '' : 's'}
      </p>
      <p className="mt-1 font-money text-xs text-blue-200">
        Total: {formatMoney(total_amount, 'USD', '$')}
      </p>
    </div>
  );
};

function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t load platform statistics. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const chartData = useMemo(
    () => (stats?.popular_expense_categories || []).slice(0, 8),
    [stats]
  );

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={error || 'Statistics are unavailable right now.'} />
        <button type="button" onClick={fetchStats} className="btn-navy">
          Try again
        </button>
      </div>
    );
  }

  const money = (value) => formatMoney(value, 'USD', '$');
  const formatCount = (value) => Number(value || 0).toLocaleString();

  const summaryCards = [
    { label: 'Total Users', value: formatCount(stats.total_users), icon: 'groups' },
    { label: 'Total Goals', value: formatCount(stats.total_goals), icon: 'flag' },
    { label: 'Total Transactions', value: formatCount(stats.total_transactions), icon: 'swap_horiz' },
    { label: 'Total Savings', value: money(stats.total_savings), icon: 'savings' },
    { label: 'New Users This Month', value: formatCount(stats.new_users_this_month), icon: 'person_add' },
    { label: 'Avg Monthly Budget', value: money(stats.average_monthly_budget), icon: 'account_balance_wallet' },
  ];

  return (
    <div className="space-y-8">
      <section>
        <p className="font-sans text-[10px] font-normal uppercase tracking-[0.14em] text-gold">
          Admin Console
        </p>
        <h2 className="mt-2 font-serif text-4xl font-normal tracking-[-0.03em] text-primary-dark md:text-5xl">
          Platform Overview
        </h2>
        <p className="mt-3 max-w-2xl font-sans text-base text-taupe">
          Aggregate usage across all QUANT members — registrations, savings activity, and spending patterns.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-cream bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-sans text-[10px] font-normal uppercase tracking-[0.14em] text-taupe">
                  {card.label}
                </p>
                <p className="mt-2 font-money text-3xl font-light tracking-[0.02em] text-primary-dark">
                  {card.value}
                </p>
              </div>
              <span className="rounded-full bg-cream/60 p-2 text-gold">
                <Icon name={card.icon} className="text-xl" />
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-cream bg-white shadow-sm">
          <div className="border-b border-cream px-5 py-4">
            <h3 className="font-serif text-2xl font-light tracking-[-0.02em] text-primary-dark">
              Popular Expense Categories
            </h3>
            <p className="mt-1 font-sans text-sm text-taupe">
              Platform-wide by number of expense entries
            </p>
          </div>

          {chartData.length === 0 ? (
            <p className="px-5 py-10 text-center font-sans text-sm text-taupe">
              No expenses recorded yet.
            </p>
          ) : (
            <div className="h-80 px-2 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#4E4B46', fontSize: 11, fontFamily: 'Manrope, Helvetica, sans-serif' }}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#4E4B46', fontSize: 11, fontFamily: 'IBM Plex Mono, Consolas, monospace' }}
                  />
                  <Tooltip content={<CategoryTooltip />} />
                  <Bar dataKey="expense_count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-cream bg-white shadow-sm">
          <div className="border-b border-cream px-5 py-4">
            <h3 className="font-serif text-2xl font-light tracking-[-0.02em] text-primary-dark">
              Category Breakdown
            </h3>
            <p className="mt-1 font-sans text-sm text-taupe">
              Ranked by expense volume across all users
            </p>
          </div>

          {chartData.length === 0 ? (
            <p className="px-5 py-10 text-center font-sans text-sm text-taupe">
              No category data available.
            </p>
          ) : (
            <div className="divide-y divide-cream/70">
              {chartData.map((category, index) => {
                const maxCount = chartData[0]?.expense_count || 1;
                const widthPct = Math.max(8, (category.expense_count / maxCount) * 100);

                return (
                  <div key={category.name} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-sans text-xs font-medium text-taupe">
                          {index + 1}
                        </span>
                        <p className="font-sans text-sm font-normal text-primary-dark">
                          {category.name}
                        </p>
                      </div>
                      <p className="font-sans text-sm text-taupe">
                        {category.expense_count} entries · {money(category.total_amount)}
                      </p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default AdminDashboardPage;
