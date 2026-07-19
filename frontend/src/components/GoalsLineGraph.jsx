import { useState, useEffect, useMemo, useRef } from 'react';
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
import { getFriendlyError } from '../utils/friendlyError';
import ErrorBanner from './ErrorBanner';

const CHART_HEIGHT = 280;

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

const goalIdFromDataKey = (dataKey) => {
  const match = String(dataKey || '').match(/^g_(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : null;
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
        // Carry latest snapshot for every goal so hovering any line shows that goal's details
        row[metaKey] = {
          ...current,
          goal_name: goal.goal_name,
          target_amount: parseAmount(goal.target_amount),
          isEvent: event.goalId === goal.goal_id,
        };
      }
    });

    return row;
  });
};

const getYDomain = (rows, goals, mode) => {
  if (mode === 'percent') {
    return [0, 100];
  }

  let min = Infinity;
  let max = -Infinity;

  rows.forEach((row) => {
    goals.forEach((goal) => {
      const value = row[`g_${goal.goal_id}`];
      if (Number.isFinite(value)) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    });
  });

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [0, 1];
  }

  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, max + pad];
  }

  const pad = (max - min) * 0.05;
  return [min - pad, max + pad];
};

const pickNearestGoalId = (row, goals, mouseY, yDomain) => {
  if (!row || !goals.length) {
    return null;
  }

  if (!Number.isFinite(mouseY)) {
    const eventGoal = goals.find((goal) => row[`meta_${goal.goal_id}`]?.isEvent);
    return eventGoal?.goal_id ?? goals[0]?.goal_id ?? null;
  }

  const plotTop = 8;
  const plotBottom = CHART_HEIGHT - 28;
  const plotHeight = Math.max(plotBottom - plotTop, 1);
  const [minV, maxV] = yDomain;
  const span = maxV - minV || 1;

  let bestId = null;
  let bestDist = Infinity;

  goals.forEach((goal) => {
    const value = row[`g_${goal.goal_id}`];
    if (!Number.isFinite(value)) {
      return;
    }

    const pixelY = plotBottom - ((value - minV) / span) * plotHeight;
    const dist = Math.abs(pixelY - mouseY);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = goal.goal_id;
    }
  });

  return bestId ?? goals[0]?.goal_id ?? null;
};

const CombinedTooltip = ({ active, payload, mode, goals, hoveredGoalId }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0]?.payload;
  const goalId = hoveredGoalId ?? goalIdFromDataKey(payload[0]?.dataKey);
  const goal = goals.find((item) => item.goal_id === goalId);
  const meta = goalId != null ? row?.[`meta_${goalId}`] : null;

  if (!goal || !meta) {
    return null;
  }

  const target = parseAmount(goal.target_amount);
  const balance = parseAmount(meta.cumulative);
  const percent = parseAmount(meta.percentage);

  return (
    <div className="min-w-[200px] max-w-xs rounded-lg border border-cream/20 bg-primary-dark px-4 py-3 shadow-xl">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: goal.color }}
        />
        <p className="truncate font-sans text-sm font-normal text-gold">{goal.goal_name}</p>
      </div>

      <p className="mt-1 font-sans text-[10px] font-normal uppercase tracking-[0.14em] text-cream/50">
        {formatTooltipDate(meta.date || row?.date)}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="font-sans text-[9px] font-normal uppercase tracking-[0.14em] text-cream/45">
            {mode === 'percent' ? 'Progress' : 'Balance'}
          </p>
          <p className="mt-0.5 font-money text-xl font-light text-cream">
            {mode === 'percent' ? `${percent.toFixed(1)}%` : `$${balance.toFixed(2)}`}
          </p>
        </div>
        <div>
          <p className="font-sans text-[9px] font-normal uppercase tracking-[0.14em] text-cream/45">
            Target
          </p>
          <p className="mt-0.5 font-money text-sm font-light text-cream/80">
            ${target.toFixed(2)}
          </p>
        </div>
      </div>

      {mode === 'percent' && (
        <p className="mt-1 font-money text-xs text-cream/55">
          ${balance.toFixed(2)} saved
        </p>
      )}
      {mode === 'dollars' && (
        <p className="mt-1 font-money text-xs text-cream/55">
          {percent.toFixed(1)}% complete
        </p>
      )}

      {meta.isEvent && (
        <div className="mt-3 border-t border-cream/15 pt-2">
          <p className="font-sans text-[9px] font-normal uppercase tracking-[0.14em] text-cream/45">
            This transaction
          </p>
          <p className={`mt-0.5 font-money text-base font-light ${
            meta.type === 'deposit' ? 'text-gold' : 'text-red-400'
          }`}>
            {meta.type === 'deposit' ? '+' : '−'}${meta.amount.toFixed(2)}
            <span className="ml-2 font-sans text-[10px] font-normal uppercase tracking-wide text-cream/50">
              {meta.type}
            </span>
          </p>
          {meta.note && (
            <p className="mt-1 font-sans text-xs text-blue-200">{meta.note}</p>
          )}
        </div>
      )}
    </div>
  );
};

function GoalsLineGraph({ userId, goals: liveGoals, refreshKey = 0 }) {
  const [chartGoals, setChartGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('percent');
  const [filter, setFilter] = useState('active');
  const [hiddenGoalIds, setHiddenGoalIds] = useState(new Set());
  const [focusedGoalId, setFocusedGoalId] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(undefined);
  const [hoveredGoalId, setHoveredGoalId] = useState(null);
  const chartWrapRef = useRef(null);
  const pointerYRef = useRef(null);
  const activeIndexRef = useRef(null);
  const hoverContextRef = useRef({ chartData: [], visibleGoals: [], yDomain: [0, 100] });

  const refreshToken = liveGoals.map((g) => g.saved_amount).join('-');

  useEffect(() => {
    fetchChartData();
  }, [userId, refreshKey, refreshToken]);

  const fetchChartData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/reports/goal-chart?userId=${userId}`);
      setChartGoals(response.data.goals || []);
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t load your savings chart. Please try again.'));
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

  const yDomain = useMemo(
    () => getYDomain(chartData, visibleGoals, mode),
    [chartData, visibleGoals, mode]
  );

  hoverContextRef.current = { chartData, visibleGoals, yDomain };

  const updateHoveredGoal = () => {
    const { chartData: rows, visibleGoals: goals, yDomain: domain } = hoverContextRef.current;
    const index = activeIndexRef.current;
    if (index == null || !rows[index]) {
      setHoveredGoalId(null);
      return null;
    }

    const nearestId = pickNearestGoalId(rows[index], goals, pointerYRef.current, domain);
    setHoveredGoalId(nearestId);
    return { row: rows[index], goalId: nearestId, domain };
  };

  const valueToPixelY = (value, domain) => {
    const plotTop = 8;
    const plotBottom = CHART_HEIGHT - 28;
    const plotHeight = Math.max(plotBottom - plotTop, 1);
    const [minV, maxV] = domain;
    const span = maxV - minV || 1;
    return plotBottom - ((value - minV) / span) * plotHeight;
  };

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

  const handleChartMouseMove = (state) => {
    if (!state?.isTooltipActive || state.activeTooltipIndex == null) {
      activeIndexRef.current = null;
      setTooltipPos(undefined);
      setHoveredGoalId(null);
      return;
    }

    const index = Number(state.activeTooltipIndex);
    activeIndexRef.current = Number.isFinite(index) ? index : null;

    const hover = updateHoveredGoal();
    const anchorX = state.activeCoordinate?.x;
    if (!Number.isFinite(anchorX)) {
      return;
    }

    let anchorY = Number.isFinite(state.activeCoordinate?.y) ? state.activeCoordinate.y : 40;
    if (hover?.goalId != null && hover.row) {
      const value = hover.row[`g_${hover.goalId}`];
      if (Number.isFinite(value)) {
        anchorY = valueToPixelY(value, hover.domain);
      }
    }

    setTooltipPos({ x: anchorX, y: anchorY + 18 });
  };

  const handleChartPointerMove = (event) => {
    const bounds = chartWrapRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }
    pointerYRef.current = event.clientY - bounds.top;
    if (activeIndexRef.current == null) {
      return;
    }

    const hover = updateHoveredGoal();
    setTooltipPos((prev) => {
      if (!prev || !Number.isFinite(prev.x) || !hover?.goalId || !hover.row) {
        return prev;
      }
      const value = hover.row[`g_${hover.goalId}`];
      if (!Number.isFinite(value)) {
        return prev;
      }
      return { x: prev.x, y: valueToPixelY(value, hover.domain) + 18 };
    });
  };

  const clearHover = () => {
    pointerYRef.current = null;
    activeIndexRef.current = null;
    setHoveredGoalId(null);
    setTooltipPos(undefined);
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
      <div className="surface p-6">
        <p className="font-sans text-sm text-taupe">Loading savings performance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface p-6">
        <ErrorBanner message={error} />
      </div>
    );
  }

  const hasAnyActivity = activeGoals.length > 0;

  return (
    <article className="surface p-5 md:p-6">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="eyebrow">
            Cumulative Savings Performance
          </p>
          <h3 className="mt-1 card-title">
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
              className={`rounded-md px-3 py-1.5 font-sans text-xs font-medium uppercase tracking-wide transition-colors ${
                mode === 'percent' ? 'bg-primary-dark text-cream' : 'text-taupe hover:text-primary-dark'
              }`}
            >
              % Progress
            </button>
            <button
              type="button"
              onClick={() => setMode('dollars')}
              className={`rounded-md px-3 py-1.5 font-sans text-xs font-medium uppercase tracking-wide transition-colors ${
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
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-[10px] font-normal uppercase tracking-wide transition-opacity ${
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
            <p className="font-serif text-lg font-light tracking-[-0.015em] text-primary-dark">No transactions yet</p>
            <p className="mt-1 font-sans text-sm text-taupe">
              Record deposits on your goals to see combined performance here.
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={chartWrapRef}
          onMouseMove={handleChartPointerMove}
          onMouseLeave={clearHover}
        >
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 12, left: mode === 'dollars' ? 8 : 0, bottom: 0 }}
              onMouseMove={handleChartMouseMove}
              onMouseLeave={clearHover}
            >
              <CartesianGrid strokeDasharray="3 3" vertical stroke="#E8DFC8" horizontal={false} />
              <XAxis
                dataKey="displayDate"
                tick={{ fill: '#4E4B46', fontSize: 10, fontFamily: 'Manrope, Helvetica, sans-serif' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                hide={mode === 'dollars'}
                domain={mode === 'percent' ? [0, 100] : yDomain}
                tick={{ fill: '#4E4B46', fontSize: 10, fontFamily: 'IBM Plex Mono, Consolas, monospace' }}
                tickFormatter={(v) => (mode === 'percent' ? `${v}%` : `$${v}`)}
                width={mode === 'percent' ? 40 : 48}
              />
              <Tooltip
                allowEscapeViewBox={{ x: true, y: true }}
                position={tooltipPos}
                content={({ active, payload }) => (
                  <CombinedTooltip
                    active={active}
                    payload={payload}
                    mode={mode}
                    goals={visibleGoals}
                    hoveredGoalId={hoveredGoalId}
                  />
                )}
              />
              {visibleGoals.map((goal) => (
                <Line
                  key={goal.goal_id}
                  type="monotone"
                  dataKey={`g_${goal.goal_id}`}
                  name={goal.goal_name}
                  stroke={goal.color}
                  strokeWidth={
                    hoveredGoalId === goal.goal_id || focusedGoalId === goal.goal_id ? 3.5 : 2
                  }
                  strokeOpacity={
                    (hoveredGoalId && hoveredGoalId !== goal.goal_id)
                    || (focusedGoalId && focusedGoalId !== goal.goal_id)
                      ? 0.25
                      : 1
                  }
                  dot={false}
                  activeDot={{
                    r: hoveredGoalId === goal.goal_id ? 6 : 4,
                    fill: goal.color,
                    stroke: '#1A2340',
                    strokeWidth: 2,
                  }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3 border-t border-cream pt-3">
        {chartGoals.filter((g) => g.has_activity).map((goal) => (
          <p key={goal.goal_id} className="font-sans text-xs text-taupe">
            <span className="font-normal text-primary-dark">{goal.goal_name}:</span>{' '}
            ${parseAmount(goal.current_balance).toFixed(2)} / ${parseAmount(goal.target_amount).toFixed(2)}
            {' '}({parseAmount(goal.percentage_complete).toFixed(0)}%)
          </p>
        ))}
      </div>
    </article>
  );
}

export default GoalsLineGraph;
