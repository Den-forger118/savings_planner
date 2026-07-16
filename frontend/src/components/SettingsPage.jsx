import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import BudgetSetup from './BudgetSetup';
import EarnerModeToggle from './EarnerModeToggle';
import FeatureGuide from './FeatureGuide';
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
  { id: 'profile', label: 'Profile & Preferences', icon: 'person' },
  { id: 'financial', label: 'Financial Engine', icon: 'account_balance' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'data', label: 'Data & Portability', icon: 'database' },
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
  onThemeChange,
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
  const [theme, setTheme] = useState(user?.theme || 'classic');
  const [uiDensity, setUiDensity] = useState(user?.ui_density || 'classic');
  const [fiscalStartMonth, setFiscalStartMonth] = useState(user?.fiscal_start_month || 1);
  const [alertPrefs, setAlertPrefs] = useState(parsePreferences(user));

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#D4A574');

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

  useEffect(() => {
    setCurrency(user?.currency || 'USD');
    setCurrencySymbol(user?.currency_symbol || '$');
  }, [user?.currency, user?.currency_symbol]);

  const tokenExpiry = useMemo(
    () => getTokenExpiry(localStorage.getItem('token')),
    []
  );

  const flash = (text, isError = false) => {
    if (isError) {
      setError(text);
      setMessage(null);
    } else {
      setMessage(text);
      setError(null);
    }
    setTimeout(() => {
      setError(null);
      setMessage(null);
    }, 4000);
  };

  const loadTrash = async () => {
    setTrashLoading(true);
    try {
      const response = await api.get(`/goals/trash?userId=${user.user_id}`);
      setTrashGoals(response.data.goals || []);
    } catch {
      flash('Unable to load trash', true);
    } finally {
      setTrashLoading(false);
    }
  };

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const response = await api.get(`/expenses/categories?userId=${user.user_id}`);
      setCategories(response.data.categories || []);
    } catch {
      flash('Unable to load categories', true);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'financial') {
      loadCategories();
    }
    if (activeTab === 'trash') {
      loadTrash();
    }
  }, [activeTab, user.user_id]);

  const handleRestoreGoal = async (goalId) => {
    setTrashActionId(goalId);
    try {
      const response = await api.post(`/goals/${goalId}/restore`, { userId: user.user_id });
      setTrashGoals(response.data.trash || []);
      onGoalsChange?.(response.data.goals || []);
      flash('Goal restored');
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to restore goal', true);
    } finally {
      setTrashActionId(null);
    }
  };

  const handlePermanentDelete = async (goalId, goalName) => {
    if (!window.confirm(`Permanently delete "${goalName}"? This cannot be undone.`)) {
      return;
    }

    setTrashActionId(goalId);
    try {
      const response = await api.delete(`/goals/${goalId}/permanent?userId=${user.user_id}`);
      setTrashGoals(response.data.trash || []);
      flash('Goal permanently deleted');
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to delete goal', true);
    } finally {
      setTrashActionId(null);
    }
  };

  const handleEmptyTrash = async () => {
    if (!trashGoals.length) return;
    if (!window.confirm(`Permanently delete all ${trashGoals.length} goals in trash? This cannot be undone.`)) {
      return;
    }

    setTrashActionId('empty');
    try {
      const response = await api.delete(`/goals/trash?userId=${user.user_id}`);
      setTrashGoals(response.data.trash || []);
      flash('Trash emptied');
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to empty trash', true);
    } finally {
      setTrashActionId(null);
    }
  };

  const persistPreferences = async (patch) => {
    setSaving(true);
    try {
      const response = await api.put(`/users/${user.user_id}/preferences`, patch);
      onUserUpdate(response.data.user);
      flash('Preferences saved');
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to save preferences', true);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await api.put(`/users/${user.user_id}/preferences`, {
        theme,
        ui_density: uiDensity,
        fiscal_start_month: fiscalStartMonth,
        preferences: alertPrefs,
        currency,
        currency_symbol: currencySymbol,
      });
      onUserUpdate(response.data.user);
      flash('Preferences saved');
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to save preferences', true);
    } finally {
      setSaving(false);
    }
    onThemeChange(theme);
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
      setNewCategoryColor('#D4A574');
      loadCategories();
      flash('Category added');
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to create category', true);
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
      flash(err.response?.data?.error || 'Failed to update category', true);
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
      flash(err.response?.data?.error || 'Failed to update password', true);
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
    } catch {
      flash('Export failed', true);
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

  const panelClass = 'rounded-lg border border-cream/80 bg-white p-6 shadow-sm settings-panel';

  const handleHelpNavigate = (page) => {
    if (page === 'settings') {
      setActiveTab('financial');
      return;
    }
    onNavigate?.(page);
  };

  return (
    <div className="space-y-8">
      <section>
        <p className="font-sans text-xs font-bold uppercase tracking-widest text-gold">
          Control Room
        </p>
        <h2 className="mt-2 font-serif text-4xl font-bold text-primary-dark md:text-5xl">
          Private Settings
        </h2>
        <p className="mt-3 max-w-2xl font-sans text-base text-taupe">
          Configure your ledger currency, financial engine, security posture, and data portability —
          built for private banking-grade savings intelligence.
        </p>
      </section>

      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 font-sans text-sm ${
            error
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-gold/30 bg-cream/50 text-primary-dark'
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="space-y-1 rounded-lg border border-cream bg-white p-2 shadow-sm">
          {SETTINGS_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left font-sans text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-primary-dark text-cream'
                    : 'text-taupe hover:bg-cream/60 hover:text-primary-dark'
                }`}
              >
                <Icon name={tab.icon} className="text-lg" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-6">
          {activeTab === 'profile' && (
            <>
              <section className={panelClass}>
                <h3 className="font-serif text-2xl font-bold text-primary-dark">Member Profile</h3>
                <p className="mt-1 font-sans text-sm text-taupe">Your private ledger identity</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">Name</p>
                    <p className="mt-1 font-sans text-primary-dark">{user.first_name} {user.last_name}</p>
                  </div>
                  <div>
                    <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">Email</p>
                    <p className="mt-1 font-sans text-primary-dark">{user.email}</p>
                  </div>
                </div>
              </section>

              <section className={panelClass}>
                <h3 className="font-serif text-xl font-bold text-primary-dark">Display Currency</h3>
                <p className="mt-1 font-sans text-sm text-taupe">
                  All amounts across your ledger will format in this currency.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="mb-1 block font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">
                      Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => {
                        const next = getCurrencyByCode(e.target.value);
                        setCurrency(next.code);
                        setCurrencySymbol(next.symbol);
                      }}
                      className="w-full rounded-lg border border-cream bg-white px-3 py-2.5 font-sans text-sm focus:border-gold focus:outline-none"
                    >
                      {ONBOARDING_CURRENCIES.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.symbol} — {item.code} — {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-lg border border-gold/30 bg-cream/40 px-4 py-2.5">
                    <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">Preview</p>
                    <p className="mt-0.5 font-money text-xl font-bold text-gold">
                      {formatMoney(12450.75, currency, currencySymbol)}
                    </p>
                  </div>
                </div>
              </section>

              <section className={panelClass}>
                <h3 className="font-serif text-xl font-bold text-primary-dark">Visual Tuning</h3>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">Theme</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[
                        { id: 'classic', label: 'Classic Cream', icon: 'light_mode' },
                        { id: 'midnight', label: 'Midnight Navy', icon: 'dark_mode' },
                      ].map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setTheme(option.id)}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left font-sans text-sm transition-colors ${
                            theme === option.id
                              ? 'border-gold bg-primary-dark text-cream'
                              : 'border-cream text-primary-dark hover:border-gold/50'
                          }`}
                        >
                          <Icon name={option.icon} className="text-base" />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">UI Density</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[
                        { id: 'classic', label: 'Classic', desc: 'Spacious cards' },
                        { id: 'compact', label: 'Compact', desc: 'Dense ledger' },
                      ].map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setUiDensity(option.id)}
                          className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                            uiDensity === option.id
                              ? 'border-gold bg-cream/60'
                              : 'border-cream hover:border-gold/50'
                          }`}
                        >
                          <p className="font-sans text-sm font-semibold text-primary-dark">{option.label}</p>
                          <p className="font-sans text-xs text-taupe">{option.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className={panelClass}>
                <h3 className="font-serif text-xl font-bold text-primary-dark">Intelligence Thresholds</h3>
                <p className="mt-1 font-sans text-sm text-taupe">
                  Configure when your ledger should surface runway and feasibility alerts.
                </p>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">
                      Budget Runway Alerts
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {RUNWAY_OPTIONS.map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => toggleRunwayThreshold(pct)}
                          className={`rounded-full border px-3 py-1 font-sans text-xs font-semibold transition-colors ${
                            alertPrefs.budget_runway.includes(pct)
                              ? 'border-gold bg-gold text-primary-dark'
                              : 'border-cream text-taupe hover:border-gold/50'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={alertPrefs.feasibility_decay}
                      onChange={(e) => setAlertPrefs((prev) => ({
                        ...prev,
                        feasibility_decay: e.target.checked,
                      }))}
                      className="h-4 w-4 rounded border-cream text-gold focus:ring-gold"
                    />
                    <span className="font-sans text-sm text-primary-dark">
                      Alert when a goal drops from Achievable to Underfunded
                    </span>
                  </label>
                </div>
              </section>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="rounded-lg bg-primary-dark px-6 py-3 font-sans text-sm font-bold text-cream transition-colors hover:bg-primary-dark-alt disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Profile & Preferences'}
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
                <h3 className="font-serif text-xl font-bold text-primary-dark">Fiscal Year</h3>
                <p className="mt-1 font-sans text-sm text-taupe">
                  Set when your financial cycle begins for reporting and runway calculations.
                </p>
                <select
                  value={fiscalStartMonth}
                  onChange={(e) => setFiscalStartMonth(Number(e.target.value))}
                  className="mt-4 w-full max-w-xs rounded-lg border border-cream bg-white px-3 py-2.5 font-sans text-sm focus:border-gold focus:outline-none"
                >
                  {FISCAL_MONTHS.map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
              </section>

              <section className={panelClass}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-primary-dark">Category Ledger</h3>
                    <p className="mt-1 font-sans text-sm text-taupe">
                      Customize expense categories and their signature colours.
                    </p>
                  </div>
                  <Icon name="category" className="text-2xl text-gold" />
                </div>

                {categoriesLoading ? (
                  <p className="mt-6 font-sans text-sm text-taupe">Loading categories…</p>
                ) : (
                  <div className="mt-5 space-y-2">
                    {categories.map((cat) => (
                      <div
                        key={cat.category_id}
                        className="flex flex-wrap items-center gap-3 rounded-lg border border-cream/80 bg-cream/20 px-3 py-2"
                      >
                        <input
                          type="color"
                          value={cat.colour || '#D4A574'}
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
                          className="min-w-[120px] flex-1 rounded border border-transparent bg-transparent px-2 py-1 font-sans text-sm font-semibold text-primary-dark focus:border-gold focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleCreateCategory} className="mt-4 flex flex-wrap items-end gap-3 border-t border-cream pt-4">
                  <div className="flex-1 min-w-[140px]">
                    <label className="mb-1 block font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">
                      New Category
                    </label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Angel Investing"
                      className="w-full rounded-lg border border-cream px-3 py-2 font-sans text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                  <input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded border border-cream"
                    aria-label="Category colour"
                  />
                  <button
                    type="submit"
                    className="rounded-lg border-2 border-gold px-4 py-2 font-sans text-sm font-bold text-primary-dark transition-colors hover:bg-gold"
                  >
                    Add
                  </button>
                </form>
              </section>

              <button
                type="button"
                onClick={() => persistPreferences({ fiscal_start_month: fiscalStartMonth })}
                disabled={saving}
                className="rounded-lg bg-primary-dark px-6 py-3 font-sans text-sm font-bold text-cream transition-colors hover:bg-primary-dark-alt disabled:opacity-60"
              >
                Save Fiscal Settings
              </button>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <section className={panelClass}>
                <h3 className="font-serif text-xl font-bold text-primary-dark">Active Session</h3>
                <p className="mt-1 font-sans text-sm text-taupe">
                  Your session is secured with a signed token. End all sessions to clear local credentials.
                </p>
                <div className="mt-4 rounded-lg border border-cream bg-cream/30 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-sans text-sm font-semibold text-primary-dark">This device</p>
                      <p className="font-sans text-xs text-taupe">
                        {tokenExpiry
                          ? `Expires ${tokenExpiry.toLocaleString()}`
                          : 'Session active'}
                      </p>
                    </div>
                    <Icon name="devices" className="text-gold text-xl" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="mt-4 rounded-lg border-2 border-primary-dark px-4 py-2 font-sans text-sm font-bold text-primary-dark transition-colors hover:bg-primary-dark hover:text-cream"
                >
                  Log Out of All Devices
                </button>
              </section>

              <section className={panelClass}>
                <h3 className="font-serif text-xl font-bold text-primary-dark">Password Rotation</h3>
                <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4 max-w-md">
                  <div>
                    <label className="mb-1 block font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full rounded-lg border border-cream px-3 py-2.5 font-sans text-sm focus:border-gold focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full rounded-lg border border-cream px-3 py-2.5 font-sans text-sm focus:border-gold focus:outline-none"
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full rounded-lg border border-cream px-3 py-2.5 font-sans text-sm focus:border-gold focus:outline-none"
                      required
                      minLength={8}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="rounded-lg bg-primary-dark px-5 py-2.5 font-sans text-sm font-bold text-cream disabled:opacity-60"
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
                <h3 className="font-serif text-xl font-bold text-primary-dark">Export Financial Statement</h3>
                <p className="mt-1 font-sans text-sm text-taupe">
                  Download your complete goals, transactions, expenses, and categories — true data ownership.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => downloadExport('json')}
                    disabled={exportLoading}
                    className="flex items-center gap-2 rounded-lg border-2 border-gold bg-gold px-5 py-2.5 font-sans text-sm font-bold text-primary-dark transition-colors hover:bg-gold-light disabled:opacity-60"
                  >
                    <Icon name="data_object" className="text-base" />
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadExport('csv')}
                    disabled={exportLoading}
                    className="flex items-center gap-2 rounded-lg border-2 border-primary-dark px-5 py-2.5 font-sans text-sm font-bold text-primary-dark transition-colors hover:bg-primary-dark hover:text-cream disabled:opacity-60"
                  >
                    <Icon name="table" className="text-base" />
                    Export CSV
                  </button>
                </div>
              </section>

              <section className={`${panelClass} border-red-200/60`}>
                <h3 className="font-serif text-xl font-bold text-primary-dark">Soft Reset</h3>
                <p className="mt-1 font-sans text-sm text-taupe">
                  Archive your current cycle and begin a fresh savings mandate. Export your statement first —
                  soft reset will be available in a future release.
                </p>
                <button
                  type="button"
                  disabled
                  className="mt-4 cursor-not-allowed rounded-lg border border-cream px-4 py-2 font-sans text-sm text-taupe opacity-60"
                >
                  Soft Reset (Coming Soon)
                </button>
              </section>
            </>
          )}

          {activeTab === 'trash' && (
            <section className={panelClass}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-primary-dark">Trash</h3>
                  <p className="mt-1 font-sans text-sm text-taupe">
                    Deleted goals are kept here until you restore them or empty the trash.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEmptyTrash}
                  disabled={!trashGoals.length || trashActionId === 'empty'}
                  className="rounded-md border border-red-200 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40"
                >
                  {trashActionId === 'empty' ? 'Emptying…' : 'Empty Trash'}
                </button>
              </div>

              {trashLoading ? (
                <p className="mt-6 font-sans text-sm text-taupe">Loading trash…</p>
              ) : trashGoals.length === 0 ? (
                <div className="mt-6 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center">
                  <Icon name="delete" className="text-3xl text-taupe/40" />
                  <p className="mt-2 font-serif text-lg font-bold text-primary-dark">Trash is empty</p>
                  <p className="mt-1 font-sans text-sm text-taupe">
                    When you delete a goal, it will appear here.
                  </p>
                </div>
              ) : (
                <ul className="mt-6 divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {trashGoals.map((goal) => (
                    <li
                      key={goal.goal_id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-serif text-lg font-bold text-primary-dark">
                          {goal.name}
                        </p>
                        <p className="mt-0.5 font-sans text-xs text-taupe">
                          Saved{' '}
                          <span className="font-money font-semibold text-primary-dark">
                            {formatMoney(goal.saved_amount, currency, currencySymbol)}
                          </span>
                          {' · '}
                          Target{' '}
                          <span className="font-money font-semibold text-primary-dark">
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
                          className="rounded-md bg-primary-dark px-3 py-1.5 font-sans text-xs font-semibold uppercase tracking-wider text-cream transition-colors hover:bg-primary-dark-alt disabled:opacity-50"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePermanentDelete(goal.goal_id, goal.name)}
                          disabled={trashActionId === goal.goal_id}
                          className="rounded-md border border-red-200 px-3 py-1.5 font-sans text-xs font-semibold uppercase tracking-wider text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                        >
                          Delete Forever
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
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
    </div>
  );
}

export default SettingsPage;
