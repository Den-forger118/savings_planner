import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from './Pagination';
import ExpenseForm from './ExpenseForm';
import { formatMoney } from '../utils/currency';
import { getFriendlyError } from '../utils/friendlyError';
import ErrorBanner from './ErrorBanner';
import OdometerNumber from './OdometerNumber';
import ProgressBar from './ProgressBar';

function ExpenseSummary({
  userId,
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
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
    const isInitial = data === null;
    if (isInitial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const response = await api.get(
        `/expenses?userId=${userId}&month=${selectedMonth}&year=${selectedYear}&page=${page}&limit=${limit}&sort=${sort}`
      );
      setData(response.data);
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t load your expenses. Please try again.'));
      if (isInitial) {
        setData(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const months = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ];

  if (loading && !data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="font-sans text-taupe">Loading expenses...</p>
      </div>
    );
  }

  const totalSpent = parseFloat(data?.total_spent || 0);
  const expenseCount = data?.expense_count || 0;
  const avgPerTransaction = expenseCount > 0 ? totalSpent / expenseCount : 0;

  return (
    <div className={`space-y-6 ${refreshing ? 'opacity-95' : ''}`}>

      {error && (
        <ErrorBanner message={error} />
      )}

      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-3xl font-light tracking-[-0.02em] text-primary-dark">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-gradient-to-br from-primary-dark to-primary-dark-alt p-6 text-cream">
          <p className="mb-2 font-sans text-xs uppercase tracking-wide text-gold-light">
            Total Spent
          </p>
          <p className="font-money text-2xl font-light tracking-[0.02em] sm:text-3xl">
            <OdometerNumber value={totalSpent} prefix={currencySymbol} />
          </p>
          <p className="mt-2 font-sans text-xs text-gold-light">
            {months[selectedMonth - 1]} {selectedYear}
          </p>
        </div>

        <div className="rounded-lg border border-primary-dark/[0.08] bg-white p-6 shadow-soft">
          <p className="mb-2 font-sans text-xs uppercase tracking-wide text-taupe">
            Transactions
          </p>
          <p className="font-money text-2xl font-light tracking-[0.02em] sm:text-3xl text-primary-dark">
            <OdometerNumber value={expenseCount} decimals={0} />
          </p>
          <p className="mt-2 font-sans text-xs text-taupe">This month</p>
        </div>

        <div className="rounded-lg border border-primary-dark/[0.08] bg-white p-6 shadow-soft">
          <p className="mb-2 font-sans text-xs uppercase tracking-wide text-taupe">
            Avg / Transaction
          </p>
          <p className="font-money text-2xl font-light tracking-[0.02em] sm:text-3xl text-primary-dark">
            <OdometerNumber value={avgPerTransaction} prefix={currencySymbol} />
          </p>
          <p className="mt-2 font-sans text-xs text-taupe">This month</p>
        </div>
      </div>

      {data?.summary_by_category?.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-6 font-serif text-xl font-light tracking-[-0.015em] text-primary-dark">
              Spending by Category
            </h3>
            <div className="space-y-4">
              {data.summary_by_category.map((cat, idx) => {
                const percentage = totalSpent > 0
                  ? ((parseFloat(cat.total_spent) / totalSpent) * 100).toFixed(1)
                  : 0;
                const name = cat.category_name || 'Uncategorized';
                const color = categoryColor(cat);

                return (
                  <div key={idx}>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-sans text-sm font-normal text-primary-dark">
                        {name}
                      </p>
                      <p className="font-money font-light text-primary-dark">
                        {fmt(cat.total_spent)}
                      </p>
                    </div>
                    <ProgressBar
                      value={percentage}
                      size="lg"
                      rounded="rounded-full"
                      trackClassName="bg-gray-200"
                      fillClassName=""
                      fillStyle={{ backgroundColor: color }}
                    />
                    <p className="mt-1 font-sans text-xs text-taupe">
                      {percentage}% of spending · {cat.transaction_count} transactions
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="flex flex-col gap-3 border-b border-cream px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-serif text-xl font-light tracking-[-0.015em] text-primary-dark">
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
              {data.expenses.map((expense) => {
                const name = expense.category_name || 'Uncategorized';

                return (
                  <div
                    key={expense.expense_id}
                    className="flex items-center justify-between rounded-lg bg-cream p-3"
                  >
                    <div>
                      <p className="font-sans text-sm font-normal text-primary-dark">
                        {name}
                      </p>
                      {expense.note && (
                        <p className="font-sans text-xs text-taupe">{expense.note}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-money font-light text-primary-dark">
                        {fmt(expense.amount)}
                      </p>
                      <p className="font-sans text-xs text-taupe">
                        {new Date(expense.expense_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
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
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <p className="font-sans text-lg text-taupe">
            No expenses logged for {months[selectedMonth - 1]} {selectedYear}.
          </p>
          <p className="mt-2 font-sans text-sm text-taupe">
            {emptyMessage}
          </p>
        </div>
      )}

    </div>
  );
}

export default ExpenseSummary;
