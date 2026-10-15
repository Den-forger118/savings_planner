import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { formatMoney } from '../utils/currency';
import { getFriendlyError } from '../utils/friendlyError';
import AdminUserDetail from './AdminUserDetail';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorBanner from '../components/ErrorBanner';

const MENU_WIDTH = 208; // w-52

const getAnchoredMenuStyle = (anchorRect, menuHeight = 120) => {
  if (!anchorRect) return null;

  const gap = 6;
  const viewportPadding = 8;
  const openUpward = anchorRect.bottom + gap + menuHeight > window.innerHeight
    && anchorRect.top > menuHeight + gap;

  let left = anchorRect.right - MENU_WIDTH;
  left = Math.min(left, window.innerWidth - MENU_WIDTH - viewportPadding);
  left = Math.max(viewportPadding, left);

  const top = openUpward
    ? Math.max(viewportPadding, anchorRect.top - gap - menuHeight)
    : Math.min(window.innerHeight - menuHeight - viewportPadding, anchorRect.bottom + gap);

  return { position: 'fixed', top, left, width: MENU_WIDTH, zIndex: 80 };
};

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const COLUMNS = [
  { key: 'full_name', label: 'Full Name' },
  { key: 'monthly_budget', label: 'Monthly Budget' },
  { key: 'goal_count', label: 'Goals' },
  { key: 'email', label: 'Email' },
];

const STATUS_FILTERS = [
  { id: 'all', label: 'All statuses' },
  { id: 'active', label: 'Active' },
  { id: 'deactivated', label: 'Deactivated' },
];

const ROLE_FILTERS = [
  { id: 'all', label: 'All roles' },
  { id: 'member', label: 'Members' },
  { id: 'admin', label: 'Admins' },
];

function MemberActionsMenu({
  member,
  open,
  onOpenChange,
  statusUpdatingId,
  onView,
  onStatusChange,
}) {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);
  const isUpdating = statusUpdatingId === member.user_id;
  const isDeactivated = member.is_active === false;

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuStyle(null);
      return undefined;
    }

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight || 120;
      setMenuStyle(getAnchoredMenuStyle(rect, menuHeight));
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onOpenChange(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div className="inline-flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Actions for ${member.full_name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={isUpdating}
        onClick={(event) => {
          event.stopPropagation();
          onOpenChange(!open);
        }}
        className="inline-flex h-9 w-9 items-center justify-center border border-primary-dark/12 text-taupe transition-colors hover:border-gold/50 hover:bg-cream/60 hover:text-primary-dark disabled:opacity-50"
      >
        <Icon name="more_horiz" className="text-xl" />
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={menuStyle || { position: 'fixed', top: -9999, left: -9999, width: MENU_WIDTH, zIndex: 80 }}
              className="overflow-hidden rounded-md border border-primary-dark/10 bg-white py-1 shadow-lift"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenChange(false);
                  onView(member.user_id);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-sans text-sm text-primary-dark transition-colors hover:bg-cream"
              >
                <Icon name="visibility" className="text-base text-gold" />
                View profile
              </button>

              {!member.is_admin && (
                <button
                  type="button"
                  role="menuitem"
                  disabled={isUpdating}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenChange(false);
                    onStatusChange(member, isDeactivated, event);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left font-sans text-sm transition-colors disabled:opacity-50 ${
                    isDeactivated
                      ? 'text-primary-dark hover:bg-cream'
                      : 'text-red-800 hover:bg-red-50'
                  }`}
                >
                  <Icon
                    name={isDeactivated ? 'person_add' : 'person_off'}
                    className="text-base"
                  />
                  {isUpdating ? 'Saving…' : isDeactivated ? 'Reactivate' : 'Deactivate'}
                </button>
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function MembersFilterMenu({ statusFilter, roleFilter, onStatusChange, onRoleChange, onClear }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const isFiltered = statusFilter !== 'all' || roleFilter !== 'all';

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex min-h-[44px] items-center gap-2 border px-4 py-2.5 font-sans text-xs font-normal uppercase tracking-[0.12em] transition-colors ${
          isFiltered
            ? 'border-primary-dark bg-primary-dark text-cream'
            : 'border-primary-dark/15 text-primary-dark hover:border-gold/50 hover:bg-cream/60'
        }`}
      >
        <Icon name="filter_list" className="text-lg" />
        Filter
        {isFiltered && (
          <span className="font-money text-[11px] font-light tracking-normal opacity-80">
            ·
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 w-56 border border-primary-dark/10 bg-white p-3 shadow-lift"
        >
          <p className="field-label mb-2">Status</p>
          <div className="space-y-1">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={statusFilter === option.id}
                onClick={() => onStatusChange(option.id)}
                className={`flex w-full items-center justify-between px-2.5 py-2 text-left font-sans text-sm transition-colors ${
                  statusFilter === option.id
                    ? 'bg-cream text-primary-dark'
                    : 'text-taupe hover:bg-cream/70 hover:text-primary-dark'
                }`}
              >
                {option.label}
                {statusFilter === option.id && (
                  <Icon name="check" className="text-base text-gold" />
                )}
              </button>
            ))}
          </div>

          <div className="my-3 border-t border-primary-dark/[0.08]" />

          <p className="field-label mb-2">Role</p>
          <div className="space-y-1">
            {ROLE_FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={roleFilter === option.id}
                onClick={() => onRoleChange(option.id)}
                className={`flex w-full items-center justify-between px-2.5 py-2 text-left font-sans text-sm transition-colors ${
                  roleFilter === option.id
                    ? 'bg-cream text-primary-dark'
                    : 'text-taupe hover:bg-cream/70 hover:text-primary-dark'
                }`}
              >
                {option.label}
                {roleFilter === option.id && (
                  <Icon name="check" className="text-base text-gold" />
                )}
              </button>
            ))}
          </div>

          {isFiltered && (
            <>
              <div className="my-3 border-t border-primary-dark/[0.08]" />
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                className="w-full px-2.5 py-2 text-left font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe transition-colors hover:text-primary-dark"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [openActionsUserId, setOpenActionsUserId] = useState(null);

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

  const filteredUsers = useMemo(() => {
    return users.filter((member) => {
      if (statusFilter === 'active' && member.is_active === false) return false;
      if (statusFilter === 'deactivated' && member.is_active !== false) return false;
      if (roleFilter === 'admin' && !member.is_admin) return false;
      if (roleFilter === 'member' && member.is_admin) return false;
      return true;
    });
  }, [users, statusFilter, roleFilter]);

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
    event?.stopPropagation?.();

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
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
            Admin Console
          </p>
          <h2 className="mt-2 font-serif text-4xl font-normal tracking-[-0.03em] text-primary-dark md:text-5xl">
            Platform Members
          </h2>
        </div>
        <MembersFilterMenu
          statusFilter={statusFilter}
          roleFilter={roleFilter}
          onStatusChange={setStatusFilter}
          onRoleChange={setRoleFilter}
          onClear={() => {
            setStatusFilter('all');
            setRoleFilter('all');
          }}
        />
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
            {loading
              ? 'Loading…'
              : `${filteredUsers.length} user${filteredUsers.length === 1 ? '' : 's'}${
                  filteredUsers.length !== users.length ? ` of ${users.length}` : ''
                }`}
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
                      className="flex items-center gap-1 font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe transition-colors hover:text-primary-dark"
                    >
                      {column.label}
                      <Icon name={sortIcon(column.key)} className="text-sm" />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-4 py-10 text-center font-sans text-sm text-taupe">
                    No users match your search or filters.
                  </td>
                </tr>
              )}
              {filteredUsers.map((member) => (
                <tr
                  key={member.user_id}
                  className={`cursor-pointer border-b border-cream/70 transition-colors hover:bg-cream/30 ${member.is_active === false ? 'opacity-70' : ''}`}
                  onClick={() => {
                    setOpenActionsUserId(null);
                    setSelectedUserId(member.user_id);
                  }}
                >
                  <td className="px-4 py-3 font-sans text-sm text-primary-dark">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          member.is_active === false ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                        title={member.is_active === false ? 'Deactivated' : 'Active'}
                        aria-label={member.is_active === false ? 'Deactivated' : 'Active'}
                      />
                      <span className="min-w-0 truncate">{member.full_name}</span>
                      {member.is_admin && (
                        <span className="shrink-0 rounded-lg bg-primary-dark px-2 py-0.5 font-sans text-xs font-normal uppercase tracking-[0.12em] text-cream">
                          Admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-sans text-sm font-normal text-primary-dark">
                    {member.monthly_budget != null
                      ? formatMoney(member.monthly_budget, 'USD', '$')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-primary-dark">
                    {member.goal_count}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="min-w-0 truncate font-sans text-sm text-taupe">
                        {member.email}
                      </span>
                      <span
                        className="inline-flex shrink-0 text-taupe/70 transition-colors hover:text-primary-dark"
                        title={`Joined ${new Date(member.created_at).toLocaleString()}`}
                        aria-label={`Joined ${new Date(member.created_at).toLocaleString()}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Icon name="info" className="text-base leading-none" />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MemberActionsMenu
                      member={member}
                      open={openActionsUserId === member.user_id}
                      onOpenChange={(nextOpen) => {
                        setOpenActionsUserId(nextOpen ? member.user_id : null);
                      }}
                      statusUpdatingId={statusUpdatingId}
                      onView={setSelectedUserId}
                      onStatusChange={handleStatusChange}
                    />
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
