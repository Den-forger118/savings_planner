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
}) {
  const fmt = (value) => formatMoney(value, currencyCode, currencySymbol);
  const [budgetBreakdown, setBudgetBreakdown] = useState([]);
  const [summary, setSummary] = useState(null);
  const [allocationLoading, setAllocationLoading] = useState(true);
  const budgetAmount = parseFloat(monthlyBudget);
  const hasBudget = Number.isFinite(budgetAmount) && budgetAmount > 0;
  const hasGoals = goals.length > 0;
  const activeGoals = useMemo(
    () => goals.filter(goal => !goal.is_complete && !goal.is_paused),
    [goals]
  );
  const showAllocation = isEarnerMode && activeGoals.length > 0 && hasBudget;
  const totalTarget = goals.reduce((sum, goal) => sum + parseFloat(goal.target_amount || 0), 0);
  const totalSaved = goals.reduce((sum, goal) => sum + parseFloat(goal.saved_amount || 0), 0);

  useEffect(() => {
    if (!showAllocation) {
      setBudgetBreakdown([]);
      setSummary(null);
      setAllocationLoading(false);
      return;
    }

    const breakdown = activeGoals.map(goal => ({
      goal_id: goal.goal_id,
      name: goal.name,
      allocated: parseFloat(goal.allocated_monthly_amount),
      needed: parseFloat(goal.savings_needed.monthly),
      shortfall: Math.max(0, parseFloat(goal.savings_needed.monthly) - parseFloat(goal.allocated_monthly_amount)),
      feasible: goal.is_feasible,
    }));

    const totalAllocated = breakdown.reduce((sum, b) => sum + b.allocated, 0);
    const totalNeeded = breakdown.reduce((sum, b) => sum + b.needed, 0);
    const totalShortfall = breakdown.reduce((sum, b) => sum + b.shortfall, 0);
    const feasibleCount = breakdown.filter(b => b.feasible).length;
    const underfundedCount = breakdown.filter(b => !b.feasible).length;

    setSummary({
      total_allocated: totalAllocated,
      total_needed: totalNeeded,
      total_shortfall: totalShortfall,
      feasible_goals: feasibleCount,
      underfunded_goals: underfundedCount,
      budget_utilization: (totalAllocated / budgetAmount * 100).toFixed(1),
      remaining_unallocated: (budgetAmount - totalAllocated).toFixed(2),
    });

    setBudgetBreakdown(breakdown);
    setAllocationLoading(false);
  }, [activeGoals, monthlyBudget, showAllocation, budgetAmount]);

  return (
    <div className="mb-12 space-y-10">
      {showAllocation && !allocationLoading && summary && (
        <section>
          <h2 className="section-title mb-5">
            Budget Overview
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="surface-navy p-5 text-cream">
              <p className="mb-2 font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold/80">
                Your Monthly Budget
              </p>
              <p className="font-money text-2xl font-light tracking-[0.02em] sm:text-3xl">{fmt(budgetAmount)}</p>
              <p className="mt-2 font-sans text-xs text-cream/55">Total available to save</p>
            </div>

            <div className="stat-tile">
              <p className="mb-2 font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                Allocated to Goals
              </p>
              <p className="font-money text-2xl font-light tracking-[0.02em] sm:text-3xl text-primary-dark">
                {fmt(summary.total_allocated)}
              </p>
              <p className="mt-2 font-sans text-xs text-taupe">
                {summary.budget_utilization}% of budget
              </p>
            </div>

            <div className="stat-tile">
              <p className="mb-2 font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                Unallocated
              </p>
              <p className="font-money text-2xl font-light tracking-[0.02em] sm:text-3xl text-primary-dark">
                {fmt(summary.remaining_unallocated)}
              </p>
              <p className="mt-2 font-sans text-xs text-taupe">Available for new goals</p>
            </div>

            <div className="stat-tile">
              <p className="mb-2 font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                Goals Status
              </p>
              <div className="flex gap-5">
                <div>
                  <p className="font-money text-2xl font-light tracking-[0.02em] text-emerald-700">{summary.feasible_goals}</p>
                  <p className="font-sans text-xs text-taupe">Feasible</p>
                </div>
                <div>
                  <p className="font-money text-2xl font-light tracking-[0.02em] text-amber-700">{summary.underfunded_goals}</p>
                  <p className="font-sans text-xs text-taupe">Underfunded</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {!isEarnerMode && (
        <section>
          <h2 className="mb-5 section-title">
            Savings Targets
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="stat-tile">
              <p className="mb-2 font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                Total Goals
              </p>
              <p className="font-money text-2xl font-light tracking-[0.02em] sm:text-3xl text-primary-dark">{goals.length}</p>
            </div>
            <div className="stat-tile">
              <p className="mb-2 font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                Total Target
              </p>
              <p className="font-money text-2xl font-light tracking-[0.02em] sm:text-3xl text-primary-dark">
                {fmt(totalTarget)}
              </p>
            </div>
            <div className="stat-tile">
              <p className="mb-2 font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                Total Saved
              </p>
              <p className="font-money text-2xl font-light tracking-[0.02em] sm:text-3xl text-primary-dark">
                <OdometerNumber value={totalSaved} prefix={currencySymbol} />
              </p>
            </div>
          </div>
        </section>
      )}

      {!isEarnerMode && (
        <section className="surface p-6">
          <p className="font-serif text-lg font-light text-primary-dark">
            Non-Earner mode is active
          </p>
          <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-taupe">
            Enable Earner mode in Settings to see budget allocation, feasibility checks, and funding recommendations.
          </p>
        </section>
      )}

      <section>
        <div className="mb-5">
          <p className="eyebrow">Spending Analytics</p>
          <h2 className="mt-1 font-serif text-2xl font-light tracking-[-0.03em] text-primary-dark">
            Where Your Money Goes
          </h2>
        </div>
        <ExpenseHistogram
          userId={userId}
          refreshTrigger={expenseRefresh}
          currencyCode={currencyCode}
          currencySymbol={currencySymbol}
        />
      </section>

      {hasGoals && (
        <section>
          <div className="mb-5">
            <p className="eyebrow">Savings Analytics</p>
            <h2 className="mt-1 font-serif text-2xl font-light tracking-[-0.03em] text-primary-dark">
              Goal Performance Over Time
            </h2>
            <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-taupe">
              Compare all goals on one chart. Toggle between % progress and dollars saved, click a goal to focus, or open individual charts on the Savings Goals page.
            </p>
          </div>

          <GoalsLineGraph
            userId={userId}
            goals={goals}
            refreshKey={transactionRefresh}
          />
        </section>
      )}

      <section>
        <RecentActivity
          userId={userId}
          refreshKey={transactionRefresh}
          onViewAll={onViewAllActivity}
          currencyCode={currencyCode}
          currencySymbol={currencySymbol}
        />
      </section>

      {showAllocation && !allocationLoading && summary && (
        <section>
          <h2 className="mb-5 section-title">
            How Your Budget is Allocated
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="surface p-6">
              <h3 className="mb-5 card-title">
                Monthly Allocation
              </h3>

              <div className="space-y-4">
                {budgetBreakdown.map(goal => (
                  <div key={goal.goal_id}>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-sans text-sm font-normal text-primary-dark">{goal.name}</p>
                      <p className="font-money font-light text-primary-dark">{fmt(goal.allocated)}</p>
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

            <div className="surface p-6">
              <h3 className="mb-5 card-title">
                Allocation Details
              </h3>

              <div className="space-y-3">
                {budgetBreakdown.map(goal => (
                  <div
                    key={goal.goal_id}
                    className={`rounded-lg border p-4 ${
                      goal.feasible
                        ? 'border-emerald-500/30 bg-emerald-500/[0.08]'
                        : 'border-amber-500/30 bg-amber-500/[0.08]'
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="font-sans font-normal text-primary-dark">{goal.name}</p>
                      <span className={`rounded-md px-2 py-1 text-xs font-medium uppercase tracking-wide ${
                        goal.feasible
                          ? 'bg-emerald-500/20 text-emerald-700'
                          : 'bg-amber-500/20 text-amber-800'
                      }`}>
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
                      <div className="mt-3 border-t border-amber-500/20 pt-3">
                        <p className="font-sans text-xs text-amber-700">
                          Shortfall: {fmt(goal.shortfall)}/month
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {showAllocation && !allocationLoading && summary?.underfunded_goals > 0 && (
        <section className="surface border-amber-500/25 bg-amber-500/[0.06] p-6 md:p-8">
          <h2 className="mb-4 font-serif text-2xl font-light text-primary-dark">
            Budget Recommendations
          </h2>

          <div className="space-y-3">
            <div className="rounded-lg border border-primary-dark/[0.08] p-4">
              <p className="font-sans text-sm text-primary-dark">
                <span className="font-normal">You have {summary.underfunded_goals} underfunded goal(s).</span>{' '}
                You need {fmt(summary.total_shortfall)}/month more to fully fund all goals.
              </p>
              <p className="mt-2 font-sans text-xs text-taupe">
                Consider: (1) Increase your monthly budget, (2) Extend goal deadlines, or (3) Reduce goal amounts.
              </p>
            </div>

            {parseFloat(summary.remaining_unallocated) > 0 && (
              <div className="rounded-lg border border-primary-dark/[0.08] bg-ivory p-4">
                <p className="font-sans text-sm text-primary-dark">
                  <span className="font-normal">You have {fmt(summary.remaining_unallocated)} unallocated.</span>{' '}
                  This is set aside but not yet assigned to any goal. Create new goals to allocate this budget.
                </p>
              </div>
            )}

            {summary.feasible_goals === activeGoals.length && (
              <div className="rounded-lg border border-primary-dark/[0.08] bg-ivory p-4">
                <p className="font-sans text-sm text-emerald-800">
                  <span className="font-normal">Great job!</span> All your goals are achievable with your current budget and timeline.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {isEarnerMode && hasBudget && hasGoals && activeGoals.length === 0 && (
        <section className="surface p-8">
          <p className="font-serif text-2xl font-light text-primary-dark">
            All active goals are complete
          </p>
          <p className="mt-2 max-w-2xl font-sans text-taupe">
            Budget allocation will resume when you add another active savings goal.
          </p>
        </section>
      )}

      {isEarnerMode && hasBudget && !hasGoals && (
        <section className="surface p-8">
          <p className="font-serif text-2xl font-light text-primary-dark">
            Allocation analytics will appear here
          </p>
          <p className="mt-2 max-w-2xl font-sans text-taupe">
            Set your monthly budget and add at least one savings goal to see budget allocation, shortfalls, and feasibility.
          </p>
        </section>
      )}
    </div>
  );
}

export default Dashboard;
