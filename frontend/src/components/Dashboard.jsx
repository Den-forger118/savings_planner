import { useState, useEffect, useMemo } from 'react';
import ExpenseHistogram from './ExpenseHistogram';
import GoalsLineGraph from './GoalsLineGraph';
import RecentActivity from './RecentActivity';
import { formatMoney } from '../utils/currency';

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
          <h2 className="mb-6 font-serif text-3xl font-bold text-primary-dark">
            Budget Overview
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-gradient-to-br from-primary-dark to-primary-dark-alt p-6 text-cream shadow">
              <p className="mb-2 font-sans text-xs uppercase tracking-wide text-gold-light">
                Your Monthly Budget
              </p>
              <p className="font-money text-3xl font-bold">{fmt(budgetAmount)}</p>
              <p className="mt-2 font-sans text-xs text-gold-light">Total available to save</p>
            </div>

            <div
              className="rounded-lg border-l-4 border-gold p-6"
              style={{
                background: '#FDFAF5',
                border: '1px solid #D4A574',
                boxShadow: '0 4px 24px rgba(26, 35, 64, 0.08)',
                borderRadius: '0.5rem',
              }}
            >
              <p className="mb-2 font-sans text-xs uppercase tracking-wide text-taupe">
                Allocated to Goals
              </p>
              <p className="font-money text-3xl font-bold text-primary-dark">
                {fmt(summary.total_allocated)}
              </p>
              <p className="mt-2 font-sans text-xs text-taupe">
                {summary.budget_utilization}% of budget
              </p>
            </div>

            <div
              className="rounded-lg border-l-4 border-gold-light p-6"
              style={{
                background: '#FDFAF5',
                border: '1px solid #D4A574',
                boxShadow: '0 4px 24px rgba(26, 35, 64, 0.08)',
                borderRadius: '0.5rem',
              }}
            >
              <p className="mb-2 font-sans text-xs uppercase tracking-wide text-taupe">
                Unallocated
              </p>
              <p className="font-money text-3xl font-bold text-primary-dark">
                {fmt(summary.remaining_unallocated)}
              </p>
              <p className="mt-2 font-sans text-xs text-taupe">Available for new goals</p>
            </div>

            <div
              className="rounded-lg border-l-4 border-gold p-6"
              style={{
                background: '#FDFAF5',
                border: '1px solid #D4A574',
                boxShadow: '0 4px 24px rgba(26, 35, 64, 0.08)',
                borderRadius: '0.5rem',
              }}
            >
              <p className="mb-2 font-sans text-xs uppercase tracking-wide text-taupe">
                Goals Status
              </p>
              <div className="flex gap-4">
                <div>
                  <p className="font-money text-2xl font-bold text-green-600">{summary.feasible_goals}</p>
                  <p className="font-sans text-xs text-taupe">Feasible</p>
                </div>
                <div>
                  <p className="font-money text-2xl font-bold text-orange-600">{summary.underfunded_goals}</p>
                  <p className="font-sans text-xs text-taupe">Underfunded</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {!isEarnerMode && (
        <section>
          <h2 className="mb-6 font-serif text-3xl font-bold text-primary-dark">
            Savings Targets
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div
              className="rounded-lg border-l-4 border-gold p-6"
              style={{
                background: '#FDFAF5',
                border: '1px solid #D4A574',
                boxShadow: '0 4px 24px rgba(26, 35, 64, 0.08)',
                borderRadius: '0.5rem',
              }}
            >
              <p className="mb-2 font-sans text-xs uppercase tracking-wide text-taupe">
                Total Goals
              </p>
              <p className="font-money text-3xl font-bold text-primary-dark">{goals.length}</p>
            </div>
            <div
              className="rounded-lg border-l-4 border-gold p-6"
              style={{
                background: '#FDFAF5',
                border: '1px solid #D4A574',
                boxShadow: '0 4px 24px rgba(26, 35, 64, 0.08)',
                borderRadius: '0.5rem',
              }}
            >
              <p className="mb-2 font-sans text-xs uppercase tracking-wide text-taupe">
                Total Target
              </p>
              <p className="font-money text-3xl font-bold text-primary-dark">
                {fmt(totalTarget)}
              </p>
            </div>
            <div
              className="rounded-lg border-l-4 border-gold p-6"
              style={{
                background: '#FDFAF5',
                border: '1px solid #D4A574',
                boxShadow: '0 4px 24px rgba(26, 35, 64, 0.08)',
                borderRadius: '0.5rem',
              }}
            >
              <p className="mb-2 font-sans text-xs uppercase tracking-wide text-taupe">
                Total Saved
              </p>
              <p className="font-money text-3xl font-bold text-primary-dark">
                {fmt(totalSaved)}
              </p>
            </div>
          </div>
        </section>
      )}

      {!isEarnerMode && (
        <section className="rounded-lg border border-gold/20 bg-white p-6 shadow-sm">
          <p className="font-serif text-lg font-bold text-primary-dark">
            Non-Earner mode is active
          </p>
          <p className="mt-2 max-w-2xl font-sans text-sm text-taupe">
            Enable Earner mode in Settings to see budget allocation, feasibility checks, and funding recommendations.
          </p>
        </section>
      )}

      <section>
        <div className="mb-6">
          <p className="font-sans text-xs font-bold uppercase tracking-widest text-gold">
            Spending Analytics
          </p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-primary-dark">
            Where Your Money Goes
          </h2>
        </div>
        <ExpenseHistogram
          userId={userId}
          monthlyBudget={monthlyBudget}
          isEarnerMode={isEarnerMode}
          refreshTrigger={expenseRefresh}
          currencyCode={currencyCode}
          currencySymbol={currencySymbol}
        />
      </section>

      {hasGoals && (
        <section>
          <div className="mb-6">
            <p className="font-sans text-xs font-bold uppercase tracking-widest text-gold">
              Savings Analytics
            </p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-primary-dark">
              Goal Performance Over Time
            </h2>
            <p className="mt-2 max-w-2xl font-sans text-sm text-taupe">
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
          <h2 className="mb-6 font-serif text-3xl font-bold text-primary-dark">
            How Your Budget is Allocated
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-6 font-serif text-xl font-bold text-primary-dark">
                Monthly Allocation
              </h3>

              <div className="space-y-4">
                {budgetBreakdown.map(goal => (
                  <div key={goal.goal_id}>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-sans text-sm font-semibold text-primary-dark">{goal.name}</p>
                      <p className="font-money font-bold text-gold">{fmt(goal.allocated)}</p>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gray-200">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-gold to-gold-light transition-all duration-500"
                        style={{ width: `${(goal.allocated / budgetAmount) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 font-sans text-xs text-taupe">
                      {((goal.allocated / budgetAmount) * 100).toFixed(1)}% of budget
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-6 font-serif text-xl font-bold text-primary-dark">
                Allocation Details
              </h3>

              <div className="space-y-4">
                {budgetBreakdown.map(goal => (
                  <div
                    key={goal.goal_id}
                    className={`rounded-lg border-l-4 p-4 ${
                      goal.feasible
                        ? 'border-green-500 bg-green-50'
                        : 'border-orange-500 bg-orange-50'
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <p className="font-sans font-semibold text-primary-dark">{goal.name}</p>
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${
                        goal.feasible
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {goal.feasible ? 'Achievable' : 'Underfunded'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-sans text-xs text-taupe">Allocated</p>
                        <p className="font-money font-bold text-primary-dark">{fmt(goal.allocated)}</p>
                      </div>
                      <div>
                        <p className="font-sans text-xs text-taupe">Needed</p>
                        <p className="font-money font-bold text-primary-dark">{fmt(goal.needed)}</p>
                      </div>
                    </div>

                    {goal.shortfall > 0 && (
                      <div className="mt-3 border-t border-orange-200 pt-3">
                        <p className="font-sans text-xs text-orange-700">
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
        <section className="rounded-lg border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100 p-8">
          <h2 className="mb-4 font-serif text-2xl font-bold text-orange-900">
            Budget Recommendations
          </h2>

          <div className="space-y-3">
            <div className="rounded-lg bg-white p-4">
              <p className="font-sans text-sm text-primary-dark">
                <span className="font-semibold">You have {summary.underfunded_goals} underfunded goal(s).</span>{' '}
                You need {fmt(summary.total_shortfall)}/month more to fully fund all goals.
              </p>
              <p className="mt-2 font-sans text-xs text-taupe">
                Consider: (1) Increase your monthly budget, (2) Extend goal deadlines, or (3) Reduce goal amounts.
              </p>
            </div>

            {parseFloat(summary.remaining_unallocated) > 0 && (
              <div className="rounded-lg bg-white p-4">
                <p className="font-sans text-sm text-primary-dark">
                  <span className="font-semibold">You have {fmt(summary.remaining_unallocated)} unallocated.</span>{' '}
                  This is set aside but not yet assigned to any goal. Create new goals to allocate this budget.
                </p>
              </div>
            )}

            {summary.feasible_goals === activeGoals.length && (
              <div className="rounded-lg bg-white p-4">
                <p className="font-sans text-sm text-green-700">
                  <span className="font-semibold">Great job!</span> All your goals are achievable with your current budget and timeline.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {isEarnerMode && hasBudget && hasGoals && activeGoals.length === 0 && (
        <section className="rounded-lg border border-gold/20 bg-white p-8 shadow-sm">
          <p className="font-serif text-2xl font-bold text-primary-dark">
            All active goals are complete
          </p>
          <p className="mt-2 max-w-2xl font-sans text-taupe">
            Budget allocation will resume when you add another active savings goal.
          </p>
        </section>
      )}

      {isEarnerMode && hasBudget && !hasGoals && (
        <section className="rounded-lg border border-gold/20 bg-white p-8 shadow-sm">
          <p className="font-serif text-2xl font-bold text-primary-dark">
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
