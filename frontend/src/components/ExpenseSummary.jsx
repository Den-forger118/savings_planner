import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../services/api';
import Pagination from './Pagination';
import ExpenseForm from './ExpenseForm';
import ExpenseHistogram from './ExpenseHistogram';
import { formatMoney } from '../utils/currency';
import { getFriendlyError } from '../utils/friendlyError';
import ErrorBanner from './ErrorBanner';
import OdometerNumber from './OdometerNumber';
import ProgressBar from './ProgressBar';

const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

function ExpenseSummary({
  userId,
  currencyCode = 'USD',
  currencySymbol = '$',
  refreshTrigger,
  onExpenseAdded,
  emptyMessage = 'Click Log Expense to record your first transaction.',
}) {
  const fmt = (value) => formatMoney(value, currencyCode, currencySymbol);
  const categoryColor = (item) => item?.category_colour || item?.category_color || '#D4B16D';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const selectedMonth = new Date().getMonth() + 1;
  const selectedYear = new Date().getFullYear();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState('expense_date_desc');
  const hasDataRef = useRef(false);

  useEffect(() => {
    setPage(1);
    hasDataRef.current = false;
  }, [userId, refreshTrigger, sort]);

  const fetchExpenses = useCallback(async () => {
    const isInitial = !hasDataRef.current;
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
      hasDataRef.current = true;
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t load your expenses. Please try again.'));
      if (isInitial) {
        setData(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, selectedMonth, selectedYear, page, limit, sort]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses, refreshTrigger]);

  const months = MONTHS;

  const totalSpent = parseFloat(data?.total_spent || 0);
  const expenseCount = data?.expense_count || 0;
  const avgPerTransaction = expenseCount > 0 ? totalSpent / expenseCount : 0;
  const categories = data?.summary_by_category || [];
  const topCategory = categories.length
    ? categories.reduce((top, cat) =>
        parseFloat(cat.total_spent) > parseFloat(top.total_spent) ? cat : top
      )
    : null;

  const insight = useMemo(() => {
    const money = (value) => formatMoney(value, currencyCode, currencySymbol);
    const monthName = MONTHS[selectedMonth - 1];
    if (!data || expenseCount === 0) {
      return {
        title: 'Start tracking outflow',
        body: 'Log your first expense to build category trends and a monthly spending picture.',
      };
    }
    if (topCategory) {
      const share =
        totalSpent > 0
          ? ((parseFloat(topCategory.total_spent) / totalSpent) * 100).toFixed(0)
          : 0;
      return {
        title: `${topCategory.category_name || 'Uncategorized'} leads`,
        body: `${share}% of this month’s spend · ${money(topCategory.total_spent)} across ${topCategory.transaction_count} entries.`,
      };
    }
    return {
      title: 'Spending in view',
      body: `${expenseCount} expenses logged for ${monthName}. Keep categorizing for clearer trends.`,
    };
  }, [
    data,
    expenseCount,
    topCategory,
    totalSpent,
    selectedMonth,
    currencyCode,
    currencySymbol,
  ]);

  if (loading && !data) {
    return (
      <div className="surface p-6">
        <p className="font-sans text-sm text-taupe">Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className={`mb-10 space-y-5 ${refreshing ? 'opacity-95' : ''}`}>
      {error && <ErrorBanner message={error} />}

      {/* Metrics + insight + action */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="surface-navy flex flex-col justify-between p-5 text-cream lg:col-span-2">
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold/80">
            Total Spent
          </p>
          <div className="mt-3">
            <p className="font-money text-2xl font-light tracking-[0.02em] sm:text-3xl">
              <OdometerNumber value={totalSpent} prefix={currencySymbol} />
            </p>
            <p className="mt-2 font-sans text-xs text-cream/55">
              {months[selectedMonth - 1]} {selectedYear}
            </p>
          </div>
        </div>

        <div className="stat-tile flex flex-col justify-between p-5 lg:col-span-2">
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
            Transactions
          </p>
          <div className="mt-3">
            <p className="font-money text-2xl font-light tracking-[0.02em] text-primary-dark sm:text-3xl">
              <OdometerNumber value={expenseCount} decimals={0} />
            </p>
            <p className="mt-2 font-sans text-xs text-taupe">This month</p>
          </div>
        </div>

        <div className="stat-tile flex flex-col justify-between p-5 lg:col-span-2">
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
            Avg / Entry
          </p>
          <div className="mt-3">
            <p className="font-money text-2xl font-light tracking-[0.02em] text-primary-dark sm:text-3xl">
              <OdometerNumber value={avgPerTransaction} prefix={currencySymbol} />
            </p>
            <p className="mt-2 font-sans text-xs text-taupe">This month</p>
          </div>
        </div>

        <div className="stat-tile flex gap-4 p-5 lg:col-span-4">
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

        <div className="flex flex-col justify-center lg:col-span-2">
          <ExpenseForm
            userId={userId}
            currencyCode={currencyCode}
            currencySymbol={currencySymbol}
            variant="discrete"
            className="w-full [&_button]:w-full [&_button]:py-3"
            onExpenseAdded={onExpenseAdded}
          />
        </div>
      </section>

      {/* Trend + category breakdown */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <ExpenseHistogram
            userId={userId}
            refreshTrigger={refreshTrigger}
            currencyCode={currencyCode}
            currencySymbol={currencySymbol}
          />
        </div>

        <div className="surface overflow-hidden lg:col-span-5">
          <div className="border-b border-primary-dark/[0.06] px-5 py-4">
            <p className="eyebrow">Breakdown</p>
            <h3 className="mt-1 card-title">By Category</h3>
          </div>

          {categories.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-serif text-lg font-light text-primary-dark">No categories yet</p>
              <p className="mt-1 font-sans text-sm text-taupe">
                Category shares appear once you log expenses.
              </p>
            </div>
          ) : (
            <div className="max-h-[360px] space-y-5 overflow-y-auto px-5 py-5">
              {categories.map((cat, idx) => {
                const percentage =
                  totalSpent > 0
                    ? ((parseFloat(cat.total_spent) / totalSpent) * 100)
                    : 0;
                const name = cat.category_name || 'Uncategorized';
                const color = categoryColor(cat);

                return (
                  <div key={`${name}-${idx}`}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate font-sans text-sm font-normal text-primary-dark">
                        {name}
                      </p>
                      <p className="shrink-0 font-money text-xs font-light text-taupe">
                        {fmt(cat.total_spent)} · {percentage.toFixed(0)}%
                      </p>
                    </div>
                    <ProgressBar
                      value={percentage}
                      size="md"
                      rounded="rounded"
                      fillStyle={{ backgroundColor: color }}
                    />
                    <p className="mt-1.5 font-sans text-xs text-taupe">
                      {cat.transaction_count} transaction{cat.transaction_count === 1 ? '' : 's'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Expense list */}
      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-primary-dark/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Ledger</p>
            <h3 className="mt-1 card-title">Expense List</h3>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-primary-dark/12 bg-white px-3.5 py-1.5 font-sans text-sm text-primary-dark focus:border-gold focus:outline-none"
          >
            <option value="expense_date_desc">Newest first</option>
            <option value="amount_desc">Highest amount</option>
            <option value="amount_asc">Lowest amount</option>
          </select>
        </div>

        {!data?.expenses?.length ? (
          <div className="px-5 py-12 text-center">
            <p className="font-serif text-lg font-light text-primary-dark">
              No expenses for {months[selectedMonth - 1]} {selectedYear}
            </p>
            <p className="mt-2 font-sans text-sm text-taupe">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-primary-dark/[0.05]">
              {data.expenses.map((expense) => {
                const name = expense.category_name || 'Uncategorized';
                return (
                  <div
                    key={expense.expense_id}
                    className="flex items-start justify-between gap-4 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-sans text-sm font-normal text-primary-dark">
                        {name}
                      </p>
                      {expense.note ? (
                        <p className="mt-0.5 line-clamp-1 font-sans text-xs text-taupe">
                          {expense.note}
                        </p>
                      ) : null}
                      <p className="mt-1 font-sans text-xs text-taupe">
                        {new Date(expense.expense_date).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="shrink-0 font-money text-sm font-light text-primary-dark">
                      {fmt(expense.amount)}
                    </p>
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
          </>
        )}
      </section>
    </div>
  );
}

export default ExpenseSummary;
