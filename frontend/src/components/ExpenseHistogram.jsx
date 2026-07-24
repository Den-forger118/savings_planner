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

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Distinct QUANT palette — one colour per bar, cycling */
export const HISTOGRAM_BAR_COLORS = [
  '#D4B16D',
  '#0A0F1A',
  '#E8C77A',
  '#243054',
  '#8B7355',
  '#1A2340',
  '#C9A227',
  '#4E4B46',
  '#D4A574',
  '#2C3E6B',
  '#B8956A',
  '#162033',
];

const parseAmount = (value) => {
  const amount = parseFloat(value);
  return Number.isFinite(amount) ? amount : 0;
};

/** Soft gradient bar with solid top rim — colour comes from Cell fill */
export function TrendBarShape(props) {
  const { x, y, width, height, fill, index } = props;
  if (!height || height <= 0 || !width) return null;

  const color = fill || HISTOGRAM_BAR_COLORS[index % HISTOGRAM_BAR_COLORS.length];
  const rim = Math.min(2.5, height);
  const gradId = `spendTrendFill-${index}-${String(color).replace('#', '')}`;

  return (
    <g>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.7} />
          <stop offset="45%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0.04} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={width} height={height} fill={`url(#${gradId})`} />
      <rect x={x} y={y} width={width} height={rim} fill={color} />
    </g>
  );
}

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

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [monthlyTotals, setMonthlyTotals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const fetchYearTrend = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const responses = await Promise.all(
        MONTH_SHORT.map((_, index) =>
          api.get(
            `/reports/expense-chart?userId=${userId}&month=${index + 1}&year=${selectedYear}`
          )
        )
      );

      setMonthlyTotals(
        responses.map((response, index) => ({
          month: MONTH_SHORT[index],
          total: parseAmount(response.data?.total_spent),
          count: Number.parseInt(response.data?.expense_count, 10) || 0,
          color: HISTOGRAM_BAR_COLORS[index % HISTOGRAM_BAR_COLORS.length],
        }))
      );
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t load spending trends. Please try again.'));
      setMonthlyTotals([]);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedYear]);

  useEffect(() => {
    fetchYearTrend();
  }, [fetchYearTrend, refreshTrigger]);

  const yearTotal = monthlyTotals.reduce((sum, row) => sum + row.total, 0);
  const hasData = monthlyTotals.some((row) => row.total > 0);

  const TrendTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { month, total, count, color } = payload[0].payload;
    return (
      <div className="min-w-[160px] rounded-lg border border-cream/20 bg-primary-dark px-3.5 py-3 shadow-xl">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: color || '#D4B16D' }}
          />
          <p className="font-sans text-xs uppercase tracking-[0.12em] text-gold/80">
            {month} {selectedYear}
          </p>
        </div>
        <p className="mt-1.5 font-money text-xl font-light text-white">{fmt(total)}</p>
        <p className="mt-1 font-sans text-xs text-cream/55">
          {count} expense{count === 1 ? '' : 's'}
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <section className="surface p-5 md:p-6">
        <p className="font-sans text-sm text-taupe">Loading spending trend...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="surface p-5 md:p-6">
        <ErrorBanner message={error} />
      </section>
    );
  }

  return (
    <section className="surface p-5 md:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="font-sans text-base font-normal tracking-[-0.01em] text-primary-dark md:text-lg">
          Monthly Spending Trend
        </h3>
        <label className="relative inline-flex items-center">
          <span className="sr-only">Select year</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="appearance-none rounded-lg border border-primary-dark/12 bg-white py-1.5 pl-3.5 pr-8 font-sans text-sm text-primary-dark shadow-sm transition-colors focus:border-gold focus:outline-none"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 text-taupe" aria-hidden="true">
            ▾
          </span>
        </label>
      </div>

      {!hasData ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed border-cream bg-white/50 p-8 text-center">
          <div>
            <p className="font-serif text-xl font-light text-primary-dark">No spending yet</p>
            <p className="mt-2 font-sans text-sm text-taupe">
              Log expenses in {selectedYear} to see your monthly trend.
            </p>
          </div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={monthlyTotals}
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
                tick={{
                  fill: '#5C574F',
                  fontSize: 11,
                  fontFamily: 'Manrope, Helvetica, sans-serif',
                }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tickFormatter={formatAxisAmount}
                tick={{
                  fill: '#5C574F',
                  fontSize: 11,
                  fontFamily: 'IBM Plex Mono, Consolas, monospace',
                }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip
                cursor={{ fill: 'rgba(212, 177, 109, 0.06)' }}
                content={<TrendTooltip />}
              />
              <Bar
                dataKey="total"
                shape={<TrendBarShape />}
                isAnimationActive
                animationDuration={700}
              >
                {monthlyTotals.map((entry) => (
                  <Cell key={entry.month} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <p className="mt-3 font-sans text-xs text-taupe">
            {selectedYear} total ·{' '}
            <span className="font-money text-primary-dark">{fmt(yearTotal)}</span>
          </p>
        </>
      )}
    </section>
  );
}

export default ExpenseHistogram;
