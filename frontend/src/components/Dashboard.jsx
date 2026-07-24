import { useState, useEffect, useMemo } from 'react';
import ExpenseHistogram from './ExpenseHistogram';
import GoalsLineGraph from './GoalsLineGraph';
import RecentActivity from './RecentActivity';
import { formatMoney } from '../utils/currency';
import OdometerNumber from './OdometerNumber';
import ProgressBar from './ProgressBar';

function Dashboard({
  userId,
  monthlyBudget,
  isEarnerMode = false,
  goals,
  currencyCode = 'USD',
  currencySymbol = '$',
  expenseRefresh = 0,
  transactionRefresh = 0,
  onViewAllActivity,
  onAddGoal,
  onEditBudget,
}) {
  const fmt = (value) => formatMoney(value, currencyCode, currencySymbol);
  const [budgetBreakdown, setBudgetBreakdown] = useState([]);
  const [summary, setSummary] = useState(null);
  const [allocationLoading, setAllocationLoading] = useState(true);
  const budgetAmount = parseFloat(monthlyBudget);
  const hasBudget = Number.isFinite(budgetAmount) && budgetAmount > 0;
  const hasGoals = goals.length > 0;
  const activeGoals = useMemo(
    () => goals.filter((goal) => !goal.is_complete && !goal.is_paused),
    [goals]
  );
  const showAllocation = isEarnerMode && activeGoals.length > 0 && hasBudget;
  const totalTarget = goals.reduce((sum, goal) => sum + parseFloat(goal.target_amount || 0), 0);
  const totalSaved = goals.reduce((sum, goal) => sum + parseFloat(goal.saved_amount || 0), 0);
  const completionRate =
    totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  useEffect(() => {
    if (!showAllocation) {
      setBudgetBreakdown([]);
      setSummary(null);
      setAllocationLoading(false);
      return;
    }

    const breakdown = activeGoals.map((goal) => ({
      goal_id: goal.goal_id,
      name: goal.name,
      allocated: parseFloat(goal.allocated_monthly_amount),
      needed: parseFloat(goal.savings_needed.monthly),
      shortfall: Math.max(
        0,
        parseFloat(goal.savings_needed.monthly) - parseFloat(goal.allocated_monthly_amount)
      ),
      feasible: goal.is_feasible,
    }));

    const totalAllocated = breakdown.reduce((sum, b) => sum + b.allocated, 0);
    const totalNeeded = breakdown.reduce((sum, b) => sum + b.needed, 0);
    const totalShortfall = breakdown.reduce((sum, b) => sum + b.shortfall, 0);
    const feasibleCount = breakdown.filter((b) => b.feasible).length;
    const underfundedCount = breakdown.filter((b) => !b.feasible).length;

    setSummary({
      total_allocated: totalAllocated,
      total_needed: totalNeeded,
      total_shortfall: totalShortfall,
      feasible_goals: feasibleCount,
      underfunded_goals: underfundedCount,
      budget_utilization: ((totalAllocated / budgetAmount) * 100).toFixed(1),
      remaining_unallocated: (budgetAmount - totalAllocated).toFixed(2),
    });

    setBudgetBreakdown(breakdown);
    setAllocationLoading(false);
  }, [activeGoals, monthlyBudget, showAllocation, budgetAmount]);

  const insight = useMemo(() => {
    const money = (value) => formatMoney(value, currencyCode, currencySymbol);
    if (!isEarnerMode) {
      return {
        title: 'Non-Earner mode',
        body: 'Enable Earner mode in Settings for budget allocation, feasibility checks, and funding recommendations.',
      };
    }
    if (!hasBudget) {
      return {
        title: 'Set your mandate',
        body: 'Add a monthly savings budget to unlock allocation analytics and goal feasibility.',
      };
    }
    if (summary?.underfunded_goals > 0) {
      return {
        title: 'Funding attention needed',
        body: `${summary.underfunded_goals} goal(s) need ${money(summary.total_shortfall)}/month more. Consider raising your budget, extending deadlines, or adjusting targets.`,
      };
    }
    if (summary && parseFloat(summary.remaining_unallocated) > 0) {
      return {
        title: 'Unallocated capital',
        body: `You have ${money(summary.remaining_unallocated)} unassigned this month. Create or fund a goal to put it to work.`,
      };
    }
    if (activeGoals.length === 0 && hasGoals) {
      return {
        title: 'All active goals complete',
        body: 'Budget allocation will resume when you open another savings objective.',
      };
    }
    if (!hasGoals) {
      return {
        title: 'Start your ledger',
        body: 'Create your first savings goal to see performance, activity, and allocation here.',
      };
    }
    return {
      title: 'On track',
      body: 'Your active goals look achievable with the current budget and timelines.',
    };
  }, [
    isEarnerMode,
    hasBudget,
    summary,
    activeGoals.length,
    hasGoals,
    currencyCode,
    currencySymbol,
  ]);

  return (
    <div className="mb-10 space-y-5">
      {/* Top metrics + insight + actions */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="surface-navy flex min-h-[140px] flex-col justify-between p-5 text-cream lg:col-span-2">
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold/80">
            {isEarnerMode && hasBudget ? 'Monthly Budget' : 'Total Saved'}
          </p>
          <div className="mt-3">
            <p className="font-money text-2xl font-light tracking-[0.02em] sm:text-3xl">
              {isEarnerMode && hasBudget ? (
                fmt(budgetAmount)
              ) : (
                <OdometerNumber value={totalSaved} prefix={currencySymbol} />
              )}
            </p>
            <p className="mt-2 font-sans text-xs text-cream/55">
              {isEarnerMode && hasBudget
                ? `${summary?.budget_utilization || 0}% allocated`
                : `${completionRate}% of portfolio target`}
            </p>
          </div>
        </div>

        <div className="stat-tile flex min-h-[140px] flex-col justify-between p-5 lg:col-span-2">
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
            Active Goals
          </p>
          <div className="mt-3">
            <p className="font-money text-2xl font-light tracking-[0.02em] text-primary-dark sm:text-3xl">
              {activeGoals.length}
            </p>
            <p className="mt-2 font-sans text-xs text-taupe">
              {goals.length} total · {fmt(totalTarget)} target
            </p>
          </div>
        </div>

        <div className="stat-tile flex gap-4 p-5 lg:col-span-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <span className="font-engraved text-lg leading-none">Q</span>
          </div>
          <div className="min-w-0">
            <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
              Insight
            </p>
            <p className="mt-1.5 font-serif text-lg font-light text-primary-dark">{insight.title}</p>
            <p className="mt-1.5 font-sans text-sm font-light leading-relaxed text-taupe">
              {insight.body}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:col-span-3">
          {onAddGoal && (
            <button type="button" onClick={onAddGoal} className="btn-navy min-h-[44px] w-full py-3">
              + New Goal
            </button>
          )}
          {isEarnerMode && onEditBudget && (
            <button type="button" onClick={onEditBudget} className="btn-ghost min-h-[44px] w-full py-3">
              {hasBudget ? 'Adjust Budget' : 'Set Monthly Budget'}
            </button>
          )}
          {!isEarnerMode && (
            <div className="surface flex min-h-[44px] flex-1 flex-col justify-center px-4 py-3">
              <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
                Mode
              </p>
              <p className="mt-1.5 font-sans text-xs leading-relaxed text-taupe">
                Switch to Earner mode in Settings for budget tooling.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Charts row — spending (not pie) + goal performance */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <ExpenseHistogram
            userId={userId}
            refreshTrigger={expenseRefresh}
            currencyCode={currencyCode}
            currencySymbol={currencySymbol}
          />
        </div>

        <div className="min-w-0 lg:col-span-7">
          {hasGoals ? (
            <GoalsLineGraph
              userId={userId}
              goals={goals}
              refreshKey={transactionRefresh}
            />
          ) : (
            <div className="surface flex min-h-[280px] flex-col items-center justify-center p-5 text-center">
              <p className="eyebrow">Savings Analytics</p>
              <h3 className="mt-1 card-title">Goal Performance</h3>
              <p className="mt-3 max-w-sm font-sans text-sm text-taupe">
                Goal performance appears once you create a savings objective.
              </p>
              {onAddGoal && (
                <button type="button" onClick={onAddGoal} className="btn-navy mt-5 min-h-[44px]">
                  + New Goal
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Activity + goals overview */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <RecentActivity
            userId={userId}
            refreshKey={transactionRefresh}
            onViewAll={onViewAllActivity}
            currencyCode={currencyCode}
            currencySymbol={currencySymbol}
          />
        </div>

        <div className="surface overflow-hidden lg:col-span-5">
          <div className="border-b border-primary-dark/[0.06] px-5 py-4">
            <p className="eyebrow">Portfolio</p>
            <h3 className="mt-1 card-title">Goals Overview</h3>
          </div>

          {goals.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-serif text-lg font-light text-primary-dark">No goals yet</p>
              <p className="mt-1 font-sans text-sm text-taupe">
                Add a goal to track progress here.
              </p>
              {onAddGoal && (
                <button type="button" onClick={onAddGoal} className="btn-ghost mt-5 min-h-[44px]">
                  + New Goal
                </button>
              )}
            </div>
          ) : (
            <div className="max-h-[420px] space-y-5 overflow-y-auto px-5 py-5">
              {goals.map((goal) => {
                const saved = parseFloat(goal.saved_amount || 0);
                const target = parseFloat(goal.target_amount || 0);
                const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
                return (
                  <div key={goal.goal_id}>
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate font-sans text-sm font-normal text-primary-dark">
                        {goal.name}
                      </p>
                      <p className="shrink-0 font-money text-xs font-light text-taupe">
                        {fmt(target)} · {Math.round(pct)}%
                      </p>
                    </div>
                    <ProgressBar value={pct} size="md" rounded="rounded" />
                    <p className="mt-1.5 font-sans text-xs text-taupe">
                      {fmt(saved)} saved
                      {goal.is_complete ? ' · Complete' : goal.is_paused ? ' · On hold' : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Earner allocation detail (kept, secondary) */}
      {showAllocation && !allocationLoading && summary && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="surface p-5 md:p-6">
            <p className="eyebrow">Allocation</p>
            <h3 className="mt-1 mb-5 card-title">Monthly Allocation</h3>
            <div className="space-y-4">
              {budgetBreakdown.map((goal) => (
                <div key={goal.goal_id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate font-sans text-sm font-normal text-primary-dark">
                      {goal.name}
                    </p>
                    <p className="shrink-0 font-money font-light text-primary-dark">
                      {fmt(goal.allocated)}
                    </p>
                  </div>
                  <ProgressBar
                    value={(goal.allocated / budgetAmount) * 100}
                    size="md"
                    rounded="rounded"
                  />
                  <p className="mt-1 font-sans text-xs text-taupe">
                    {((goal.allocated / budgetAmount) * 100).toFixed(1)}% of budget
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface p-5 md:p-6">
            <p className="eyebrow">Feasibility</p>
            <h3 className="mt-1 mb-5 card-title">Allocation Details</h3>
            <div className="space-y-3">
              {budgetBreakdown.map((goal) => (
                <div
                  key={goal.goal_id}
                  className={`rounded-lg border p-4 ${
                    goal.feasible
                      ? 'border-primary-dark/10 bg-cream/60'
                      : 'border-gold/40 bg-gold/10'
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="font-sans font-normal text-primary-dark">{goal.name}</p>
                    <span
                      className={`rounded-md px-2 py-1 font-sans text-xs font-normal uppercase tracking-[0.12em] ${
                        goal.feasible
                          ? 'bg-primary-dark/10 text-primary-dark'
                          : 'bg-gold/25 text-primary-dark'
                      }`}
                    >
                      {goal.feasible ? 'Achievable' : 'Underfunded'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-sans text-xs text-taupe">Allocated</p>
                      <p className="font-money font-light text-primary-dark">{fmt(goal.allocated)}</p>
                    </div>
                    <div>
                      <p className="font-sans text-xs text-taupe">Needed</p>
                      <p className="font-money font-light text-primary-dark">{fmt(goal.needed)}</p>
                    </div>
                  </div>
                  {goal.shortfall > 0 && (
                    <div className="mt-3 border-t border-gold/25 pt-3">
                      <p className="font-sans text-xs text-taupe">
                        Shortfall:{' '}
                        <span className="font-money text-primary-dark">
                          {fmt(goal.shortfall)}
                        </span>
                        /month
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default Dashboard;
