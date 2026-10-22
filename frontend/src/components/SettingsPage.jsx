import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import BudgetSetup from './BudgetSetup';
import EarnerModeToggle from './EarnerModeToggle';
import FeatureGuide from './FeatureGuide';
import ConfirmDialog from './ConfirmDialog';
import ErrorBanner from './ErrorBanner';
import GoalSimulatorPage from './GoalSimulatorPage';
import PasswordInput from './PasswordInput';
import BudgetFundingMeter from './BudgetFundingMeter';
import { getFriendlyError } from '../utils/friendlyError';
import {
  ONBOARDING_CURRENCIES,
  FISCAL_MONTHS,
  formatMoney,
  getCurrencyByCode,
} from '../utils/currency';
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '../utils/webPushClient';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

/** Top-level sidebar only — nested pages open from in-page links (progressive disclosure). */
const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'financial', label: 'Financial', icon: 'account_balance' },
  { id: 'reminders', label: 'Reminders', icon: 'notifications' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'help', label: 'Help', icon: 'help' },
];

const NESTED_SETTINGS_TABS = ['wallet', 'simulator', 'data', 'trash'];

const ALL_SETTINGS_TAB_IDS = [...SETTINGS_TABS.map((tab) => tab.id), ...NESTED_SETTINGS_TABS];

const isSettingsTabId = (id) => ALL_SETTINGS_TAB_IDS.includes(id);

/** Which sidebar item stays highlighted when a nested page is open. */
const NAV_HIGHLIGHT_FOR = {
  profile: 'profile',
  data: 'profile',
  trash: 'profile',
  financial: 'financial',
  wallet: 'financial',
  simulator: 'financial',
  reminders: 'reminders',
  security: 'security',
  help: 'help',
};

const SettingsBackLink = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1 font-sans text-xs font-normal text-taupe transition-colors hover:text-primary-dark"
  >
    <Icon name="arrow_back" className="text-sm" />
    {label}
  </button>
);

const SettingsSectionLink = ({ icon, label, hint, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-lg border border-primary-dark/10 bg-cream/40 px-4 py-3 text-left transition-colors hover:border-primary-dark/20 hover:bg-cream"
  >
    <Icon name={icon} className="text-xl text-gold" />
    <span className="min-w-0 flex-1">
      <span className="block font-sans text-sm font-normal text-primary-dark">{label}</span>
      {hint ? <span className="mt-0.5 block font-sans text-xs text-taupe">{hint}</span> : null}
    </span>
    <Icon name="chevron_right" className="text-lg text-taupe" />
  </button>
);

const SettingsDisclosure = ({ label, open, onToggle, children }) => (
  <div className="rounded-lg border border-primary-dark/10">
    <button
      type="button"
      onClick={onToggle}
      className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-3 text-left"
    >
      <span className="font-sans text-sm font-normal text-primary-dark">{label}</span>
      <Icon name={open ? 'expand_less' : 'expand_more'} className="text-xl text-taupe" />
    </button>
    {open ? <div className="border-t border-primary-dark/10 px-4 py-4">{children}</div> : null}
  </div>
);

const REMINDER_TIMEZONES = [
  { value: 'Africa/Accra', label: 'Accra (GMT)' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'America/Chicago', label: 'Chicago' },
  { value: 'America/Los_Angeles', label: 'Los Angeles' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Kolkata', label: 'India' },
  { value: 'UTC', label: 'UTC' },
];

const REMINDER_HOURS = Array.from({ length: 24 }, (_, hour) => {
  const value = `${String(hour).padStart(2, '0')}:00`;
  const suffix = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return { value, label: `${displayHour}:00 ${suffix}` };
});

const getTokenExpiry = (token) => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? new Date(payload.exp * 1000) : null;
  } catch {
    return null;
  }
};

function SettingsPage({
  user,
  isEarnerMode,
  hasBudget,
  monthlyBudget,
  onUserUpdate,
  onBudgetSet,
  onEarnerModeChange,
  onLogout,
  onNavigate,
  onGoalsChange,
  onGoalCreated,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    isSettingsTabId(tabFromUrl) ? tabFromUrl : 'profile'
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [currencySymbol, setCurrencySymbol] = useState(user?.currency_symbol || '$');
  const [fiscalStartMonth, setFiscalStartMonth] = useState(user?.fiscal_start_month || 1);
  const [emailNotifications, setEmailNotifications] = useState(
    user?.email_notifications !== false
  );
  const [reminderFrequency, setReminderFrequency] = useState(
    user?.reminder_frequency || 'daily'
  );
  const [reminderTime, setReminderTime] = useState(user?.reminder_time || '09:00');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [pushEnabled, setPushEnabled] = useState(user?.push_notifications === true);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushSupported] = useState(() => isPushSupported());

  const [walletPhone, setWalletPhone] = useState(user?.phone || '');
  const [walletConsent, setWalletConsent] = useState(false);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletInfo, setWalletInfo] = useState(null);
  const [payoutDestinations, setPayoutDestinations] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    type: 'mobile_money',
    bankCode: 'MTN',
    accountNumber: '',
    name: '',
  });
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [autoAllocateWallet, setAutoAllocateWallet] = useState(
    user?.auto_allocate_wallet !== false
  );
  const [budgetFunding, setBudgetFunding] = useState(null);
  const [showFundingGuide, setShowFundingGuide] = useState(false);
  const [showTransferSetup, setShowTransferSetup] = useState(false);
  const [showTransferDetails, setShowTransferDetails] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [showReminderGuide, setShowReminderGuide] = useState(false);
  const [showPushSettings, setShowPushSettings] = useState(false);
  const [showFiscalAdvanced, setShowFiscalAdvanced] = useState(false);
  const [showSoftReset, setShowSoftReset] = useState(false);

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
    setEmailNotifications(user?.email_notifications !== false);
    setReminderFrequency(user?.reminder_frequency || 'daily');
    setReminderTime(user?.reminder_time || '09:00');
    setTimezone(user?.timezone || 'UTC');
    setPushEnabled(user?.push_notifications === true);
    setWalletPhone(user?.phone || '');
    setAutoAllocateWallet(user?.auto_allocate_wallet !== false);
  }, [
    user?.currency,
    user?.currency_symbol,
    user?.email_notifications,
    user?.push_notifications,
    user?.phone,
    user?.auto_allocate_wallet,
    user?.reminder_frequency,
    user?.reminder_time,
    user?.timezone,
  ]);

  const loadWallet = useCallback(async () => {
    try {
      const [walletRes, destRes, payoutRes] = await Promise.all([
        api.get('/wallet'),
        api.get('/wallet/payout-destinations').catch(() => ({ data: null })),
        api.get('/wallet/payouts').catch(() => ({ data: { payouts: [] } })),
      ]);
      setWalletInfo(walletRes.data);
      setBudgetFunding(walletRes.data?.budget_funding || null);
      if (typeof walletRes.data?.auto_allocate_wallet === 'boolean') {
        setAutoAllocateWallet(walletRes.data.auto_allocate_wallet);
      }
      setPayoutDestinations(destRes.data);
      setPayouts(payoutRes.data?.payouts || []);
      const momo = destRes.data?.mobile_money || [];
      if (momo.length > 0) {
        setWithdrawForm((prev) => ({
          ...prev,
          bankCode: prev.bankCode || momo[0].code,
        }));
      }
    } catch {
      setWalletInfo(null);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'wallet') {
      void loadWallet();
    }
  }, [activeTab, loadWallet]);

  const handleWithdraw = async (event) => {
    event.preventDefault();
    setWithdrawBusy(true);
    try {
      const response = await api.post('/wallet/withdraw', {
        amount: Number.parseFloat(withdrawForm.amount),
        type: withdrawForm.type,
        bankCode: withdrawForm.bankCode,
        accountNumber: withdrawForm.accountNumber,
        name: withdrawForm.name || undefined,
      });
      if (response.data.user) {
        onUserUpdate(response.data.user);
      } else if (Number.isFinite(Number.parseFloat(response.data.wallet_balance))) {
        onUserUpdate({
          ...user,
          wallet_balance: Number.parseFloat(response.data.wallet_balance),
        });
      }
      setWithdrawForm((prev) => ({ ...prev, amount: '', accountNumber: '' }));
      flash(response.data.message || 'Withdrawal submitted');
      setShowWithdrawForm(false);
      await loadWallet();
    } catch (err) {
      flash(err, true);
    } finally {
      setWithdrawBusy(false);
    }
  };

  const handleEnableDva = async () => {
    if (!walletConsent) {
      flash('Confirm consent to create your QUANT transfer account.', true);
      return;
    }
    setWalletBusy(true);
    try {
      const response = await api.post('/wallet/dva', {
        phone: walletPhone,
        consent: true,
      });
      if (response.data.user) {
        onUserUpdate(response.data.user);
      }
      setWalletInfo(response.data.wallet || null);
      flash(response.data.message || 'Bank transfer account ready');
    } catch (err) {
      flash(err, true);
    } finally {
      setWalletBusy(false);
    }
  };

  const handleEnablePush = async () => {
    setPushBusy(true);
    try {
      const keyResponse = await api.get('/push/vapid-public-key');
      if (!keyResponse.data?.enabled || !keyResponse.data.publicKey) {
        flash('Push is not configured on the server yet (VAPID keys).', true);
        return;
      }
      const subscription = await subscribeToPush(keyResponse.data.publicKey);
      const response = await api.post('/push/subscribe', {
        subscription: subscription.toJSON(),
      });
      onUserUpdate(response.data.user);
      setPushEnabled(true);
      flash('Browser notifications enabled for this device');
    } catch (err) {
      flash(err, true);
    } finally {
      setPushBusy(false);
    }
  };

  const handleDisablePush = async () => {
    setPushBusy(true);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) {
        await api.delete('/push/subscribe', { data: { endpoint } });
      }
      const response = await api.post('/push/disable');
      onUserUpdate(response.data.user);
      setPushEnabled(false);
      flash('Browser notifications disabled');
    } catch (err) {
      flash(err, true);
    } finally {
      setPushBusy(false);
    }
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

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && isSettingsTabId(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'trash') {
      loadTrash();
    }
  }, [activeTab, loadTrash]);

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

  const handleSaveFinancialPreferences = async () => {
    setSaving(true);
    try {
      const response = await api.put(`/users/${user.user_id}/preferences`, {
        currency,
        currency_symbol: currencySymbol,
        fiscal_start_month: fiscalStartMonth,
      });
      onUserUpdate(response.data.user);
      flash('Preferences saved');
    } catch (err) {
      flash(err, true);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReminders = async () => {
    setSaving(true);
    try {
      const response = await api.put(`/users/${user.user_id}/preferences`, {
        email_notifications: emailNotifications,
        reminder_frequency: reminderFrequency,
        reminder_time: reminderTime,
        timezone,
      });
      onUserUpdate(response.data.user);
      flash('Reminder preferences saved');
    } catch (err) {
      flash(err, true);
    } finally {
      setSaving(false);
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

  const panelClass = 'surface overflow-hidden';
  const fundingHasDva = Boolean(
    walletInfo?.virtual_account_number || user?.virtual_account_number
  );
  const fundingWalletBal =
    Number.parseFloat(walletInfo?.wallet_balance ?? user?.wallet_balance) || 0;
  const fundingSettleCur = walletInfo?.currency || 'GHS';
  const fundingSettleSymbol = getCurrencyByCode(fundingSettleCur).symbol;

  const selectTab = (id) => {
    if (!isSettingsTabId(id)) return;
    setActiveTab(id);
    if (id === 'simulator' || id === 'wallet' || id === 'data' || id === 'trash') {
      setSearchParams({ tab: id }, { replace: true });
      return;
    }
    if (searchParams.get('tab')) {
      setSearchParams({}, { replace: true });
    }
  };

  const handleHelpNavigate = (page) => {
    if (page === 'settings') {
      selectTab('profile');
      return;
    }
    if (page.startsWith('settings-')) {
      const tab = page.slice('settings-'.length);
      if (isSettingsTabId(tab)) {
        selectTab(tab);
        return;
      }
    }
    if (page === 'simulator') {
      selectTab('simulator');
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
            {activeTab === 'simulator'
              ? 'Run a what-if scenario without putting an undated goal on the ledger.'
              : 'Currency, savings mode, security, and data for your QUANT ledger.'}
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <nav className="surface h-fit space-y-1 p-2 xl:sticky xl:top-24 xl:col-span-3 xl:self-start xl:z-10">
          {SETTINGS_TABS.map((tab) => {
            const active = (NAV_HIGHLIGHT_FOR[activeTab] || activeTab) === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
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

              <EarnerModeToggle
                userId={user.user_id}
                isEarner={isEarnerMode}
                hasBudget={hasBudget}
                onModeChange={onEarnerModeChange}
              />

              <section className={panelClass}>
                <div className="border-b border-primary-dark/[0.06] px-5 py-4">
                  <h3 className="card-title">More</h3>
                  <p className="mt-1 font-sans text-sm text-taupe">
                    Open only when you need export or deleted goals.
                  </p>
                </div>
                <div className="space-y-2 px-5 py-5">
                  <SettingsSectionLink
                    icon="database"
                    label="Data & export"
                    hint="Download your statement"
                    onClick={() => selectTab('data')}
                  />
                  <SettingsSectionLink
                    icon="delete"
                    label="Trash"
                    hint="Restore or permanently remove goals"
                    onClick={() => selectTab('trash')}
                  />
                </div>
              </section>
            </>
          )}

          {activeTab === 'wallet' && (
            <>
              <SettingsBackLink label="Financial" onClick={() => selectTab('financial')} />

              {budgetFunding && (
                <section className={panelClass}>
                  <div className="px-5 py-4">
                    <BudgetFundingMeter
                      progress={budgetFunding}
                      currencyCode={fundingSettleCur}
                      currencySymbol={fundingSettleSymbol}
                      compact
                      onEditBudget={
                        budgetFunding.status === 'no_budget'
                          ? () => selectTab('financial')
                          : undefined
                      }
                    />
                  </div>
                </section>
              )}

              <section className={panelClass}>
                <div className="space-y-3 px-5 py-5">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-primary-dark/10 bg-cream/40 px-3 py-2.5">
                      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-taupe">Account</p>
                      <p className="mt-1 font-sans text-sm text-primary-dark">
                        {fundingHasDva ? 'Ready' : 'Not set up'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-primary-dark/10 bg-cream/40 px-3 py-2.5">
                      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-taupe">Wallet</p>
                      <p className="mt-1 font-money text-sm text-primary-dark">
                        {formatMoney(fundingWalletBal, fundingSettleCur, fundingSettleSymbol)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-primary-dark/10 bg-cream/40 px-3 py-2.5">
                      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-taupe">On arrival</p>
                      <p className="mt-1 font-sans text-sm text-primary-dark">
                        {autoAllocateWallet ? 'Auto-apply on' : 'Park in wallet'}
                      </p>
                    </div>
                  </div>
                  <SettingsDisclosure
                    label="How money moves in QUANT"
                    open={showFundingGuide}
                    onToggle={() => setShowFundingGuide((prev) => !prev)}
                  >
                    <ol className="space-y-3 font-sans text-sm text-primary-dark">
                      <li>
                        <span className="font-normal">Transfer account</span>
                        <span className="mt-0.5 block text-taupe">
                          Send money from MoMo or bank to your Paystack virtual account.
                        </span>
                      </li>
                      <li>
                        <span className="font-normal">Wallet (unallocated)</span>
                        <span className="mt-0.5 block text-taupe">
                          Credits land here first — not on goal progress bars.
                        </span>
                      </li>
                      <li>
                        <span className="font-normal">Allocate to goals</span>
                        <span className="mt-0.5 block text-taupe">
                          Auto-apply by priority, or Allocate from wallet on a goal.
                        </span>
                      </li>
                    </ol>
                  </SettingsDisclosure>
                </div>
              </section>

              <section className={panelClass}>
                <div className="border-b border-primary-dark/[0.06] px-5 py-4">
                  <h3 className="card-title">Transfer account</h3>
                  <p className="mt-1 font-sans text-sm text-taupe">
                    Inbound Paystack virtual account — not a link to your personal MoMo login.
                  </p>
                </div>
                <div className="space-y-4 px-5 py-5">
                  {fundingHasDva ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="field-label">Account</p>
                          <p className="font-money text-[15px] text-primary-dark">
                            ••••{' '}
                            {String(
                              walletInfo?.virtual_account_number || user.virtual_account_number || ''
                            ).slice(-4)}
                          </p>
                          <p className="mt-0.5 font-sans text-xs text-taupe">
                            {walletInfo?.virtual_account_bank || user.virtual_account_bank || '—'}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn-ghost min-h-[40px] text-xs"
                          onClick={() => setShowTransferDetails((prev) => !prev)}
                        >
                          {showTransferDetails ? 'Hide details' : 'Show details'}
                        </button>
                      </div>
                      {showTransferDetails && (
                        <div className="space-y-3 rounded-lg border border-primary-dark/10 bg-cream/40 px-4 py-3">
                          <div>
                            <p className="field-label">Account number</p>
                            <p className="font-money text-[15px] text-primary-dark">
                              {walletInfo?.virtual_account_number || user.virtual_account_number}
                            </p>
                          </div>
                          <div>
                            <p className="field-label">Account name</p>
                            <p className="font-sans text-[15px] text-primary-dark">
                              {walletInfo?.virtual_account_name || user.virtual_account_name || '—'}
                            </p>
                          </div>
                          <p className="font-sans text-xs text-taupe">
                            In MoMo or bank, choose send / transfer and paste this number.
                          </p>
                        </div>
                      )}
                    </>
                  ) : showTransferSetup ? (
                    <>
                      <div>
                        <label className="field-label" htmlFor="wallet-phone">
                          Mobile number
                        </label>
                        <input
                          id="wallet-phone"
                          type="tel"
                          value={walletPhone}
                          onChange={(e) => setWalletPhone(e.target.value)}
                          placeholder="e.g. 024XXXXXXX"
                          className="field"
                        />
                      </div>
                      <label className="flex items-start gap-3 font-sans text-sm text-taupe">
                        <input
                          type="checkbox"
                          checked={walletConsent}
                          onChange={(e) => setWalletConsent(e.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          I consent to QUANT creating a Paystack virtual account with my name, email,
                          and phone so I can transfer money into my QUANT wallet. This does not give
                          QUANT access to my personal MoMo or bank login.
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleEnableDva}
                          disabled={walletBusy || !walletConsent}
                          className="btn-navy min-h-[44px] disabled:opacity-60"
                        >
                          {walletBusy ? 'Creating account…' : 'Get my QUANT transfer account'}
                        </button>
                        <button
                          type="button"
                          className="btn-ghost min-h-[44px]"
                          onClick={() => setShowTransferSetup(false)}
                        >
                          Cancel
                        </button>
                      </div>
                      {walletInfo && walletInfo.paystack_configured === false && (
                        <p className="font-sans text-xs text-taupe">
                          Transfers are not available yet — ask your admin to finish Paystack setup.
                        </p>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-navy min-h-[44px]"
                      onClick={() => setShowTransferSetup(true)}
                    >
                      Set up transfer account
                    </button>
                  )}
                </div>
              </section>

              <section className={panelClass}>
                <div className="border-b border-primary-dark/[0.06] px-5 py-4">
                  <h3 className="card-title">Wallet — unallocated</h3>
                  <p className="mt-1 font-sans text-sm text-taupe">
                    Holding balance after a transfer lands. Goal cards use a separate saved amount;
                    allocate to move money from here onto a goal.
                  </p>
                </div>
                <div className="space-y-4 px-5 py-5">
                  <div>
                    <p className="field-label">Available to allocate or cash out</p>
                    <p className="mt-1 font-money text-2xl font-light text-primary-dark">
                      {formatMoney(fundingWalletBal, fundingSettleCur, fundingSettleSymbol)}
                    </p>
                    <p className="mt-2 font-sans text-xs text-taupe">
                      Settled in {fundingSettleCur}. Not included in goal “Saved” totals until you allocate
                      (or auto-apply runs).
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-primary-dark/10 bg-cream/40 px-4 py-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-primary-dark"
                      checked={autoAllocateWallet}
                      onChange={async (e) => {
                        const next = e.target.checked;
                        setAutoAllocateWallet(next);
                        try {
                          await persistPreferences({ auto_allocate_wallet: next });
                          setWalletInfo((prev) => (prev ? { ...prev, auto_allocate_wallet: next } : prev));
                        } catch (err) {
                          setAutoAllocateWallet(!next);
                          flash(err, true);
                        }
                      }}
                    />
                    <span>
                      <span className="font-sans text-sm font-normal text-primary-dark">
                        Auto-apply when a transfer arrives
                      </span>
                      <span className="mt-1 block font-sans text-xs text-taupe">
                        Fills active goals in folio order (highest priority first), same as Allocate
                        from wallet. Off = leave funds here until you allocate manually on a goal.
                      </span>
                    </span>
                  </label>
                  {fundingWalletBal > 0 && (
                    <button
                      type="button"
                      className="btn-ghost min-h-[44px]"
                      onClick={() => onNavigate?.('savings')}
                    >
                      Go to goals to allocate
                    </button>
                  )}
                </div>
              </section>

              {(fundingWalletBal >= 1 || payouts.length > 0) && (
                <section className={panelClass}>
                  <div className="border-b border-primary-dark/[0.06] px-5 py-4">
                    <h3 className="card-title">Cash out</h3>
                    <p className="mt-1 font-sans text-sm text-taupe">
                      Send unallocated wallet funds to MoMo or bank. Goal “Reduce” only changes the ledger.
                    </p>
                  </div>
                  <div className="space-y-4 px-5 py-5">
                    {fundingWalletBal >= 1 && !showWithdrawForm && (
                      <button
                        type="button"
                        className="btn-navy min-h-[44px]"
                        onClick={() => setShowWithdrawForm(true)}
                      >
                        Withdraw to MoMo / bank
                      </button>
                    )}
                    {fundingWalletBal >= 1 && showWithdrawForm && (
                      <form className="space-y-4" onSubmit={handleWithdraw}>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="field-label" htmlFor="withdraw-amount">
                              Amount ({fundingSettleCur})
                            </label>
                            <input
                              id="withdraw-amount"
                              type="number"
                              min="1"
                              step="0.01"
                              required
                              value={withdrawForm.amount}
                              onChange={(e) =>
                                setWithdrawForm((prev) => ({ ...prev, amount: e.target.value }))
                              }
                              className="field font-money"
                            />
                          </div>
                          <div>
                            <label className="field-label" htmlFor="withdraw-type">
                              Destination type
                            </label>
                            <select
                              id="withdraw-type"
                              value={withdrawForm.type}
                              onChange={(e) => {
                                const nextType = e.target.value;
                                const list = nextType === 'mobile_money'
                                  ? (payoutDestinations?.mobile_money || [])
                                  : (payoutDestinations?.banks || []);
                                setWithdrawForm((prev) => ({
                                  ...prev,
                                  type: nextType,
                                  bankCode: list[0]?.code || '',
                                }));
                              }}
                              className="field"
                            >
                              <option value="mobile_money">Mobile Money</option>
                              <option value="ghipss">Ghana bank (GHIPSS)</option>
                            </select>
                          </div>
                          <div>
                            <label className="field-label" htmlFor="withdraw-provider">
                              {withdrawForm.type === 'mobile_money' ? 'Network' : 'Bank'}
                            </label>
                            <select
                              id="withdraw-provider"
                              value={withdrawForm.bankCode}
                              onChange={(e) =>
                                setWithdrawForm((prev) => ({ ...prev, bankCode: e.target.value }))
                              }
                              className="field"
                              required
                            >
                              {(withdrawForm.type === 'mobile_money'
                                ? (payoutDestinations?.mobile_money || [
                                    { code: 'MTN', name: 'MTN' },
                                    { code: 'ATL', name: 'AirtelTigo' },
                                    { code: 'VOD', name: 'Telecel / Vodafone' },
                                  ])
                                : (payoutDestinations?.banks || [])
                              ).map((item) => (
                                <option key={item.code || item.id} value={item.code}>
                                  {item.name} ({item.code})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="field-label" htmlFor="withdraw-account">
                              {withdrawForm.type === 'mobile_money' ? 'MoMo number' : 'Account number'}
                            </label>
                            <input
                              id="withdraw-account"
                              type="text"
                              required
                              value={withdrawForm.accountNumber}
                              onChange={(e) =>
                                setWithdrawForm((prev) => ({ ...prev, accountNumber: e.target.value }))
                              }
                              placeholder={withdrawForm.type === 'mobile_money' ? '0551234567' : '0123456789'}
                              className="field"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="field-label" htmlFor="withdraw-name">
                              Account name <span className="font-light text-taupe">(optional)</span>
                            </label>
                            <input
                              id="withdraw-name"
                              type="text"
                              value={withdrawForm.name}
                              onChange={(e) =>
                                setWithdrawForm((prev) => ({ ...prev, name: e.target.value }))
                              }
                              className="field"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            disabled={withdrawBusy}
                            className="btn-navy min-h-[44px] disabled:opacity-60"
                          >
                            {withdrawBusy ? 'Submitting…' : 'Confirm withdrawal'}
                          </button>
                          <button
                            type="button"
                            className="btn-ghost min-h-[44px]"
                            onClick={() => setShowWithdrawForm(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                    {payouts.length > 0 && (
                      <div className={fundingWalletBal >= 1 ? 'border-t border-primary-dark/[0.06] pt-4' : ''}>
                        <p className="field-label mb-3">Recent withdrawals</p>
                        <ul className="space-y-2">
                          {payouts.slice(0, 5).map((item) => (
                            <li
                              key={item.payout_id}
                              className="flex flex-wrap items-center justify-between gap-2 font-sans text-sm text-primary-dark"
                            >
                              <span className="font-money">
                                {formatMoney(
                                  item.amount,
                                  item.currency || 'GHS',
                                  getCurrencyByCode(item.currency || 'GHS').symbol
                                )}
                              </span>
                              <span className="text-taupe">
                                {item.recipient_type} · {item.bank_code} · {item.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </>
          )}

          {activeTab === 'reminders' && (
            <>
              <section className={panelClass}>
                <div className="border-b border-primary-dark/[0.06] px-5 py-4">
                  <h3 className="card-title">Email reminders</h3>
                  <p className="mt-1 font-sans text-sm text-taupe">
                    Nudges for daily targets, inactivity, deadlines, and goal completions.
                  </p>
                </div>
                <div className="space-y-5 px-5 py-5">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-primary-dark"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                    />
                    <span>
                      <span className="block font-sans text-[15px] font-light text-primary-dark">
                        Send email notifications
                      </span>
                      <span className="mt-0.5 block font-sans text-xs text-taupe">
                        Master switch for scheduled reminders and goal-complete emails.
                      </span>
                    </span>
                  </label>

                  {emailNotifications && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="field-label" htmlFor="reminder-frequency">
                          Cadence
                        </label>
                        <select
                          id="reminder-frequency"
                          className="field"
                          value={reminderFrequency}
                          onChange={(e) => setReminderFrequency(e.target.value)}
                        >
                          <option value="daily">Daily nudge</option>
                          <option value="weekly">Weekly summary</option>
                          <option value="off">Scheduled off (completions only)</option>
                        </select>
                      </div>
                      <div>
                        <label className="field-label" htmlFor="reminder-time">
                          Preferred hour
                        </label>
                        <select
                          id="reminder-time"
                          className="field"
                          value={reminderTime?.slice(0, 5) || '09:00'}
                          onChange={(e) => setReminderTime(e.target.value)}
                        >
                          {REMINDER_HOURS.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="field-label" htmlFor="reminder-timezone">
                          Timezone
                        </label>
                        <select
                          id="reminder-timezone"
                          className="field"
                          value={
                            REMINDER_TIMEZONES.some((item) => item.value === timezone)
                              ? timezone
                              : 'UTC'
                          }
                          onChange={(e) => setTimezone(e.target.value)}
                        >
                          {!REMINDER_TIMEZONES.some((item) => item.value === timezone) && (
                            <option value={timezone}>{timezone}</option>
                          )}
                          {REMINDER_TIMEZONES.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <SettingsDisclosure
                    label="How email reminders work"
                    open={showReminderGuide}
                    onToggle={() => setShowReminderGuide((prev) => !prev)}
                  >
                    <ul className="space-y-2 font-sans text-sm text-taupe">
                      <li>After 7 days with no deposit on a goal, you get an inactivity nudge.</li>
                      <li>If you still have not deposited, reminders continue every 2 days, then weekly.</li>
                      <li>Deadline and at-risk alerts still apply when a goal is close and behind.</li>
                    </ul>
                  </SettingsDisclosure>
                </div>
              </section>

              <SettingsDisclosure
                label="Also notify this device (browser push)"
                open={showPushSettings}
                onToggle={() => setShowPushSettings((prev) => !prev)}
              >
                {!pushSupported ? (
                  <p className="font-sans text-sm text-taupe">
                    This browser does not support web push. Try Chrome or Edge on desktop/Android.
                    On iPhone, install QUANT to the Home Screen first (PWA).
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="font-sans text-sm text-taupe">
                      Status:{' '}
                      <span className="text-primary-dark">
                        {pushEnabled ? 'Enabled on this account' : 'Off'}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={pushBusy}
                        onClick={handleEnablePush}
                        className="btn-navy min-h-[44px] disabled:opacity-60"
                      >
                        {pushBusy ? 'Working…' : pushEnabled ? 'Refresh this device' : 'Enable on this device'}
                      </button>
                      <button
                        type="button"
                        disabled={pushBusy || !pushEnabled}
                        onClick={handleDisablePush}
                        className="btn-ghost min-h-[44px] px-4 disabled:opacity-60"
                      >
                        {pushBusy && pushEnabled ? 'Disabling…' : 'Disable push'}
                      </button>
                    </div>
                    <p className="font-sans text-xs text-taupe">
                      Uses your reminder hour and timezone. iOS only works after Add to Home Screen.
                    </p>
                  </div>
                )}
              </SettingsDisclosure>

              <button
                type="button"
                onClick={handleSaveReminders}
                disabled={saving}
                className="btn-navy min-h-[44px] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Reminders'}
              </button>
            </>
          )}

          {activeTab === 'financial' && (
            <>
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

              <BudgetSetup
                userId={user.user_id}
                currentBudget={monthlyBudget}
                isEarnerMode={isEarnerMode}
                onBudgetSet={onBudgetSet}
                currencyCode={currency}
                currencySymbol={currencySymbol}
              />

              <SettingsDisclosure
                label="Advanced — fiscal year"
                open={showFiscalAdvanced}
                onToggle={() => setShowFiscalAdvanced((prev) => !prev)}
              >
                <p className="mb-3 font-sans text-sm text-taupe">
                  When your reporting cycle begins.
                </p>
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
              </SettingsDisclosure>

              <button
                type="button"
                onClick={handleSaveFinancialPreferences}
                disabled={saving}
                className="btn-navy min-h-[44px] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Financial Preferences'}
              </button>

              <section className={panelClass}>
                <div className="border-b border-primary-dark/[0.06] px-5 py-4">
                  <h3 className="card-title">More</h3>
                  <p className="mt-1 font-sans text-sm text-taupe">
                    Funding and what-if planning — open when you need them.
                  </p>
                </div>
                <div className="space-y-2 px-5 py-5">
                  <SettingsSectionLink
                    icon="account_balance_wallet"
                    label="Funding"
                    hint="Transfer account, wallet, and cash out"
                    onClick={() => selectTab('wallet')}
                  />
                  <SettingsSectionLink
                    icon="query_stats"
                    label="What-if simulator"
                    hint="Test a goal before committing it to the ledger"
                    onClick={() => selectTab('simulator')}
                  />
                </div>
              </section>
            </>
          )}

          {activeTab === 'simulator' && (
            <>
              <SettingsBackLink label="Financial" onClick={() => selectTab('financial')} />
              <GoalSimulatorPage
                embedded
                user={user}
                isEarnerMode={isEarnerMode}
                currencyCode={currency}
                currencySymbol={currencySymbol}
                onGoalCreated={onGoalCreated}
                onOpenLedger={() => onNavigate?.('savings')}
              />
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
                    <PasswordInput
                      id="current-password"
                      variant="field"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="new-password">
                      New Password
                    </label>
                    <PasswordInput
                      id="new-password"
                      variant="field"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="confirm-password">
                      Confirm New Password
                    </label>
                    <PasswordInput
                      id="confirm-password"
                      variant="field"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      autoComplete="new-password"
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
              <SettingsBackLink label="Profile" onClick={() => selectTab('profile')} />
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

              <SettingsDisclosure
                label="Danger zone — soft reset"
                open={showSoftReset}
                onToggle={() => setShowSoftReset((prev) => !prev)}
              >
                <p className="mb-3 font-sans text-sm text-taupe">
                  Archive the current cycle and begin fresh. Export first — available in a future release.
                </p>
                <button
                  type="button"
                  disabled
                  className="btn-ghost min-h-[44px] cursor-not-allowed opacity-50"
                >
                  Soft Reset (Coming Soon)
                </button>
              </SettingsDisclosure>
            </>
          )}

          {activeTab === 'trash' && (
            <>
            <SettingsBackLink label="Profile" onClick={() => selectTab('profile')} />
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
            </>
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
