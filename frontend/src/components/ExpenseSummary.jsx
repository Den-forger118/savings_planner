import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from './Pagination';
import ExpenseForm from './ExpenseForm';
import { formatMoney } from '../utils/currency';

function ExpenseSummary({
  userId,
  monthlyBudget,
  isEarnerMode = false,
  currencyCode = 'USD',
  currencySymbol = '$',
  refreshTrigger,
  onExpenseAdded,
  emptyMessage = 'Click Log Expense to record your first transaction.'
}) {
  const fmt = (value) => formatMoney(value, currencyCode, currencySymbol);
  const categoryColor = (item) => item?.category_colour || item?.category_color || '#D4A574';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const selectedMonth = new Date().getMonth() + 1;
  const selectedYear = new Date().getFullYear();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState('expense_date_desc');

  useEffect(() => {
    setPage(1);
  }, [userId, refreshTrigger, sort]);

  useEffect(() => {
    fetchExpenses();
  }, [userId, refreshTrigger, page, limit, sort]);

  const fetchExpenses = async () => {
    setLoading(true);

    try {
      const response = await api.get(
        `/expenses?userId=${userId}&month=${selectedMonth}&year=${selectedYear}&page=${page}&limit=${limit}&sort=${sort}`
      );
      setData(response.data);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setData(null);
    } finally {
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
  const budgetAmount = parseFloat(monthlyBudget);
  const hasBudget = isEarnerMode && Number.isFinite(budgetAmount) && budgetAmount > 0;
  const savingsImpact = hasBudget
    ? ((totalSpent / budgetAmount) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-3xl font-bold text-primary-dark">
          Expense Tracker
        </h2>
        <ExpenseForm
          userId={userId}
          currencyCode={currencyCode}
          currencySymbol={currencySymbol}
          variant="discrete"
          onExpenseAdded={onExpenseAdded}
        />
      </div>

      {/* Spending vs Savings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-primary-dark to-primary-dark-alt rounded-lg p-6 text-cream">
          <p className="font-sans text-xs uppercase tracking-wide text-gold-light mb-2">
            Total Spent
          </p>
          <p className="font-money text-3xl font-bold">{fmt(totalSpent)}</p>
          <p className="font-sans text-xs text-gold-light mt-2">
            {months[selectedMonth - 1]} {selectedYear}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gold">
          <p className="font-sans text-xs text-taupe uppercase tracking-wide mb-2">
            Transactions
          </p>
          <p className="font-money text-3xl font-bold text-primary-dark">
            {data?.expense_count || 0}
          </p>
          <p className="font-sans text-xs text-taupe mt-2">This month</p>
        </div>

        {hasBudget ? (
        <div className={`rounded-lg shadow p-6 border-l-4 ${
          savingsImpact > 50
            ? 'bg-red-50 border-red-500'
            : 'bg-green-50 border-green-500'
        }`}>
          <p className="font-sans text-xs text-taupe uppercase tracking-wide mb-2">
            Spending vs Budget
          </p>
          <p className={`font-money text-3xl font-bold ${
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
        ) : (
        <div className="rounded-lg shadow p-6 border-l-4 border-cream bg-white">
          <p className="font-sans text-xs text-taupe uppercase tracking-wide mb-2">
            Savings Mode
          </p>
          <p className="font-serif text-xl font-bold text-primary-dark">
            {isEarnerMode ? 'Set budget to compare' : 'Non-Earner'}
          </p>
          <p className="font-sans text-xs text-taupe mt-2">
            {isEarnerMode
              ? 'Add a monthly mandate to track spending against your savings budget.'
              : 'Expense tracking without budget comparison.'}
          </p>
        </div>
        )}
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
                          style={{ backgroundColor: categoryColor(cat) }}
                        />
                        <p className="font-sans text-sm font-semibold text-primary-dark">
                          {cat.category_name || 'Uncategorized'}
                        </p>
                      </div>
                      <p className="font-money font-bold text-gold">
                        {fmt(cat.total_spent)}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: categoryColor(cat)
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
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-cream px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-serif text-xl font-bold text-primary-dark">
                Expense List
              </h3>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-lg border border-cream bg-white px-3 py-2 font-sans text-sm focus:border-gold focus:outline-none"
              >
                <option value="expense_date_desc">Newest first</option>
                <option value="amount_desc">Highest amount</option>
                <option value="amount_asc">Lowest amount</option>
              </select>
            </div>
            <div className="space-y-3 px-6 py-4">
              {data.expenses.map(expense => (
                <div
                  key={expense.expense_id}
                  className="flex justify-between items-center p-3 bg-cream rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: categoryColor(expense) }}
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
                    <p className="font-money font-bold text-primary-dark">
                      {fmt(expense.amount)}
                    </p>
                    <p className="font-sans text-xs text-taupe">
                      {new Date(expense.expense_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              pagination={data.pagination}
              onPageChange={setPage}
              onLimitChange={(nextLimit) => {
                setLimit(nextLimit);
                setPage(1);
              }}
              limitOptions={[10, 25, 50]}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="font-sans text-taupe text-lg">
            No expenses logged for {months[selectedMonth - 1]} {selectedYear}.
          </p>
          <p className="font-sans text-taupe text-sm mt-2">
            {emptyMessage}
          </p>
        </div>
      )}

      {hasBudget && totalSpent > 0 && (
        <div className={`flex items-start gap-2 rounded-md border px-3 py-2 ${
          totalSpent > budgetAmount
            ? 'border-red-200 bg-red-50'
            : 'border-green-200 bg-green-50'
        }`}>
          <span className={`mt-0.5 font-sans text-xs ${
            totalSpent > budgetAmount ? 'text-red-600' : 'text-green-600'
          }`}>
            {totalSpent > budgetAmount ? '⚠' : '✓'}
          </span>
          <p className={`font-sans text-xs leading-snug ${
            totalSpent > budgetAmount ? 'text-red-700' : 'text-green-700'
          }`}>
            {totalSpent > budgetAmount ? (
              <>
                Spent <strong>{fmt(totalSpent)}</strong> against a <strong>{fmt(budgetAmount)}</strong> budget — expenses exceed your savings plan.
              </>
            ) : (
              <>
                Spent <strong>{fmt(totalSpent)}</strong> this month. Budget of <strong>{fmt(budgetAmount)}</strong> is intact.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export default ExpenseSummary;
