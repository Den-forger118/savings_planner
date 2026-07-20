import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { formatMoney } from '../utils/currency';
import { getFriendlyError } from '../utils/friendlyError';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorBanner from '../components/ErrorBanner';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

function AdminUserDetail({ userId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/admin/users/${userId}`);
      setData(response.data);
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t load this member’s details. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleStatusChange = (nextActive) => {
    if (!data?.user) return;

    setConfirmDialog({
      nextActive,
      title: nextActive
        ? `Reactivate ${data.user.full_name}?`
        : `Deactivate ${data.user.full_name}?`,
      message: nextActive
        ? 'They will be able to log in again.'
        : 'They will not be able to log in, but their data will be preserved.',
      confirmLabel: nextActive ? 'Reactivate' : 'Deactivate',
      tone: nextActive ? 'warning' : 'danger',
    });
  };

  const executeStatusChange = async () => {
    if (!confirmDialog) return;

    const { nextActive } = confirmDialog;
    const action = nextActive ? 'reactivate' : 'deactivate';

    setStatusUpdating(true);
    setStatusError(null);

    try {
      await api.patch(`/admin/users/${userId}/status`, { is_active: nextActive });
      setConfirmDialog(null);
      await fetchDetail();
    } catch (err) {
      setStatusError(
        getFriendlyError(err, `We couldn’t ${action} that account. Please try again.`)
      );
      setConfirmDialog(null);
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 font-sans text-sm text-taupe hover:text-primary-dark"
        >
          ← Back to members
        </button>
        <ErrorBanner message={error || 'We couldn’t find that member.'} />
      </div>
    );
  }

  const { user, goals, transactions, expenses, counts } = data;
  const currencyCode = user.currency || 'USD';
  const currencySymbol = user.currency_symbol || '$';
  const money = (value) => formatMoney(value, currencyCode, currencySymbol);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-4 flex items-center gap-1 font-sans text-sm text-taupe transition-colors hover:text-primary-dark"
          >
            ← Back to members
          </button>
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
            Member Support View
          </p>
          <h2 className="mt-2 font-serif text-4xl font-normal tracking-[-0.03em] text-primary-dark">
            {user.full_name}
          </h2>
          <p className="mt-2 font-sans text-sm text-taupe">{user.email}</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cream bg-cream/50 px-3 py-1.5 font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
            <Icon name="visibility" className="text-sm" />
            Read-only
          </span>
          <span
            className={`inline-flex rounded-full px-3 py-1.5 font-sans text-xs font-normal uppercase tracking-[0.12em] ${
              user.is_active === false
                ? 'bg-red-100 text-red-700'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {user.is_active === false ? 'Deactivated' : 'Active'}
            {user.is_admin ? ' · Admin' : ''}
          </span>
          {!user.is_admin && (
            <button
              type="button"
              disabled={statusUpdating}
              onClick={() => handleStatusChange(user.is_active === false)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-sans text-xs font-normal uppercase tracking-[0.12em] transition-colors disabled:opacity-50 ${
                user.is_active === false
                  ? 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                  : 'border-red-300 text-red-700 hover:bg-red-50'
              }`}
            >
              <Icon
                name={user.is_active === false ? 'person_add' : 'person_off'}
                className="text-sm"
              />
              {statusUpdating
                ? 'Saving…'
                : user.is_active === false
                  ? 'Reactivate account'
                  : 'Deactivate account'}
            </button>
          )}
        </div>
      </div>

      {statusError && <ErrorBanner message={statusError} />}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Mode', user.mode === 'earner' ? 'Earner' : 'Non-Earner'],
          ['Monthly Budget', user.monthly_budget != null ? money(user.monthly_budget) : '—'],
          ['Currency', `${user.currency} (${currencySymbol})`],
          ['Joined', formatDate(user.created_at)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-cream bg-white p-4 shadow-sm">
            <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">{label}</p>
            <p className="mt-1 font-sans text-sm font-normal text-primary-dark">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-cream bg-white shadow-sm">
        <div className="border-b border-cream px-5 py-4">
          <h3 className="font-serif text-2xl font-light tracking-[-0.02em] text-primary-dark">Goals ({counts.goals})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-cream bg-cream/30">
                {['Name', 'Target', 'Saved', 'Progress', 'Deadline', 'Status'].map((label) => (
                  <th key={label} className="px-4 py-3 font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {goals.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center font-sans text-sm text-taupe">
                    No goals recorded.
                  </td>
                </tr>
              )}
              {goals.map((goal) => (
                <tr key={goal.goal_id} className="border-b border-cream/70">
                  <td className="px-4 py-3 font-sans text-sm font-normal text-primary-dark">{goal.name}</td>
                  <td className="px-4 py-3 font-money text-sm text-primary-dark">{money(goal.target_amount)}</td>
                  <td className="px-4 py-3 font-money text-sm text-primary-dark">{money(goal.saved_amount)}</td>
                  <td className="px-4 py-3 font-money text-sm text-primary-dark">
                    {parseFloat(goal.percentage_complete || 0).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-taupe">
                    {goal.deadline ? new Date(goal.deadline).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-taupe">
                    {goal.is_complete ? 'Complete' : goal.is_paused ? 'On hold' : goal.on_track ? 'On track' : 'Behind'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-cream bg-white shadow-sm">
        <div className="border-b border-cream px-5 py-4">
          <h3 className="font-serif text-2xl font-light tracking-[-0.02em] text-primary-dark">Transactions ({counts.transactions})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-cream bg-cream/30">
                {['Date', 'Goal', 'Type', 'Amount', 'Note'].map((label) => (
                  <th key={label} className="px-4 py-3 font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center font-sans text-sm text-taupe">
                    No transactions recorded.
                  </td>
                </tr>
              )}
              {transactions.map((tx) => (
                <tr key={tx.transaction_id} className="border-b border-cream/70">
                  <td className="px-4 py-3 font-sans text-sm text-taupe">{formatDate(tx.created_at)}</td>
                  <td className="px-4 py-3 font-sans text-sm text-primary-dark">{tx.goal_name || '—'}</td>
                  <td className="px-4 py-3 font-sans text-sm capitalize text-primary-dark">{tx.type}</td>
                  <td className={`px-4 py-3 font-money text-sm font-light ${tx.type === 'withdrawal' ? 'text-red-700' : 'text-primary-dark'}`}>
                    {tx.type === 'withdrawal' ? '−' : '+'}{money(tx.amount)}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-taupe">{tx.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-cream bg-white shadow-sm">
        <div className="border-b border-cream px-5 py-4">
          <h3 className="font-serif text-2xl font-light tracking-[-0.02em] text-primary-dark">Expenses ({counts.expenses})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-cream bg-cream/30">
                {['Date', 'Category', 'Amount', 'Note'].map((label) => (
                  <th key={label} className="px-4 py-3 font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center font-sans text-sm text-taupe">
                    No expenses recorded.
                  </td>
                </tr>
              )}
              {expenses.map((expense) => (
                <tr key={expense.expense_id} className="border-b border-cream/70">
                  <td className="px-4 py-3 font-sans text-sm text-taupe">
                    {expense.expense_date ? new Date(expense.expense_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-primary-dark">
                    {expense.category_name || 'Uncategorized'}
                  </td>
                  <td className="px-4 py-3 font-money text-sm font-normal text-primary-dark">
                    {money(expense.amount)}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-taupe">{expense.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmLabel={confirmDialog?.confirmLabel || 'Confirm'}
        tone={confirmDialog?.tone || 'danger'}
        loading={statusUpdating}
        onConfirm={executeStatusChange}
        onCancel={() => {
          if (!statusUpdating) setConfirmDialog(null);
        }}
      />
    </div>
  );
}

export default AdminUserDetail;
