import { useState, useEffect } from 'react';
import api from '../services/api';

function ExpenseSummary({ userId, monthlyBudget, refreshTrigger }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth() + 1
  );
  const [selectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchExpenses();
  }, [userId, selectedMonth, refreshTrigger]);

  const fetchExpenses = async () => {
    try {
      const response = await api.get(
        `/expenses?userId=${userId}&month=${selectedMonth}&year=${selectedYear}`
      );
      setData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setLoading(false);
    }
  };

  const months = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="font-sans text-taupe">Loading expenses...</p>
      </div>
    );
  }

  const totalSpent = parseFloat(data?.total_spent || 0);
  const savingsImpact = monthlyBudget
    ? ((totalSpent / monthlyBudget) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">

      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-3xl font-bold text-primary-dark">
          Expense Tracker
        </h2>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="px-4 py-2 border-2 border-gray-300 rounded-lg font-sans text-sm focus:outline-none focus:border-gold bg-white"
        >
          {months.map((month, idx) => (
            <option key={idx + 1} value={idx + 1}>{month}</option>
          ))}
        </select>
      </div>

      {/* Spending vs Savings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-primary-dark to-primary-dark-alt rounded-lg p-6 text-cream">
          <p className="font-sans text-xs uppercase tracking-wide text-gold-light mb-2">
            Total Spent
          </p>
          <p className="font-serif text-3xl font-bold">${totalSpent.toFixed(2)}</p>
          <p className="font-sans text-xs text-gold-light mt-2">
            {months[selectedMonth - 1]} {selectedYear}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gold">
          <p className="font-sans text-xs text-taupe uppercase tracking-wide mb-2">
            Transactions
          </p>
          <p className="font-serif text-3xl font-bold text-primary-dark">
            {data?.expense_count || 0}
          </p>
          <p className="font-sans text-xs text-taupe mt-2">This month</p>
        </div>

        <div className={`rounded-lg shadow p-6 border-l-4 ${
          savingsImpact > 50
            ? 'bg-red-50 border-red-500'
            : 'bg-green-50 border-green-500'
        }`}>
          <p className="font-sans text-xs text-taupe uppercase tracking-wide mb-2">
            Spending vs Budget
          </p>
          <p className={`font-serif text-3xl font-bold ${
            savingsImpact > 50 ? 'text-red-700' : 'text-green-700'
          }`}>
            {savingsImpact}%
          </p>
          <p className="font-sans text-xs text-taupe mt-2">
            {savingsImpact > 50
              ? '⚠ High spending ratio'
              : '✓ Healthy spending ratio'
            }
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      {data?.summary_by_category?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Category Bars */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-serif text-xl font-bold text-primary-dark mb-6">
              Spending by Category
            </h3>
            <div className="space-y-4">
              {data.summary_by_category.map((cat, idx) => {
                const percentage = totalSpent > 0
                  ? ((parseFloat(cat.total_spent) / totalSpent) * 100).toFixed(1)
                  : 0;
                return (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.category_color || '#D4A574' }}
                        />
                        <p className="font-sans text-sm font-semibold text-primary-dark">
                          {cat.category_name || 'Uncategorized'}
                        </p>
                      </div>
                      <p className="font-serif font-bold text-gold">
                        ${parseFloat(cat.total_spent).toFixed(2)}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: cat.category_color || '#D4A574'
                        }}
                      />
                    </div>
                    <p className="font-sans text-xs text-taupe mt-1">
                      {percentage}% of spending · {cat.transaction_count} transactions
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expense List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-serif text-xl font-bold text-primary-dark mb-6">
              Recent Expenses
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {data.expenses.map(expense => (
                <div
                  key={expense.expense_id}
                  className="flex justify-between items-center p-3 bg-cream rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: expense.category_color || '#D4A574' }}
                    />
                    <div>
                      <p className="font-sans text-sm font-semibold text-primary-dark">
                        {expense.category_name || 'Uncategorized'}
                      </p>
                      {expense.note && (
                        <p className="font-sans text-xs text-taupe">{expense.note}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-serif font-bold text-primary-dark">
                      ${parseFloat(expense.amount).toFixed(2)}
                    </p>
                    <p className="font-sans text-xs text-taupe">
                      {new Date(expense.expense_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="font-sans text-taupe text-lg">
            No expenses logged for {months[selectedMonth - 1]} {selectedYear}.
          </p>
          <p className="font-sans text-taupe text-sm mt-2">
            Log your first expense above to start tracking.
          </p>
        </div>
      )}

      {/* Savings Impact Message */}
      {monthlyBudget && totalSpent > 0 && (
        <div className={`rounded-lg p-6 border-2 ${
          totalSpent > monthlyBudget
            ? 'bg-red-50 border-red-300'
            : 'bg-green-50 border-green-300'
        }`}>
          <h3 className="font-serif text-xl font-bold text-primary-dark mb-2">
            💡 Savings Impact
          </h3>
          {totalSpent > monthlyBudget ? (
            <p className="font-sans text-red-700">
              ⚠ You spent <strong>${totalSpent.toFixed(2)}</strong> this month but your savings budget is only <strong>${monthlyBudget.toFixed(2)}</strong>. Your expenses are exceeding your planned savings budget.
            </p>
          ) : (
            <p className="font-sans text-green-700">
              ✓ You spent <strong>${totalSpent.toFixed(2)}</strong> this month. Your savings budget of <strong>${monthlyBudget.toFixed(2)}</strong> is intact.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default ExpenseSummary;