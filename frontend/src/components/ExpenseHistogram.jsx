import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import api from '../services/api';
import { formatMoney } from '../utils/currency';
import { getFriendlyError } from '../utils/friendlyError';
import ErrorBanner from './ErrorBanner';

const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

const parseAmount = (value) => {
  const amount = parseFloat(value);
  return Number.isFinite(amount) ? amount : 0;
};

function ExpenseHistogram({
  userId,
  refreshTrigger = 0,
  currencyCode = 'USD',
  currencySymbol = '$',
}) {
  const fmt = (value) => formatMoney(value, currencyCode, currencySymbol);

  const formatAxisAmount = (value) => {
    if (value >= 1000) {
      return `${currencySymbol}${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
    }
    return fmt(value);
  };

  const HistogramTooltip = ({ active, payload, totalSpent }) => {
    if (!active || !payload?.length) {
      return null;
    }

    const { category, total, count, color } = payload[0].payload;
    const share = totalSpent > 0 ? (total / totalSpent) * 100 : 0;
    const avg = count > 0 ? total / count : 0;

    return (
      <div className="min-w-[190px] rounded-lg border border-cream/20 bg-primary-dark px-4 py-3 shadow-xl">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: color || '#D4A574' }}
          />
          <p className="truncate font-sans text-sm font-normal text-gold">{category}</p>
        </div>

        <p className="mt-3 font-money text-2xl font-light tracking-[0.02em] text-white">{fmt(total)}</p>
        <p className="mt-0.5 font-sans text-xs font-normal uppercase tracking-[0.12em] text-cream/60">
          Total spent
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-cream/15 pt-2">
          <div>
            <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-cream/60">
              Share
            </p>
            <p className="mt-0.5 font-money text-sm font-light text-cream">
              {share.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-cream/60">
              Transactions
            </p>
            <p className="mt-0.5 font-money text-sm font-light text-cream">{count}</p>
          </div>
        </div>

        <p className="mt-2 font-sans text-xs text-blue-200">
          Avg {fmt(avg)} per transaction
        </p>
      </div>
    );
  };

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(undefined);

  const fetchExpenseData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(
        `/reports/expense-chart?userId=${userId}&month=${selectedMonth}&year=${selectedYear}`
      );
      setData(response.data);
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t load expense distribution. Please try again.'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchExpenseData();
  }, [fetchExpenseData, refreshTrigger]);

  const totalSpent = parseAmount(data?.total_spent);
  const monthChange = parseAmount(data?.month_over_month_change_percent);

  const chartData = (data?.categories || []).map((cat) => ({
    category: cat.category_name || 'Uncategorized',
    total: parseAmount(cat.total_spent),
    count: parseInt(cat.transaction_count, 10) || 0,
    color: cat.category_colour || cat.category_color || '#D4A574',
  }));

  const totalTransactions = chartData.reduce((sum, cat) => sum + cat.count, 0);
  const avgPerTransaction = totalTransactions > 0 ? totalSpent / totalTransactions : 0;

  const topCategory = data?.top_category
    ? {
        category: data.top_category.category_name,
        total: parseAmount(data.top_category.total_spent),
        count: parseInt(data.top_category.transaction_count, 10) || 0,
        color: data.top_category.category_colour || '#D4A574',
      }
    : null;

  const yearOptions = [selectedYear - 1, selectedYear, selectedYear + 1];

  if (loading) {
    return (
      <section className="surface p-6">
        <p className="font-sans text-sm text-taupe">Loading expense distribution...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="surface p-6">
        <ErrorBanner message={error} />
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-serif text-2xl font-light tracking-[-0.02em] text-primary-dark md:text-3xl">
            Expense Distribution
          </h3>
          <p className="mt-1 font-sans text-sm text-taupe">
            Real-time category mapping for your spending patterns
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-sans text-xs font-medium uppercase tracking-[0.12em] text-taupe">
            Filter By Period
          </label>
          <select
            value={`${selectedYear}-${selectedMonth}`}
            onChange={(e) => {
              const [year, month] = e.target.value.split('-').map(Number);
              setSelectedYear(year);
              setSelectedMonth(month);
            }}
            className="rounded-lg border-2 border-gray-200 bg-white px-3 py-2 font-sans text-sm focus:border-gold focus:outline-none"
          >
            {yearOptions.map(year =>
              MONTHS.map((month, idx) => (
                <option key={`${year}-${idx + 1}`} value={`${year}-${idx + 1}`}>
                  {month} {year}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="surface p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-serif text-lg font-light tracking-[-0.015em] text-primary-dark">Category Histogram</h4>
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
            Bar height = total spent
          </p>
        </div>

        {chartData.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-cream bg-white/50 p-10 text-center">
            <div>
              <p className="font-serif text-xl font-light tracking-[-0.015em] text-primary-dark">No expenses logged</p>
              <p className="mt-2 font-sans text-sm text-taupe">
                No expenses for {MONTHS[selectedMonth - 1]} {selectedYear}. Click Log Expense to start tracking.
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              onMouseMove={(state) => {
                if (state?.isTooltipActive && state.activeCoordinate) {
                  setTooltipPos({
                    x: state.activeCoordinate.x,
                    y: state.activeCoordinate.y + 18,
                  });
                  return;
                }
                setTooltipPos(undefined);
              }}
              onMouseLeave={() => setTooltipPos(undefined)}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFC8" />
              <XAxis
                dataKey="category"
                tick={{ fill: '#4E4B46', fontSize: 11, fontFamily: 'Manrope, Helvetica, sans-serif' }}
                axisLine={{ stroke: '#E8DFC8' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatAxisAmount}
                tick={{ fill: '#4E4B46', fontSize: 11, fontFamily: 'IBM Plex Mono, Consolas, monospace' }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                shared={false}
                allowEscapeViewBox={{ x: true, y: true }}
                position={tooltipPos}
                cursor={{ fill: 'rgba(26, 35, 64, 0.06)' }}
                content={({ active, payload }) => (
                  <HistogramTooltip active={active} payload={payload} totalSpent={totalSpent} />
                )}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={56}>
                {chartData.map((entry) => (
                  <Cell key={entry.category} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-cream bg-white p-5 shadow-sm">
            <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
              Monthly Snapshot
            </p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="font-sans text-xs text-taupe">Total Spend</p>
                <p className="font-money text-2xl font-light tracking-[0.02em] text-primary-dark">{fmt(totalSpent)}</p>
              </div>
              <div className="text-right">
                <p className="font-sans text-xs text-taupe">Transactions</p>
                <p className="font-money text-lg font-light tracking-[0.02em] text-primary-dark">{totalTransactions}</p>
              </div>
            </div>
            <p className="mt-3 font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
              Avg {fmt(avgPerTransaction)} per entry
            </p>
          </div>

          <div className="rounded-lg border border-cream bg-white p-5 shadow-sm">
            <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
              Vs Last Month
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                monthChange >= 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
              }`}>
                <span className="material-symbols-outlined text-xl">
                  {monthChange >= 0 ? 'trending_up' : 'trending_down'}
                </span>
              </span>
              <div>
                <p className={`font-money text-2xl font-light tracking-[0.02em] ${
                  monthChange >= 0 ? 'text-red-700' : 'text-green-700'
                }`}>
                  {monthChange >= 0 ? '+' : ''}{monthChange.toFixed(1)}%
                </p>
                <p className="font-sans text-xs text-taupe">
                  {monthChange >= 0 ? 'increase' : 'decrease'} vs {MONTHS[(selectedMonth === 1 ? 12 : selectedMonth) - 1]}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-cream bg-white p-5 shadow-sm">
            <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
              Top Category
            </p>
            {topCategory && (
              <div className="mt-3 flex items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: topCategory.color }}
                />
                <div>
                  <p className="font-serif text-lg font-light tracking-[-0.015em] text-primary-dark">{topCategory.category}</p>
                  <p className="font-sans text-xs text-taupe">
                    {fmt(topCategory.total)} · {topCategory.count} transactions
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default ExpenseHistogram;
