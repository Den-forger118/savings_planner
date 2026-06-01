import { useState, useEffect } from 'react';


function Dashboard({ userId, monthlyBudget, goals }) {
  const [budgetBreakdown, setBudgetBreakdown] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateDashboard();
  }, [goals, monthlyBudget]);

  const calculateDashboard = () => {
    if (!goals.length || !monthlyBudget) {
      setLoading(false);
      return;
    }

    // Calculate allocation breakdown
    const breakdown = goals.map(goal => ({
      goal_id: goal.goal_id,
      name: goal.name,
      allocated: parseFloat(goal.allocated_monthly_amount),
      needed: parseFloat(goal.savings_needed.monthly),
      shortfall: Math.max(0, parseFloat(goal.savings_needed.monthly) - parseFloat(goal.allocated_monthly_amount)),
      feasible: goal.is_feasible
    }));

    // Calculate summary stats
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
      budget_utilization: (totalAllocated / monthlyBudget * 100).toFixed(1),
      remaining_unallocated: (monthlyBudget - totalAllocated).toFixed(2)
    });

    setBudgetBreakdown(breakdown);
    setLoading(false);
  };

  if (loading || !summary) {
    return null;
  }

  return (
    <div className="space-y-8 mb-12">
      
      {/* Key Metrics */}
      <section>
        <h2 className="font-serif text-3xl font-bold text-primary-dark mb-6">
          Budget Overview
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Monthly Budget */}
          <div className="bg-gradient-to-br from-primary-dark to-primary-dark-alt rounded-lg shadow p-6 text-cream">
            <p className="font-sans text-xs uppercase tracking-wide text-gold-light mb-2">Your Monthly Budget</p>
            <p className="font-serif text-3xl font-bold">${monthlyBudget.toFixed(2)}</p>
            <p className="font-sans text-xs text-gold-light mt-2">Total available to save</p>
          </div>

          {/* Total Allocated */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gold">
            <p className="font-sans text-xs text-taupe uppercase tracking-wide mb-2">Allocated to Goals</p>
            <p className="font-serif text-3xl font-bold text-primary-dark">${summary.total_allocated.toFixed(2)}</p>
            <p className="font-sans text-xs text-taupe mt-2">{summary.budget_utilization}% of budget</p>
          </div>

          {/* Remaining */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gold-light">
            <p className="font-sans text-xs text-taupe uppercase tracking-wide mb-2">Unallocated</p>
            <p className="font-serif text-3xl font-bold text-primary-dark">${summary.remaining_unallocated}</p>
            <p className="font-sans text-xs text-taupe mt-2">Available for new goals</p>
          </div>

          {/* Goals Status */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gold">
            <p className="font-sans text-xs text-taupe uppercase tracking-wide mb-2">Goals Status</p>
            <div className="flex gap-4">
              <div>
                <p className="font-serif text-2xl font-bold text-green-600">{summary.feasible_goals}</p>
                <p className="font-sans text-xs text-taupe">Feasible</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-bold text-orange-600">{summary.underfunded_goals}</p>
                <p className="font-sans text-xs text-taupe">Underfunded</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Budget Allocation Breakdown */}
      <section>
        <h2 className="font-serif text-3xl font-bold text-primary-dark mb-6">
          How Your Budget is Allocated
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Allocation Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-serif text-xl font-bold text-primary-dark mb-6">Monthly Allocation</h3>
            
            <div className="space-y-4">
              {budgetBreakdown.map((goal, idx) => (
                <div key={goal.goal_id}>
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-sans text-sm font-semibold text-primary-dark">{goal.name}</p>
                    <p className="font-serif font-bold text-gold">${goal.allocated.toFixed(2)}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-gold to-gold-light h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(goal.allocated / monthlyBudget) * 100}%` }}
                    ></div>
                  </div>
                  <p className="font-sans text-xs text-taupe mt-1">
                    {((goal.allocated / monthlyBudget) * 100).toFixed(1)}% of budget
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-serif text-xl font-bold text-primary-dark mb-6">Allocation Details</h3>
            
            <div className="space-y-4">
              {budgetBreakdown.map(goal => (
                <div 
                  key={goal.goal_id}
                  className={`p-4 rounded-lg border-l-4 ${
                    goal.feasible 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-orange-50 border-orange-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-sans font-semibold text-primary-dark">{goal.name}</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
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
                      <p className="font-serif font-bold text-primary-dark">${goal.allocated.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-sans text-xs text-taupe">Needed</p>
                      <p className="font-serif font-bold text-primary-dark">${goal.needed.toFixed(2)}</p>
                    </div>
                  </div>

                  {goal.shortfall > 0 && (
                    <div className="mt-3 pt-3 border-t border-orange-200">
                      <p className="font-sans text-xs text-orange-700">
                         Shortfall: ${goal.shortfall.toFixed(2)}/month
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Smart Insights */}
      {summary.underfunded_goals > 0 && (
        <section className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-8 border-2 border-orange-200">
          <h2 className="font-serif text-2xl font-bold text-orange-900 mb-4">
            💡 Budget Recommendations
          </h2>
          
          <div className="space-y-3">
            {summary.underfunded_goals > 0 && (
              <div className="bg-white rounded-lg p-4">
                <p className="font-sans text-sm text-primary-dark">
                  <span className="font-semibold">You have {summary.underfunded_goals} underfunded goal(s).</span> You need ${summary.total_shortfall.toFixed(2)}/month more to fully fund all goals.
                </p>
                <p className="font-sans text-xs text-taupe mt-2">
                  Consider: (1) Increase your monthly budget, (2) Extend goal deadlines, or (3) Reduce goal amounts.
                </p>
              </div>
            )}

            {summary.remaining_unallocated > 0 && (
              <div className="bg-white rounded-lg p-4">
                <p className="font-sans text-sm text-primary-dark">
                  <span className="font-semibold">You have ${summary.remaining_unallocated} unallocated.</span> This is set aside but not yet assigned to any goal. Create new goals to allocate this budget.
                </p>
              </div>
            )}

            {summary.feasible_goals === goals.length && (
              <div className="bg-white rounded-lg p-4">
                <p className="font-sans text-sm text-green-700">
                  ✓ <span className="font-semibold">Great job!</span> All your goals are achievable with your current budget and timeline.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default Dashboard;