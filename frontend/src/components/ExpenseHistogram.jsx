import { useState, useEffect } from 'react';
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
  monthlyBudget,
  isEarnerMode = false,
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

  const HistogramTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) {
      return null;
    }

    const { category, total, count } = payload[0].payload;

    return (
      <div className="rounded bg-primary-dark px-4 py-3 shadow-lg">
        <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-gold">
          {category} Category
        </p>
        <p className="mt-1 font-money text-2xl font-bold text-white">
          {fmt(total)}
        </p>
        <p className="mt-1 font-sans text-xs text-blue-200">
          Transactions: {count}
        </p>
      </div>
    );
  };

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenseData();
  }, [userId, selectedMonth, selectedYear, refreshTrigger]);

  const fetchExpenseData = async () => {
    setLoading(true);

    try {
      const response = await api.get(
        `/reports/expense-chart?userId=${userId}&month=${selectedMonth}&year=${selectedYear}`
      );
      setData(response.data);
    } catch (err) {
      console.error('Error fetching expense histogram:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = parseAmount(data?.total_spent);
  const budget = parseAmount(data?.monthly_budget ?? monthlyBudget);
  const hasBudget = isEarnerMode && budget > 0;
  const utilization = parseAmount(data?.budget_utilization) || (hasBudget ? (totalSpent / budget) * 100 : 0);
  const remaining = parseAmount(data?.budget_remaining) || (hasBudget ? Math.max(0, budget - totalSpent) : 0);
  const monthChange = parseAmount(data?.month_over_month_change_percent);

  const chartData = (data?.categories || []).map((cat) => ({
    category: cat.category_name || 'Uncategorized',
    total: parseAmount(cat.total_spent),
    count: parseInt(cat.transaction_count, 10) || 0,
    color: cat.category_colour || cat.category_color || '#D4A574',
  }));

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
      <section className="rounded-lg border border-cream bg-cream/30 p-6 shadow-sm">
        <p className="font-sans text-sm text-taupe">Loading expense distribution...</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-serif text-2xl font-bold text-primary-dark md:text-3xl">
            Expense Distribution
          </h3>
          <p className="mt-1 font-sans text-sm text-taupe">
            Real-time category mapping for your spending patterns
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-sans text-xs font-semibold uppercase tracking-widest text-taupe">
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

      <div className="rounded-lg border border-cream bg-cream/40 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-serif text-lg font-bold text-primary-dark">Category Histogram</h4>
          <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-taupe/70">
            Bar height = total spent
          </p>
        </div>

        {chartData.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-cream bg-white/50 p-10 text-center">
            <div>
              <p className="font-serif text-xl font-bold text-primary-dark">No expenses logged</p>
              <p className="mt-2 font-sans text-sm text-taupe">
                No expenses for {MONTHS[selectedMonth - 1]} {selectedYear}. Click Log Expense to start tracking.
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFC8" />
              <XAxis
                dataKey="category"
                tick={{ fill: '#4E4B46', fontSize: 11, fontFamily: 'Montserrat, Helvetica, sans-serif' }}
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
              <Tooltip content={<HistogramTooltip />} cursor={{ fill: 'rgba(26, 35, 64, 0.06)' }} />
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
            <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">
              Monthly Snapshot
            </p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="font-sans text-xs text-taupe">Total Spend</p>
                <p className="font-money text-2xl font-bold text-primary-dark">{fmt(totalSpent)}</p>
              </div>
              {hasBudget && (
                <div className="text-right">
                  <p className="font-sans text-xs text-taupe">Budget Cap</p>
                  <p className="font-money text-lg font-bold text-primary-dark">{fmt(budget)}</p>
                </div>
              )}
            </div>
            {hasBudget && (
              <>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream">
                  <div
                    className="h-full rounded-full bg-primary-dark transition-all duration-500"
                    style={{ width: `${Math.min(100, utilization)}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">
                  <span>{utilization.toFixed(0)}% utilized</span>
                  <span>{fmt(remaining)} remaining</span>
                </div>
              </>
            )}
          </div>

          <div className="rounded-lg border border-cream bg-white p-5 shadow-sm">
            <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">
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
                <p className={`font-money text-2xl font-bold ${
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
            <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">
              Top Category
            </p>
            {topCategory && (
              <div className="mt-3 flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: topCategory.color }}
                >
                  <span className="material-symbols-outlined text-xl text-white">shopping_bag</span>
                </span>
                <div>
                  <p className="font-serif text-lg font-bold text-primary-dark">{topCategory.category}</p>
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
