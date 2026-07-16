import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';

const parseAmount = (value) => {
  const amount = parseFloat(value);
  return Number.isFinite(amount) ? amount : 0;
};

const formatChartDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
};

const formatTooltipDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const LineGraphTooltip = ({ active, payload, goalName }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;

  return (
    <div className="rounded bg-primary-dark px-4 py-3 shadow-lg">
      {goalName && (
        <p className="font-sans text-xs font-bold text-gold">{goalName}</p>
      )}
      <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-cream/60">
        {formatTooltipDate(point.date)}
      </p>
      <p className={`mt-1 font-money text-xl font-bold ${
        point.type === 'deposit' ? 'text-gold' : 'text-red-400'
      }`}>
        {point.type === 'deposit' ? '+' : '−'}${parseAmount(point.amount).toFixed(2)}
      </p>
      <p className="mt-1 font-sans text-xs uppercase text-cream/80">{point.type}</p>
      {point.note && (
        <p className="mt-1 font-sans text-xs text-blue-200">{point.note}</p>
      )}
      <p className="mt-2 font-money text-xs text-cream/60">
        Balance: ${parseAmount(point.cumulative).toFixed(2)}
      </p>
    </div>
  );
};

const TransactionDot = ({ cx, cy, payload }) => {
  if (cx == null || cy == null) {
    return null;
  }

  const isDeposit = payload.type === 'deposit';

  return (
    <rect
      x={cx - 4}
      y={cy - 4}
      width={8}
      height={8}
      fill={isDeposit ? '#D4A574' : '#EF4444'}
      rx={isDeposit ? 1 : 4}
    />
  );
};

function GoalLineGraph({ goal, userId, refreshKey = 0, compact = false }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [yearChange, setYearChange] = useState(null);
  const [currentBalance, setCurrentBalance] = useState(parseAmount(goal.saved_amount));

  useEffect(() => {
    fetchChartData();
  }, [goal.goal_id, goal.saved_amount, userId, refreshKey]);

  const fetchChartData = async () => {
    setLoading(true);

    try {
      const response = await api.get(
        `/reports/goal-chart/${goal.goal_id}?userId=${userId}`
      );
      const points = (response.data.data_points || []).map((point) => ({
        date: point.date,
        displayDate: formatChartDate(point.date),
        cumulative: parseAmount(point.cumulative),
        amount: parseAmount(point.amount),
        type: point.type,
        note: point.note || '',
      }));

      setChartData(points);
      setCurrentBalance(parseAmount(response.data.current_balance));
      setYearChange(
        response.data.growth_percent !== null && response.data.growth_percent !== undefined
          ? parseAmount(response.data.growth_percent)
          : null
      );
    } catch (err) {
      console.error('Error fetching goal chart:', err);
      setChartData([]);
      setYearChange(null);
      setCurrentBalance(parseAmount(goal.saved_amount));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`rounded-lg border border-cream bg-cream/30 ${compact ? 'p-3' : 'p-5'} shadow-sm`}>
        <p className="font-sans text-sm text-taupe">Loading savings performance...</p>
      </div>
    );
  }

  return (
    <article className={`rounded-lg border border-cream bg-cream/40 shadow-sm ${compact ? 'p-3' : 'p-5'}`}>
      {!compact && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">
              Cumulative Savings Performance
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <p className="font-money text-3xl font-bold text-primary-dark">
                ${currentBalance.toFixed(2)}
              </p>
              {yearChange !== null && (
                <p className="font-sans text-sm text-taupe">
                  ({yearChange >= 0 ? '+' : ''}{yearChange.toFixed(1)}% growth)
                </p>
              )}
            </div>
            <p className="mt-1 font-serif text-lg font-bold text-primary-dark">{goal.name}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-gold" />
              <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">Deposits</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">Withdrawals</span>
            </div>
          </div>
        </div>
      )}

      {compact && (
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="font-money text-lg font-bold text-primary-dark">${currentBalance.toFixed(2)}</p>
          {yearChange !== null && (
            <p className="font-sans text-xs text-taupe">
              {yearChange >= 0 ? '+' : ''}{yearChange.toFixed(1)}%
            </p>
          )}
        </div>
      )}

      {chartData.length === 0 ? (
        <div className={`flex items-center justify-center rounded-lg border border-dashed border-cream bg-white/50 p-6 text-center ${compact ? 'min-h-[160px]' : 'min-h-[220px] p-8'}`}>
          <div>
            <p className="font-serif text-lg font-bold text-primary-dark">No transactions yet</p>
            <p className="mt-1 font-sans text-sm text-taupe">
              Record your first deposit to see savings growth over time.
            </p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={compact ? 180 : 240}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical stroke="#E8DFC8" horizontal={false} />
            <XAxis
              dataKey="displayDate"
              tick={{ fill: '#4E4B46', fontSize: compact ? 9 : 10, fontFamily: 'Montserrat, Helvetica, sans-serif' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip content={<LineGraphTooltip goalName={goal.name} />} />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#D4A574"
              strokeWidth={3}
              dot={(props) => <TransactionDot {...props} />}
              activeDot={{ r: 6, fill: '#D4A574', stroke: '#1A2340', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </article>
  );
}

export default GoalLineGraph;
