import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
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
import ProgressBar from '../components/ProgressBar';
import {
  HISTOGRAM_BAR_COLORS,
  TrendBarShape,
} from '../components/ExpenseHistogram';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const barColor = (index) => HISTOGRAM_BAR_COLORS[index % HISTOGRAM_BAR_COLORS.length];

const CategoryTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, expense_count, total_amount, color } = payload[0].payload;
  return (
    <div className="min-w-[160px] rounded-lg border border-cream/20 bg-primary-dark px-3.5 py-3 shadow-xl">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-sm"
          style={{ backgroundColor: color || '#D4B16D' }}
        />
        <p className="font-sans text-xs uppercase tracking-[0.12em] text-gold/80">{name}</p>
      </div>
      <p className="mt-1.5 font-money text-xl font-light text-white">
        {expense_count} expense{expense_count === 1 ? '' : 's'}
      </p>
      <p className="mt-1 font-sans text-xs text-cream/55">
        Total {formatMoney(total_amount, 'USD', '$')}
      </p>
    </div>
  );
};

const LineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[150px] rounded-lg border border-cream/20 bg-primary-dark px-3.5 py-3 shadow-xl">
      <p className="font-sans text-xs uppercase tracking-[0.12em] text-gold/80">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="mt-1.5 font-money text-sm font-light text-white">
          {entry.name}: {entry.value}
        </p>
      ))}
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

  const categoryData = useMemo(
    () =>
      (stats?.popular_expense_categories || []).slice(0, 8).map((row, index) => ({
        ...row,
        color: barColor(index),
      })),
    [stats]
  );

  const expenseTrend = useMemo(
    () =>
      (stats?.monthly_expense_totals || []).map((row, index) => ({
        ...row,
        color: barColor(index),
      })),
    [stats]
  );

  const signupTrend = useMemo(
    () => stats?.monthly_user_signups || [],
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

  const formatAxisMoney = (value) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
    return `$${value}`;
  };

  return (
    <div className="mb-10 space-y-5">
      <section className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Operations</p>
          <h2 className="page-title">Platform Overview</h2>
          <p className="page-lede">
            Aggregate usage across QUANT — registrations, savings activity, and spending patterns.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="stat-tile flex items-start justify-between gap-3 p-5">
            <div>
              <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                {card.label}
              </p>
              <p className="mt-2 font-money text-2xl font-light tracking-[0.02em] text-primary-dark sm:text-3xl">
                {card.value}
              </p>
            </div>
            <span className="rounded-xl bg-gold/15 p-2 text-gold">
              <Icon name={card.icon} className="text-xl" />
            </span>
          </div>
        ))}
      </section>

      {/* Monthly spend trend (histogram style) + signup line chart */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="surface p-5 md:p-6 lg:col-span-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="font-sans text-base font-normal tracking-[-0.01em] text-primary-dark md:text-lg">
              Monthly Spending Trend
            </h3>
            <p className="font-sans text-xs text-taupe">Last 12 months</p>
          </div>

          {expenseTrend.every((row) => !row.total) ? (
            <div className="flex min-h-[260px] items-center justify-center text-center">
              <p className="font-sans text-sm text-taupe">No platform expenses recorded yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={expenseTrend}
                margin={{ top: 12, right: 4, left: 0, bottom: 0 }}
                barCategoryGap="12%"
              >
                <CartesianGrid
                  strokeDasharray="3 6"
                  horizontal={false}
                  vertical
                  stroke="rgba(10, 15, 26, 0.08)"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#5C574F', fontSize: 11, fontFamily: 'Manrope, Helvetica, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  tickFormatter={formatAxisMoney}
                  tick={{ fill: '#5C574F', fontSize: 11, fontFamily: 'IBM Plex Mono, Consolas, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(212, 177, 109, 0.06)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload;
                    return (
                      <div className="min-w-[160px] rounded-lg border border-cream/20 bg-primary-dark px-3.5 py-3 shadow-xl">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: row.color || '#D4B16D' }}
                          />
                          <p className="font-sans text-xs uppercase tracking-[0.12em] text-gold/80">
                            {row.month}
                          </p>
                        </div>
                        <p className="mt-1.5 font-money text-xl font-light text-white">
                          {money(row.total)}
                        </p>
                        <p className="mt-1 font-sans text-xs text-cream/55">
                          {row.count} expense{row.count === 1 ? '' : 's'}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="total" shape={<TrendBarShape />} isAnimationActive animationDuration={700}>
                  {expenseTrend.map((entry) => (
                    <Cell key={entry.month_key || entry.month} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="surface p-5 md:p-6 lg:col-span-5">
          <div className="mb-5">
            <p className="eyebrow">Growth</p>
            <h3 className="mt-1 card-title">Member Signups</h3>
            <p className="mt-1 font-sans text-sm text-taupe">New registrations over the last 12 months</p>
          </div>

          {signupTrend.every((row) => !row.users) ? (
            <div className="flex min-h-[220px] items-center justify-center text-center">
              <p className="font-sans text-sm text-taupe">No signup activity yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={signupTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminSignupFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4B16D" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#D4B16D" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 6"
                  vertical={false}
                  stroke="rgba(10, 15, 26, 0.08)"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#5C574F', fontSize: 11, fontFamily: 'Manrope, Helvetica, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#5C574F', fontSize: 11, fontFamily: 'IBM Plex Mono, Consolas, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<LineTooltip />} />
                <Area
                  type="monotone"
                  dataKey="users"
                  name="Signups"
                  stroke="#D4B16D"
                  strokeWidth={2}
                  fill="url(#adminSignupFill)"
                  dot={{ r: 3, fill: '#0A0F1A', stroke: '#D4B16D', strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: '#D4B16D', stroke: '#0A0F1A', strokeWidth: 1 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Category histogram + ranked breakdown */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="surface p-5 md:p-6 lg:col-span-7">
          <div className="mb-5">
            <h3 className="font-sans text-base font-normal tracking-[-0.01em] text-primary-dark md:text-lg">
              Popular Expense Categories
            </h3>
            <p className="mt-1 font-sans text-sm text-taupe">
              Platform-wide by number of expense entries
            </p>
          </div>

          {categoryData.length === 0 ? (
            <p className="py-10 text-center font-sans text-sm text-taupe">No expenses recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={categoryData}
                margin={{ top: 12, right: 8, left: 0, bottom: 40 }}
                barCategoryGap="18%"
              >
                <CartesianGrid
                  strokeDasharray="3 6"
                  horizontal={false}
                  vertical
                  stroke="rgba(10, 15, 26, 0.08)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#5C574F', fontSize: 10, fontFamily: 'Manrope, Helvetica, sans-serif' }}
                  angle={-28}
                  textAnchor="end"
                  height={56}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#5C574F', fontSize: 11, fontFamily: 'IBM Plex Mono, Consolas, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(212, 177, 109, 0.06)' }}
                  content={<CategoryTooltip />}
                />
                <Bar dataKey="expense_count" shape={<TrendBarShape />}>
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="surface overflow-hidden lg:col-span-5">
          <div className="border-b border-primary-dark/[0.06] px-5 py-4">
            <p className="eyebrow">Ranked</p>
            <h3 className="mt-1 card-title">Category Breakdown</h3>
          </div>

          {categoryData.length === 0 ? (
            <p className="px-5 py-10 text-center font-sans text-sm text-taupe">
              No category data available.
            </p>
          ) : (
            <div className="max-h-[360px] space-y-5 overflow-y-auto px-5 py-5">
              {categoryData.map((category, index) => {
                const maxCount = categoryData[0]?.expense_count || 1;
                const widthPct = Math.max(8, (category.expense_count / maxCount) * 100);
                const color = category.color || barColor(index);

                return (
                  <div key={category.name}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate font-sans text-sm font-normal text-primary-dark">
                        <span className="mr-2 text-taupe">{index + 1}.</span>
                        {category.name}
                      </p>
                      <p className="shrink-0 font-money text-xs font-light text-taupe">
                        {category.expense_count} · {money(category.total_amount)}
                      </p>
                    </div>
                    <ProgressBar
                      value={widthPct}
                      size="md"
                      rounded="rounded"
                      trackClassName="bg-primary-dark/10"
                      fillClassName=""
                      fillStyle={{ backgroundColor: color }}
                    />
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
