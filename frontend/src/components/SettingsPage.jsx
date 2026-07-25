import { useEffect, useMemo, useState, useCallback } from 'react';
import api from '../services/api';
import BudgetSetup from './BudgetSetup';
import EarnerModeToggle from './EarnerModeToggle';
import FeatureGuide from './FeatureGuide';
import ConfirmDialog from './ConfirmDialog';
import ErrorBanner from './ErrorBanner';
import { getFriendlyError } from '../utils/friendlyError';
import {
  ONBOARDING_CURRENCIES,
  FISCAL_MONTHS,
  defaultAlertPreferences,
  formatMoney,
  getCurrencyByCode,
} from '../utils/currency';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'financial', label: 'Financial', icon: 'account_balance' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'data', label: 'Data', icon: 'database' },
  { id: 'trash', label: 'Trash', icon: 'delete' },
  { id: 'help', label: 'Help', icon: 'help' },
];

const RUNWAY_OPTIONS = [50, 75, 90];

const getTokenExpiry = (token) => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? new Date(payload.exp * 1000) : null;
  } catch {
    return null;
  }
};

const parsePreferences = (user) => ({
  ...defaultAlertPreferences(),
  ...(user?.preferences && typeof user.preferences === 'object' ? user.preferences : {}),
});

function SettingsPage({
  user,
  isEarnerMode,
  hasBudget,
  monthlyBudget,
  onUserUpdate,
  onBudgetSet,
  onEarnerModeChange,
  onLogout,
  onDensityChange,
  onNavigate,
  onGoalsChange,
}) {
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [currencySymbol, setCurrencySymbol] = useState(user?.currency_symbol || '$');
  const [uiDensity, setUiDensity] = useState(user?.ui_density || 'classic');
  const [fiscalStartMonth, setFiscalStartMonth] = useState(user?.fiscal_start_month || 1);
  const [alertPrefs, setAlertPrefs] = useState(parsePreferences(user));

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#D4B16D');

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);

  const [trashGoals, setTrashGoals] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashActionId, setTrashActionId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    setCurrency(user?.currency || 'USD');
    setCurrencySymbol(user?.currency_symbol || '$');
    setUiDensity(user?.ui_density || 'classic');
  }, [user?.currency, user?.currency_symbol, user?.ui_density]);

  const persistDensity = async (nextDensity) => {
    try {
      const response = await api.put(`/users/${user.user_id}/preferences`, {
        ui_density: nextDensity,
        fiscal_start_month: fiscalStartMonth,
        preferences: alertPrefs,
        currency,
        currency_symbol: currencySymbol,
      });
      onUserUpdate(response.data.user);
    } catch (err) {
      flash(err, true);
    }
  };

  const selectDensity = (nextDensity) => {
    setUiDensity(nextDensity);
    onDensityChange?.(nextDensity);
    persistDensity(nextDensity);
  };

  const tokenExpiry = useMemo(
    () => getTokenExpiry(localStorage.getItem('token')),
    []
  );

  const flash = useCallback((text, isError = false) => {
    if (isError) {
      setError(getFriendlyError(text, typeof text === 'string' ? text : 'Something didn’t go through. Please try again.'));
      setMessage(null);
    } else {
      setMessage(text);
      setError(null);
    }
    window.clearTimeout(flash.timeoutId);
    flash.timeoutId = window.setTimeout(() => {
      setError(null);
      setMessage(null);
    }, 4000);
  }, []);

  const loadTrash = useCallback(async () => {
    setTrashLoading(true);
    try {
      const response = await api.get(`/goals/trash?userId=${user.user_id}`);
      setTrashGoals(response.data.goals || []);
    } catch {
      flash('We couldn’t load your trash right now.', true);
    } finally {
      setTrashLoading(false);
    }
  }, [user.user_id, flash]);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const response = await api.get(`/expenses/categories?userId=${user.user_id}`);
      setCategories(response.data.categories || []);
    } catch {
      flash('We couldn’t load your categories right now.', true);
    } finally {
      setCategoriesLoading(false);
    }
  }, [user.user_id, flash]);

  useEffect(() => {
    if (activeTab === 'financial') {
      loadCategories();
    }
    if (activeTab === 'trash') {
      loadTrash();
    }
  }, [activeTab, loadCategories, loadTrash]);

  const handleRestoreGoal = async (goalId) => {
    setTrashActionId(goalId);
    try {
      const response = await api.post(`/goals/${goalId}/restore`, { userId: user.user_id });
      setTrashGoals(response.data.trash || []);
      onGoalsChange?.(response.data.goals || []);
      flash('Goal restored');
    } catch (err) {
      flash(err, true);
    } finally {
      setTrashActionId(null);
    }
  };

  const handlePermanentDelete = (goalId, goalName) => {
    setConfirmDialog({
      type: 'delete-one',
      goalId,
      title: `Permanently delete "${goalName}"?`,
      message: 'This cannot be undone. The goal and its history will be removed forever.',
      confirmLabel: 'Delete Forever',
    });
  };

  const handleEmptyTrash = () => {
    if (!trashGoals.length) return;
    setConfirmDialog({
      type: 'empty-trash',
      title: `Empty trash (${trashGoals.length} goal${trashGoals.length === 1 ? '' : 's'})?`,
      message: 'Permanently delete all goals in trash. This cannot be undone.',
      confirmLabel: 'Empty Trash',
    });
  };

  const executeConfirmDialog = async () => {
    if (!confirmDialog) return;

    if (confirmDialog.type === 'delete-one') {
      setTrashActionId(confirmDialog.goalId);
      try {
        const response = await api.delete(`/goals/${confirmDialog.goalId}/permanent?userId=${user.user_id}`);
        setTrashGoals(response.data.trash || []);
        flash('Goal permanently deleted');
        setConfirmDialog(null);
      } catch (err) {
        flash(err, true);
        setConfirmDialog(null);
      } finally {
        setTrashActionId(null);
      }
      return;
    }

    if (confirmDialog.type === 'empty-trash') {
      setTrashActionId('empty');
      try {
        const response = await api.delete(`/goals/trash?userId=${user.user_id}`);
        setTrashGoals(response.data.trash || []);
        flash('Trash emptied');
        setConfirmDialog(null);
      } catch (err) {
        flash(err, true);
        setConfirmDialog(null);
      } finally {
        setTrashActionId(null);
      }
    }
  };

  const persistPreferences = async (patch) => {
    setSaving(true);
    try {
      const response = await api.put(`/users/${user.user_id}/preferences`, patch);
      onUserUpdate(response.data.user);
      flash('Preferences saved');
    } catch (err) {
      flash(err, true);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await api.put(`/users/${user.user_id}/preferences`, {
        ui_density: uiDensity,
        fiscal_start_month: fiscalStartMonth,
        preferences: alertPrefs,
        currency,
        currency_symbol: currencySymbol,
      });
      onUserUpdate(response.data.user);
      flash('Preferences saved');
    } catch (err) {
      flash(err, true);
    } finally {
      setSaving(false);
    }
    onDensityChange(uiDensity);
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      await api.post('/expenses/categories', {
        userId: user.user_id,
        name: newCategoryName.trim(),
        color: newCategoryColor,
      });
      setNewCategoryName('');
      setNewCategoryColor('#D4B16D');
      loadCategories();
      flash('Category added');
    } catch (err) {
      flash(err, true);
    }
  };

  const handleUpdateCategory = async (categoryId, patch) => {
    try {
      await api.put(`/expenses/categories/${categoryId}`, {
        userId: user.user_id,
        ...patch,
      });
      loadCategories();
    } catch (err) {
      flash(err, true);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      flash('New passwords do not match', true);
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      flash('Password must be at least 8 characters', true);
      return;
    }

    setPasswordSaving(true);
    try {
      await api.put(`/users/${user.user_id}/password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      flash('Password updated');
    } catch (err) {
      flash(err, true);
    } finally {
      setPasswordSaving(false);
    }
  };

  const downloadExport = async (format) => {
    setExportLoading(true);
    try {
      if (format === 'json') {
        const response = await api.get(`/users/${user.user_id}/export?format=json`);
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'quant-financial-statement.json';
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const response = await api.get(`/users/${user.user_id}/export?format=csv`, {
          responseType: 'blob',
        });
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'quant-financial-statement.csv';
        link.click();
        URL.revokeObjectURL(url);
      }
      flash('Export downloaded');
    } catch (err) {
      flash(err, true);
    } finally {
      setExportLoading(false);
    }
  };

  const toggleRunwayThreshold = (value) => {
    setAlertPrefs((prev) => {
      const next = prev.budget_runway.includes(value)
        ? prev.budget_runway.filter((item) => item !== value)
        : [...prev.budget_runway, value].sort((a, b) => a - b);
      return { ...prev, budget_runway: next };
    });
  };

  const panelClass = 'surface overflow-hidden';

  const handleHelpNavigate = (page) => {
    if (page === 'settings') {
      setActiveTab('financial');
      return;
    }
    onNavigate?.(page);
  };

  const memberName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Member';

  return (
    <div className="mb-10 space-y-5">
      <section className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Preferences</p>
          <h2 className="page-title">Account Settings</h2>
          <p className="page-lede">
            Currency, savings mode, security, and data for your QUANT ledger.
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="btn-ghost min-h-[44px] w-full sm:w-auto"
        >
          Sign Out
        </button>
      </section>

      {(message || error) && (
        error ? (
          <ErrorBanner message={error} />
        ) : (
          <div className="rounded-lg border border-gold/30 bg-cream/50 px-4 py-3 font-sans text-sm text-primary-dark">
            {message}
          </div>
        )
      )}

      {/* Summary strip — mirrors dashboard metrics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
        <div className="surface-navy flex min-h-[120px] flex-col justify-between p-5 text-cream lg:col-span-3">
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold/80">
            Savings Mode
          </p>
          <div className="mt-3">
            <p className="font-serif text-xl font-light tracking-[-0.015em]">
              {isEarnerMode ? 'Earner' : 'Non-Earner'}
            </p>
            <p className="mt-1.5 font-sans text-xs text-cream/55">
              {isEarnerMode && hasBudget
                ? `Budget ${formatMoney(monthlyBudget, currency, currencySymbol)}`
                : isEarnerMode
                  ? 'Set a budget to allocate'
                  : 'Track goals without fixed income'}
            </p>
          </div>
        </div>

        <div className="stat-tile flex min-h-[120px] flex-col justify-between p-5 lg:col-span-4">
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
            Member
          </p>
          <div className="mt-3 min-w-0">
            <p className="truncate font-serif text-xl font-light text-primary-dark">{memberName}</p>
            <p className="mt-1 truncate font-sans text-xs text-taupe">{user.email}</p>
          </div>
        </div>

        <div className="stat-tile flex min-h-[120px] flex-col justify-between p-5 lg:col-span-3">
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
            Display Currency
          </p>
          <div className="mt-3">
            <p className="font-money text-2xl font-light tracking-[0.02em] text-primary-dark">
              {formatMoney(12450.75, currency, currencySymbol)}
            </p>
            <p className="mt-1.5 font-sans text-xs text-taupe">
              {currency} · {currencySymbol}
            </p>
          </div>
        </div>

        <div className="stat-tile flex min-h-[120px] flex-col justify-between p-5 lg:col-span-2">
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
            Density
          </p>
          <div className="mt-3">
            <p className="font-serif text-xl font-light capitalize text-primary-dark">{uiDensity}</p>
            <p className="mt-1.5 font-sans text-xs text-taupe">
              {uiDensity === 'compact' ? 'Dense ledger' : 'Spacious cards'}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <nav className="surface h-fit space-y-1 p-2 xl:col-span-3">
          {SETTINGS_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left font-sans text-sm font-normal tracking-[0.02em] transition-all duration-200 ease-out-expo ${
                  active
                    ? 'bg-primary-dark text-cream shadow-soft'
                    : 'text-taupe hover:bg-cream/80 hover:text-primary-dark'
                }`}
              >
                <Icon name={tab.icon} className={`text-lg ${active ? 'text-gold' : ''}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-4 xl:col-span-9">
          {activeTab === 'profile' && (
            <>
              <section className={panelClass}>
                <div className="border-b border-primary-dark/[0.06] px-5 py-4">
                  <h3 className="card-title">Member Profile</h3>
                  <p className="mt-1 font-sans text-sm text-taupe">Your ledger identity</p>
                </div>
                <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
                  <div>
                    <p className="field-label">Name</p>
                    <p className="font-sans text-[15px] font-light text-primary-dark">{memberName}</p>
                  </div>
                  <div>
                    <p className="field-label">Email</p>
                    <p className="break-all font-sans text-[15px] font-light text-primary-dark">
                      {user.email}
                    </p>
                  </div>
                </div>
              </section>

              <section className={panelClass}>
                <div className="border-b border-primary-dark/[0.06] px-5 py-4">
                  <h3 className="card-title">Display Currency</h3>
                  <p className="mt-1 font-sans text-sm text-taupe">
                    Formats amounts across your ledger.
                  </p>
                </div>
                <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="field-label" htmlFor="settings-currency">
                      Currency
                    </label>
                    <select
                      id="settings-currency"
                      value={currency}
                      onChange={(e) => {
                        const next = getCurrencyByCode(e.target.value);
                        setCurrency(next.code);
                        setCurrencySymbol(next.symbol);
                      }}
                      className="field"
                    >
                      {ONBOARDING_CURRENCIES.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.symbol} — {item.code} — {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-lg border border-primary-dark/10 bg-cream/50 px-4 py-3">
                    <p className="field-label mb-0">Preview</p>
                    <p className="mt-1 font-money text-xl font-light tracking-[0.02em] text-primary-dark">
                      {formatMoney(12450.75, currency, currencySymbol)}
                    </p>
                  </div>
                </div>
              </section>

              <section className={panelClass}>
                <div className="border-b border-primary-dark/[0.06] px-5 py-4">
                  <h3 className="card-title">Visual Tuning</h3>
                  <p className="mt-1 font-sans text-sm text-taupe">
                    Choose how dense your ledger surfaces feel.
                  </p>
                </div>
                <div className="px-5 py-5">
                  <div className="grid max-w-md grid-cols-2 gap-3">
                    {[
                      { id: 'classic', label: 'Classic', desc: 'Spacious cards' },
                      { id: 'compact', label: 'Compact', desc: 'Dense ledger' },
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => selectDensity(option.id)}
                        className={`min-h-[72px] rounded-lg border px-3.5 py-3 text-left transition-colors duration-200 ease-out-expo ${
                          uiDensity === option.id
                            ? 'border-gold bg-gold/10'
                            : 'border-primary-dark/12 bg-white hover:border-gold/50'
                        }`}
                      >
                        <p className="font-sans text-sm font-normal text-primary-dark">{option.label}</p>
                        <p className="mt-1 font-sans text-xs text-taupe">{option.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className={panelClass}>
                <div className="border-b border-primary-dark/[0.06] px-5 py-4">
                  <h3 className="card-title">Alert Thresholds</h3>
                  <p className="mt-1 font-sans text-sm text-taupe">
                    When runway and feasibility should surface.
                  </p>
                </div>
                <div className="space-y-5 px-5 py-5">
                  <div>
                    <p className="field-label">Budget Runway Alerts</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {RUNWAY_OPTIONS.map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => toggleRunwayThreshold(pct)}
                          className={`min-h-[40px] rounded-lg border px-3.5 py-2 font-money text-sm font-light transition-colors duration-200 ease-out-expo ${
                            alertPrefs.budget_runway.includes(pct)
                              ? 'border-primary-dark bg-primary-dark text-cream'
                              : 'border-primary-dark/12 text-taupe hover:border-primary-dark/30 hover:text-primary-dark'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={alertPrefs.feasibility_decay}
                      onChange={(e) => setAlertPrefs((prev) => ({
                        ...prev,
                        feasibility_decay: e.target.checked,
                      }))}
                      className="mt-0.5 h-4 w-4 rounded border-primary-dark/20 text-gold focus:ring-gold"
                    />
                    <span className="font-sans text-sm font-light leading-relaxed text-primary-dark">
                      Alert when a goal drops from Achievable to Underfunded
                    </span>
                  </label>
                </div>
              </section>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="btn-navy min-h-[44px] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Preferences'}
              </button>
            </>
          )}

          {activeTab === 'financial' && (
            <>
              <EarnerModeToggle
                userId={user.user_id}
                isEarner={isEarnerMode}
                hasBudget={hasBudget}
                onModeChange={onEarnerModeChange}
              />

              <BudgetSetup
                userId={user.user_id}
                currentBudget={monthlyBudget}
                isEarnerMode={isEarnerMode}
                onBudgetSet={onBudgetSet}
                currencyCode={currency}
                currencySymbol={currencySymbol}
              />

              <section className={panelClass}>
                <div className="border-b border-primary-dark/[0.06] px-5 py-4">
                  <h3 className="card-title">Fiscal Year</h3>
                  <p className="mt-1 font-sans text-sm text-taupe">
                    When your reporting cycle begins.
                  </p>
                </div>
                <div className="px-5 py-5">
                  <label className="field-label" htmlFor="settings-fiscal">
                    Start Month
                  </label>
                  <select
                    id="settings-fiscal"
                    value={fiscalStartMonth}
                    onChange={(e) => setFiscalStartMonth(Number(e.target.value))}
                    className="field max-w-xs"
                  >
                    {FISCAL_MONTHS.map((month, index) => (
                      <option key={month} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>
              </section>

              <section className={panelClass}>
                <div className="border-b border-primary-dark/[0.06] px-5 py-4 md:flex md:items-start md:justify-between md:gap-4">
                  <div>
                    <h3 className="card-title">Category Ledger</h3>
                    <p className="mt-1 font-sans text-sm text-taupe">
                      Expense categories and their colours.
                    </p>
                  </div>
                  <Icon name="category" className="mt-2 hidden text-2xl text-gold md:mt-0 md:block" />
                </div>

                <div className="px-5 py-5">
                  {categoriesLoading ? (
                    <p className="font-sans text-sm text-taupe">Loading categories…</p>
                  ) : (
                    <div className="space-y-2">
                      {categories.map((cat) => (
                        <div
                          key={cat.category_id}
                          className="flex flex-wrap items-center gap-3 rounded-lg border border-primary-dark/[0.08] bg-cream/30 px-3 py-2.5"
                        >
                          <input
                            type="color"
                            value={cat.colour || '#D4B16D'}
                            onChange={(e) => handleUpdateCategory(cat.category_id, { color: e.target.value })}
                            className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
                            aria-label={`Colour for ${cat.name}`}
                          />
                          <input
                            type="text"
                            defaultValue={cat.name}
                            onBlur={(e) => {
                              if (e.target.value.trim() && e.target.value !== cat.name) {
                                handleUpdateCategory(cat.category_id, { name: e.target.value.trim() });
                              }
                            }}
                            className="min-w-[120px] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 font-sans text-sm font-normal text-primary-dark focus:border-gold focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={handleCreateCategory}
                    className="mt-5 flex flex-wrap items-end gap-3 border-t border-primary-dark/[0.06] pt-5"
                  >
                    <div className="min-w-[140px] flex-1">
                      <label className="field-label" htmlFor="new-category-name">
                        New Category
                      </label>
                      <input
                        id="new-category-name"
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g. Angel Investing"
                        className="field"
                      />
                    </div>
                    <input
                      type="color"
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="h-11 w-12 cursor-pointer rounded-lg border border-primary-dark/12"
                      aria-label="Category colour"
                    />
                    <button type="submit" className="btn-ghost min-h-[44px]">
                      Add
                    </button>
                  </form>
                </div>
              </section>

              <button
                type="button"
                onClick={() => persistPreferences({ fiscal_start_month: fiscalStartMonth })}
                disabled={saving}
                className="btn-navy min-h-[44px] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Fiscal Settings'}
              </button>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <section className={panelClass}>
                <div className="border-b border-primary-dark/[0.06] px-5 py-4">
                  <h3 className="card-title">Active Session</h3>
                  <p className="mt-1 font-sans text-sm text-taupe">
                    Signed token on this device. Sign out clears local credentials.
                  </p>
                </div>
                <div className="px-5 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary-dark/[0.08] bg-cream/40 px-4 py-3.5">
                    <div>
                      <p className="font-sans text-sm font-normal text-primary-dark">This device</p>
                      <p className="mt-0.5 font-sans text-xs text-taupe">
                        {tokenExpiry
                          ? `Expires ${tokenExpiry.toLocaleString()}`
                          : 'Session active'}
                      </p>
                    </div>
                    <Icon name="devices" className="text-xl text-gold" />
                  </div>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="btn-outline-gold mt-4 min-h-[44px]"
                  >
                    Log Out of All Devices
                  </button>
                </div>
              </section>

              <section className={panelClass}>
                <div className="border-b border-primary-dark/[0.06] px-5 py-4">
                  <h3 className="card-title">Password</h3>
                  <p className="mt-1 font-sans text-sm text-taupe">
                    Rotate your password. Minimum 8 characters.
                  </p>
                </div>
                <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4 px-5 py-5">
                  <div>
                    <label className="field-label" htmlFor="current-password">
                      Current Password
                    </label>
                    <input
                      id="current-password"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      className="field"
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="new-password">
                      New Password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                      className="field"
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="confirm-password">
                      Confirm New Password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      className="field"
                      required
                      minLength={8}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="btn-navy min-h-[44px] disabled:opacity-60"
                  >
                    {passwordSaving ? 'Updating…' : 'Update Password'}
                  </button>
                </form>
              </section>
            </>
          )}

          {activeTab === 'data' && (
            <>
              <section className={panelClass}>
                <div className="border-b border-primary-dark/[0.06] px-5 py-4">
                  <h3 className="card-title">Export Statement</h3>
                  <p className="mt-1 font-sans text-sm text-taupe">
                    Download goals, transactions, expenses, and categories.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 px-5 py-5">
                  <button
                    type="button"
                    onClick={() => downloadExport('json')}
                    disabled={exportLoading}
                    className="btn-navy inline-flex min-h-[44px] items-center gap-2 disabled:opacity-60"
                  >
                    <Icon name="data_object" className="text-base" />
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadExport('csv')}
                    disabled={exportLoading}
                    className="btn-ghost inline-flex min-h-[44px] items-center gap-2 disabled:opacity-60"
                  >
                    <Icon name="table" className="text-base" />
                    Export CSV
                  </button>
                </div>
              </section>

              <section className={panelClass}>
                <div className="border-b border-primary-dark/[0.06] px-5 py-4">
                  <h3 className="card-title">Soft Reset</h3>
                  <p className="mt-1 font-sans text-sm text-taupe">
                    Archive the current cycle and begin fresh. Export first — available in a future release.
                  </p>
                </div>
                <div className="px-5 py-5">
                  <button
                    type="button"
                    disabled
                    className="btn-ghost min-h-[44px] cursor-not-allowed opacity-50"
                  >
                    Soft Reset (Coming Soon)
                  </button>
                </div>
              </section>
            </>
          )}

          {activeTab === 'trash' && (
            <section className={panelClass}>
              <div className="flex flex-col gap-3 border-b border-primary-dark/[0.06] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="card-title">Trash</h3>
                  <p className="mt-1 font-sans text-sm text-taupe">
                    Restore deleted goals or empty trash permanently.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEmptyTrash}
                  disabled={!trashGoals.length || trashActionId === 'empty'}
                  className="btn-ghost min-h-[44px] border-red-200/80 text-red-800 hover:border-red-300 hover:bg-red-50 disabled:opacity-40"
                >
                  {trashActionId === 'empty' ? 'Emptying…' : 'Empty Trash'}
                </button>
              </div>

              <div className="px-5 py-5">
                {trashLoading ? (
                  <p className="font-sans text-sm text-taupe">Loading trash…</p>
                ) : trashGoals.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-primary-dark/12 px-4 py-10 text-center">
                    <Icon name="delete" className="text-3xl text-taupe/40" />
                    <p className="mt-2 font-serif text-lg font-light text-primary-dark">Trash is empty</p>
                    <p className="mt-1 font-sans text-sm text-taupe">
                      Deleted goals will appear here.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-primary-dark/[0.06] overflow-hidden rounded-lg border border-primary-dark/[0.08]">
                    {trashGoals.map((goal) => (
                      <li
                        key={goal.goal_id}
                        className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-serif text-lg font-light tracking-[-0.015em] text-primary-dark">
                            {goal.name}
                          </p>
                          <p className="mt-0.5 font-sans text-xs text-taupe">
                            Saved{' '}
                            <span className="font-money font-light text-primary-dark">
                              {formatMoney(goal.saved_amount, currency, currencySymbol)}
                            </span>
                            {' · '}
                            Target{' '}
                            <span className="font-money font-light text-primary-dark">
                              {formatMoney(goal.target_amount, currency, currencySymbol)}
                            </span>
                            {goal.deleted_at && (
                              <>
                                {' · '}
                                Deleted {new Date(goal.deleted_at).toLocaleDateString()}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => handleRestoreGoal(goal.goal_id)}
                            disabled={trashActionId === goal.goal_id}
                            className="btn-navy min-h-[40px] px-3 py-2 disabled:opacity-50"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePermanentDelete(goal.goal_id, goal.name)}
                            disabled={trashActionId === goal.goal_id}
                            className="btn-ghost min-h-[40px] border-red-200/80 px-3 py-2 text-red-800 hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete Forever
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {activeTab === 'help' && (
            <FeatureGuide
              embedded
              isEarnerMode={isEarnerMode}
              onNavigate={handleHelpNavigate}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmLabel={confirmDialog?.confirmLabel || 'Confirm'}
        tone="danger"
        loading={Boolean(trashActionId)}
        onConfirm={executeConfirmDialog}
        onCancel={() => {
          if (!trashActionId) setConfirmDialog(null);
        }}
      />
    </div>
  );
}

export default SettingsPage;
