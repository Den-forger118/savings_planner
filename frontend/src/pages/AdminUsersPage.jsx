import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { formatMoney } from '../utils/currency';
import { getFriendlyError } from '../utils/friendlyError';
import AdminUserDetail from './AdminUserDetail';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorBanner from '../components/ErrorBanner';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const COLUMNS = [
  { key: 'user_id', label: 'ID' },
  { key: 'full_name', label: 'Full Name' },
  { key: 'email', label: 'Email' },
  { key: 'is_active', label: 'Status' },
  { key: 'monthly_budget', label: 'Monthly Budget' },
  { key: 'goal_count', label: 'Goals' },
  { key: 'created_at', label: 'Joined' },
];

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/admin/users', {
        params: { search, sort, order },
      });
      setUsers(response.data.users || []);
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t load members right now. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [search, sort, order]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleSort = (columnKey) => {
    if (sort === columnKey) {
      setOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSort(columnKey);
    setOrder('asc');
  };

  const sortIcon = (columnKey) => {
    if (sort !== columnKey) return 'unfold_more';
    return order === 'asc' ? 'arrow_upward' : 'arrow_downward';
  };

  const handleStatusChange = (member, nextActive, event) => {
    event.stopPropagation();

    setConfirmDialog({
      member,
      nextActive,
      title: nextActive
        ? `Reactivate ${member.full_name}?`
        : `Deactivate ${member.full_name}?`,
      message: nextActive
        ? 'They will be able to log in again.'
        : 'They will not be able to log in, but their data will be preserved.',
      confirmLabel: nextActive ? 'Reactivate' : 'Deactivate',
      tone: nextActive ? 'warning' : 'danger',
    });
  };

  const executeStatusChange = async () => {
    if (!confirmDialog) return;

    const { member, nextActive } = confirmDialog;
    const action = nextActive ? 'reactivate' : 'deactivate';

    setStatusUpdatingId(member.user_id);
    setStatusError(null);

    try {
      await api.patch(`/admin/users/${member.user_id}/status`, {
        is_active: nextActive,
      });
      setConfirmDialog(null);
      await fetchUsers();
    } catch (err) {
      setStatusError(
        getFriendlyError(err, `We couldn’t ${action} that account. Please try again.`)
      );
      setConfirmDialog(null);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  if (selectedUserId) {
    return (
      <AdminUserDetail
        userId={selectedUserId}
        onBack={() => setSelectedUserId(null)}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="font-sans text-[10px] font-normal uppercase tracking-[0.14em] text-gold">
          Admin Console
        </p>
        <h2 className="mt-2 font-serif text-4xl font-normal tracking-[-0.03em] text-primary-dark md:text-5xl">
          Platform Members
        </h2>
        <p className="mt-3 max-w-2xl font-sans text-base text-taupe">
          Monitor registered users, savings mandates, and goal activity across QUANT.
          Click a member to open a read-only support view.
        </p>
      </section>

      <section className="rounded-lg border border-cream bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-cream px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-taupe"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-cream py-2.5 pl-10 pr-3 font-sans text-sm focus:border-gold focus:outline-none"
            />
          </div>
          <p className="font-sans text-sm text-taupe">
            {loading ? 'Loading…' : `${users.length} user${users.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {error && (
          <div className="border-b border-cream px-5 py-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {statusError && (
          <div className="border-b border-cream px-5 py-4">
            <ErrorBanner message={statusError} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-cream bg-cream/30">
                {COLUMNS.map((column) => (
                  <th key={column.key} className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-1 font-sans text-[10px] font-normal uppercase tracking-[0.14em] text-taupe transition-colors hover:text-primary-dark"
                    >
                      {column.label}
                      <Icon name={sortIcon(column.key)} className="text-sm" />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 font-sans text-[10px] font-normal uppercase tracking-[0.14em] text-taupe">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-4 py-10 text-center font-sans text-sm text-taupe">
                    No users match your search.
                  </td>
                </tr>
              )}
              {users.map((member) => (
                <tr
                  key={member.user_id}
                  className={`cursor-pointer border-b border-cream/70 transition-colors hover:bg-cream/30 ${member.is_active === false ? 'opacity-70' : ''}`}
                  onClick={() => setSelectedUserId(member.user_id)}
                >
                  <td className="px-4 py-3 font-sans text-sm font-normal text-primary-dark">
                    {member.user_id}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-primary-dark">
                    <div className="flex items-center gap-2">
                      {member.full_name}
                      {member.is_admin && (
                        <span className="rounded-full bg-primary-dark px-2 py-0.5 font-sans text-[9px] font-normal uppercase tracking-[0.14em] text-cream">
                          Admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-taupe">
                    {member.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 font-sans text-[10px] font-normal uppercase tracking-[0.14em] ${
                        member.is_active === false
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {member.is_active === false ? 'Deactivated' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-sans text-sm font-normal text-primary-dark">
                    {member.monthly_budget != null
                      ? formatMoney(member.monthly_budget, 'USD', '$')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-primary-dark">
                    {member.goal_count}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-taupe">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedUserId(member.user_id);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-gold/40 px-2.5 py-1 font-sans text-[10px] font-normal uppercase tracking-[0.14em] text-gold transition-colors hover:bg-gold hover:text-primary-dark"
                      >
                        <Icon name="visibility" className="text-sm" />
                        View
                      </button>
                      {!member.is_admin && (
                        <button
                          type="button"
                          disabled={statusUpdatingId === member.user_id}
                          onClick={(event) => handleStatusChange(member, member.is_active === false, event)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-sans text-[10px] font-normal uppercase tracking-[0.14em] transition-colors disabled:opacity-50 ${
                            member.is_active === false
                              ? 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                              : 'border-red-300 text-red-700 hover:bg-red-50'
                          }`}
                        >
                          <Icon
                            name={member.is_active === false ? 'person_add' : 'person_off'}
                            className="text-sm"
                          />
                          {statusUpdatingId === member.user_id
                            ? 'Saving…'
                            : member.is_active === false
                              ? 'Reactivate'
                              : 'Deactivate'}
                        </button>
                      )}
                    </div>
                  </td>
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
        loading={Boolean(statusUpdatingId)}
        onConfirm={executeStatusChange}
        onCancel={() => {
          if (!statusUpdatingId) setConfirmDialog(null);
        }}
      />
    </div>
  );
}

export default AdminUsersPage;
