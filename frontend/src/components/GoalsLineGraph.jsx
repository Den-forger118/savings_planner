import { useState, useEffect, useMemo } from 'react';
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

const mergeGoalSeries = (goals, mode) => {
  const events = [];

  goals.forEach((goal) => {
    (goal.data_points || []).forEach((point) => {
      events.push({
        timestamp: new Date(point.date).getTime(),
        date: point.date,
        goalId: goal.goal_id,
        cumulative: parseAmount(point.cumulative),
        percentage: parseAmount(point.percentage_complete),
        amount: parseAmount(point.amount),
        type: point.type,
        note: point.note || '',
      });
    });
  });

  if (events.length === 0) {
    return [];
  }

  events.sort((a, b) => a.timestamp - b.timestamp);

  const state = {};

  return events.map((event) => {
    state[event.goalId] = {
      cumulative: event.cumulative,
      percentage: event.percentage,
      amount: event.amount,
      type: event.type,
      note: event.note,
      date: event.date,
    };

    const row = {
      date: event.date,
      displayDate: formatChartDate(event.date),
      timestamp: event.timestamp,
    };

    goals.forEach((goal) => {
      const valueKey = `g_${goal.goal_id}`;
      const metaKey = `meta_${goal.goal_id}`;
      const current = state[goal.goal_id];

      if (current) {
        row[valueKey] = mode === 'percent' ? current.percentage : current.cumulative;
        if (event.goalId === goal.goal_id) {
          row[metaKey] = { ...current, goal_name: goal.goal_name };
        }
      }
    });

    return row;
  });
};

const CombinedTooltip = ({ active, payload, label, goals, mode, chartRow }) => {
  if (!active || !chartRow) {
    return null;
  }

  const entries = goals
    .map((goal) => {
      const meta = chartRow[`meta_${goal.goal_id}`];
      if (!meta) {
        return null;
      }

      return { goal, meta };
    })
    .filter(Boolean);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="max-w-xs rounded bg-primary-dark px-4 py-3 shadow-lg">
      <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-cream/50">
        {formatTooltipDate(label || entries[0].meta.date)}
      </p>
      <div className="mt-2 space-y-2">
        {entries.map(({ goal, meta }) => (
          <div key={goal.goal_id} className="border-t border-cream/10 pt-2 first:border-0 first:pt-0">
            <p className="font-sans text-xs font-bold text-gold">{goal.goal_name}</p>
            <p className={`font-money text-lg font-bold ${meta.type === 'deposit' ? 'text-cream' : 'text-red-400'}`}>
              {meta.type === 'deposit' ? '+' : '−'}${meta.amount.toFixed(2)}
              <span className="ml-2 font-sans text-xs text-cream/60">{meta.type}</span>
            </p>
            {meta.note && (
              <p className="font-sans text-xs text-blue-200">{meta.note}</p>
            )}
            <p className="font-money text-xs text-cream/60">
              {mode === 'percent'
                ? `${meta.percentage.toFixed(1)}% complete`
                : `Balance: $${meta.cumulative.toFixed(2)}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

function GoalsLineGraph({ userId, goals: liveGoals, refreshKey = 0 }) {
  const [chartGoals, setChartGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('percent');
  const [filter, setFilter] = useState('active');
  const [hiddenGoalIds, setHiddenGoalIds] = useState(new Set());
  const [focusedGoalId, setFocusedGoalId] = useState(null);

  const refreshToken = liveGoals.map((g) => g.saved_amount).join('-');

  useEffect(() => {
    fetchChartData();
  }, [userId, refreshKey, refreshToken]);

  const fetchChartData = async () => {
    setLoading(true);

    try {
      const response = await api.get(`/reports/goal-chart?userId=${userId}`);
      setChartGoals(response.data.goals || []);
    } catch (err) {
      console.error('Error fetching combined goal chart:', err);
      setChartGoals([]);
    } finally {
      setLoading(false);
    }
  };

  const activeGoals = useMemo(
    () => chartGoals.filter((goal) => goal.has_activity),
    [chartGoals]
  );

  const visibleGoals = useMemo(() => {
    let list = chartGoals;

    if (filter === 'active') {
      list = activeGoals;
    } else if (filter !== 'all') {
      list = chartGoals.filter((g) => g.goal_id === Number.parseInt(filter, 10));
    }

    if (focusedGoalId) {
      list = list.filter((g) => g.goal_id === focusedGoalId);
    }

    return list.filter((g) => !hiddenGoalIds.has(g.goal_id));
  }, [chartGoals, activeGoals, filter, focusedGoalId, hiddenGoalIds]);

  const chartData = useMemo(
    () => mergeGoalSeries(visibleGoals, mode),
    [visibleGoals, mode]
  );

  const toggleGoalVisibility = (goalId) => {
    setHiddenGoalIds((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
    setFocusedGoalId(null);
  };

  const handleLegendClick = (goalId) => {
    if (focusedGoalId === goalId) {
      setFocusedGoalId(null);
      setHiddenGoalIds(new Set());
      return;
    }

    setFocusedGoalId(goalId);
    setHiddenGoalIds(new Set());
  };

  useEffect(() => {
    if (chartGoals.length === 0) {
      return;
    }

    const hidden = new Set();
    chartGoals.forEach((goal) => {
      if (!goal.has_activity) {
        hidden.add(goal.goal_id);
      }
    });

    const sortedActive = [...activeGoals].sort(
      (a, b) => parseAmount(b.current_balance) - parseAmount(a.current_balance)
    );
    sortedActive.slice(4).forEach((goal) => hidden.add(goal.goal_id));

    setHiddenGoalIds(hidden);
    setFocusedGoalId(null);
  }, [chartGoals, refreshToken]);

  if (loading) {
    return (
      <div className="rounded-lg border border-cream bg-cream/30 p-6 shadow-sm">
        <p className="font-sans text-sm text-taupe">Loading savings performance...</p>
      </div>
    );
  }

  const hasAnyActivity = activeGoals.length > 0;

  return (
    <article className="rounded-lg border border-cream bg-cream/40 p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">
            Cumulative Savings Performance
          </p>
          <h3 className="mt-1 font-serif text-xl font-bold text-primary-dark">
            All Goals Overview
          </h3>
          <p className="mt-1 font-sans text-sm text-taupe">
            {activeGoals.length} active · {chartGoals.length - activeGoals.length} awaiting first deposit
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-cream bg-white p-0.5">
            <button
              type="button"
              onClick={() => setMode('percent')}
              className={`rounded-md px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-wide transition-colors ${
                mode === 'percent' ? 'bg-primary-dark text-cream' : 'text-taupe hover:text-primary-dark'
              }`}
            >
              % Progress
            </button>
            <button
              type="button"
              onClick={() => setMode('dollars')}
              className={`rounded-md px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-wide transition-colors ${
                mode === 'dollars' ? 'bg-primary-dark text-cream' : 'text-taupe hover:text-primary-dark'
              }`}
            >
              $ Saved
            </button>
          </div>

          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setFocusedGoalId(null);
            }}
            className="rounded-lg border border-cream bg-white px-3 py-1.5 font-sans text-xs focus:border-gold focus:outline-none"
          >
            <option value="active">Active goals</option>
            <option value="all">All goals</option>
            {chartGoals.map((goal) => (
              <option key={goal.goal_id} value={goal.goal_id}>
                {goal.goal_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {chartGoals.map((goal) => {
          const isHidden = hiddenGoalIds.has(goal.goal_id);
          const isFocused = focusedGoalId === goal.goal_id;
          const isInactive = !goal.has_activity;

          return (
            <button
              key={goal.goal_id}
              type="button"
              onClick={() => !isInactive && handleLegendClick(goal.goal_id)}
              onDoubleClick={() => !isInactive && toggleGoalVisibility(goal.goal_id)}
              disabled={isInactive}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-wide transition-opacity ${
                isHidden || isInactive
                  ? 'border-gray-200 bg-gray-50 text-taupe/50 opacity-50'
                  : isFocused
                    ? 'border-primary-dark bg-primary-dark/10 text-primary-dark'
                    : 'border-cream bg-white text-primary-dark'
              }`}
              title={isInactive ? 'No transactions yet' : 'Click to focus · double-click to hide'}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: isInactive ? '#ccc' : goal.color }}
              />
              {goal.goal_name}
              {isInactive && <span className="normal-case text-taupe">(inactive)</span>}
            </button>
          );
        })}
      </div>

      {!hasAnyActivity ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed border-cream bg-white/50 p-8 text-center">
          <div>
            <p className="font-serif text-lg font-bold text-primary-dark">No transactions yet</p>
            <p className="mt-1 font-sans text-sm text-taupe">
              Record deposits on your goals to see combined performance here.
            </p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: mode === 'dollars' ? 8 : 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical stroke="#E8DFC8" horizontal={false} />
            <XAxis
              dataKey="displayDate"
              tick={{ fill: '#4E4B46', fontSize: 10, fontFamily: 'Montserrat, Helvetica, sans-serif' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              hide={mode === 'dollars'}
              domain={mode === 'percent' ? [0, 100] : ['auto', 'auto']}
              tick={{ fill: '#4E4B46', fontSize: 10, fontFamily: 'IBM Plex Mono, Consolas, monospace' }}
              tickFormatter={(v) => (mode === 'percent' ? `${v}%` : `$${v}`)}
              width={mode === 'percent' ? 40 : 48}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                const row = payload?.[0]?.payload;
                return (
                  <CombinedTooltip
                    active={active}
                    payload={payload}
                    label={row?.date || label}
                    goals={visibleGoals}
                    mode={mode}
                    chartRow={row}
                  />
                );
              }}
            />
            {visibleGoals.map((goal) => (
              <Line
                key={goal.goal_id}
                type="monotone"
                dataKey={`g_${goal.goal_id}`}
                name={goal.goal_name}
                stroke={goal.color}
                strokeWidth={focusedGoalId === goal.goal_id ? 3.5 : 2}
                strokeOpacity={focusedGoalId && focusedGoalId !== goal.goal_id ? 0.2 : 1}
                dot={false}
                activeDot={{ r: 5, fill: goal.color, stroke: '#1A2340', strokeWidth: 2 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="mt-3 flex flex-wrap gap-3 border-t border-cream pt-3">
        {chartGoals.filter((g) => g.has_activity).map((goal) => (
          <p key={goal.goal_id} className="font-sans text-xs text-taupe">
            <span className="font-semibold text-primary-dark">{goal.goal_name}:</span>{' '}
            ${parseAmount(goal.current_balance).toFixed(2)} / ${parseAmount(goal.target_amount).toFixed(2)}
            {' '}({parseAmount(goal.percentage_complete).toFixed(0)}%)
          </p>
        ))}
      </div>
    </article>
  );
}

export default GoalsLineGraph;
