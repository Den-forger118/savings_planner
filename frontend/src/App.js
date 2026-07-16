import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from './services/api';
import BudgetSetup from './components/BudgetSetup';
import CreateGoalForm from './components/CreateGoalForm';
import Dashboard from './components/Dashboard';
import ActivityLedger from './components/ActivityLedger';
import Pagination from './components/Pagination';
import GoalActions from './components/GoalActions';
import ExpenseSummary from './components/ExpenseSummary';
import SettingsPage from './components/SettingsPage';
import OnboardingPage from './pages/OnboardingPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import { formatMoney } from './utils/currency';

const GOALS_PER_PAGE = 12;

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const parseAmount = (value) => {
  const amount = parseFloat(value);
  return Number.isFinite(amount) ? amount : 0;
};

const CircularProgress = ({ value, size = 88, strokeWidth = 5 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative shrink-0 self-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E8E4DC"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#D4A574"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-money text-base font-bold text-primary-dark">{Math.round(clamped)}%</span>
      </div>
    </div>
  );
};

function GoalPortfolioCard({
  goal,
  user,
  setGoals,
  onGoalUpdated,
  onGoalDeleted,
  onTransactionRecorded,
}) {
  const goalActionsRef = useRef(null);
  const menuRef = useRef(null);
  const infoRef = useRef(null);
  const statusPopoverRef = useRef(null);
  const frequencyPopoverRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [goalSuggestions, setGoalSuggestions] = useState(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [openPopover, setOpenPopover] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState('deposit');
  const [txNote, setTxNote] = useState('');
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState(null);

  const completion = Math.min(100, Math.max(0, parseAmount(goal.percentage_complete)));
  const monthlyNeeded = parseAmount(goal.savings_needed?.monthly);
  const allocated = parseAmount(goal.allocated_monthly_amount);
  const shortfall = Math.max(0, monthlyNeeded - allocated);
  const surplusDeficit = parseAmount(goal.surplus_deficit);
  const isComplete = goal.is_complete === true;
  const isPaused = goal.is_paused === true;
  const isOnHold = isPaused && !isComplete;
  const isEarnerMode = goal.mode !== 'non-earner';
  const money = (value) => formatMoney(value, user.currency || 'USD', user.currency_symbol || '$');
  const isExactlyOnTrack = surplusDeficit === 0;
  const isAhead = goal.is_surplus && surplusDeficit > 0;
  const isBehindSchedule = !isExactlyOnTrack && !isAhead;
  const isUnderfunded = isEarnerMode && goal.is_feasible === false;
  const showWarningIcon = isBehindSchedule || !goal.on_track || isUnderfunded;

  const statusTooltipText = (() => {
    if (showWarningIcon) {
      const issues = [];
      if (isBehindSchedule || !goal.on_track) issues.push('Behind schedule');
      if (isUnderfunded) issues.push(`Underfunded (${money(shortfall)}/mo short)`);
      return issues.join(' · ');
    }
    if (isAhead) {
      return `On track · ${money(surplusDeficit)} ahead of schedule`;
    }
    if (isEarnerMode && goal.is_feasible) {
      return 'On track · Achievable with current funding';
    }
    return 'On track';
  })();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (infoRef.current && !infoRef.current.contains(event.target)) {
        setSuggestionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!openPopover) return undefined;

    const handleClickOutside = (event) => {
      const inStatus = statusPopoverRef.current?.contains(event.target);
      const inFrequency = frequencyPopoverRef.current?.contains(event.target);
      if (!inStatus && !inFrequency) {
        setOpenPopover(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openPopover]);

  useEffect(() => {
    if (!showTransactionModal) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowTransactionModal(false);
        setTxError(null);
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showTransactionModal]);

  const closeMenu = () => setMenuOpen(false);

  const resetTransactionForm = () => {
    setTxAmount('');
    setTxType('deposit');
    setTxNote('');
    setTxError(null);
  };

  const closeTransactionModal = () => {
    setShowTransactionModal(false);
    resetTransactionForm();
  };

  const handleTransactionSubmit = async (event) => {
    event.preventDefault();
    setTxError(null);

    if (!txAmount || parseFloat(txAmount) <= 0) {
      setTxError('Please enter a valid amount');
      return;
    }

    setTxLoading(true);

    try {
      const response = await api.post('/transactions', {
        userId: user.user_id,
        goalId: goal.goal_id,
        amount: parseFloat(txAmount),
        type: txType,
        note: txNote,
      });

      setGoals((goals) => goals.map((g) =>
        g.goal_id === response.data.updated_goal.goal_id ? response.data.updated_goal : g
      ));
      onTransactionRecorded?.(response.data);
      closeTransactionModal();
    } catch (err) {
      setTxError(err.response?.data?.error || 'Failed to record transaction');
    } finally {
      setTxLoading(false);
    }
  };

  const handleMenuAction = (action) => {
    closeMenu();

    if (action === 'edit') {
      setIsEditing(true);
      setActivePanel('edit');
      return;
    }

    if (action === 'delete') {
      goalActionsRef.current?.deleteGoal();
      return;
    }

    if (action === 'transaction') {
      resetTransactionForm();
      setShowTransactionModal(true);
      return;
    }

    if (action === 'pause' || action === 'resume') {
      handlePauseToggle();
    }
  };

  const handlePauseToggle = async () => {
    const nextPaused = !isPaused;
    const confirmed = window.confirm(
      nextPaused
        ? `Put "${goal.name}" on hold? It will be removed from budget allocation until you resume it.`
        : `Resume "${goal.name}"? Your budget will be recalculated across active goals.`
    );

    if (!confirmed) return;

    try {
      const response = await api.patch(`/goals/${goal.goal_id}/pause`, {
        is_paused: nextPaused,
      });
      setGoals(response.data.goals);
    } catch (err) {
      window.alert(err.response?.data?.error || 'Failed to update goal status');
    }
  };

  const fetchSuggestions = async () => {
    if (goalSuggestions) {
      setSuggestionsOpen((open) => !open);
      return;
    }

    setSuggestionsLoading(true);
    setSuggestionsOpen(true);

    try {
      const response = await api.get(`/suggestions?userId=${user.user_id}`);
      const match = response.data.goals?.find((g) => g.goal_id === goal.goal_id);
      setGoalSuggestions(match || { recommendations: [], issues: [] });
    } catch {
      setGoalSuggestions({ recommendations: ['Unable to load suggestions right now.'], issues: [] });
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const menuItems = [
    ...(!isComplete
      ? [{
          id: isPaused ? 'resume' : 'pause',
          label: isPaused ? 'Resume Goal' : 'Put on Hold',
          icon: isPaused ? 'play_arrow' : 'pause_circle',
        }]
      : []),
    { id: 'edit', label: 'Edit', icon: 'edit' },
    { id: 'delete', label: 'Delete', icon: 'delete', danger: true },
    { id: 'transaction', label: 'Record Transaction', icon: 'add_circle' },
  ];

  const toggleStatusPopover = (event) => {
    event.stopPropagation();
    setOpenPopover((current) => (current === 'status' ? null : 'status'));
  };

  const toggleFrequencyPopover = (event) => {
    event.stopPropagation();
    setOpenPopover((current) => (current === 'frequencies' ? null : 'frequencies'));
  };

  const frequencyCells = [
    ['Daily', goal.savings_needed?.daily],
    ['Weekly', goal.savings_needed?.weekly],
    ['Monthly', goal.savings_needed?.monthly],
    ['Yearly', goal.savings_needed?.annual],
  ];

  return (
    <article
      className={`relative flex w-full shrink-0 flex-col rounded-lg sm:w-[400px] ${isComplete || isOnHold ? 'opacity-70 grayscale-[30%]' : ''}`}
      style={{
        background: '#FDFAF5',
        border: '1px solid #D4A574',
        boxShadow: '0 4px 24px rgba(26, 35, 64, 0.08)',
        borderRadius: '0.5rem',
      }}
    >
      {isComplete && (
        <div
          className="pointer-events-none absolute right-3 top-3 z-10 rotate-[-12deg] rounded-lg border-4 border-gold bg-primary-dark/80 px-2.5 py-1 opacity-90"
          title="Completed — use the menu to edit or correct transactions"
        >
          <p className="font-serif text-xs font-bold uppercase tracking-widest text-gold">
            Complete ✓
          </p>
        </div>
      )}
      {isOnHold && (
        <div
          className="pointer-events-none absolute right-3 top-3 z-10 rotate-[-12deg] rounded-lg border-4 border-taupe/40 bg-primary-dark/80 px-2.5 py-1 opacity-90"
          title="On hold — resume from the menu to include in budget allocation again"
        >
          <p className="font-serif text-xs font-bold uppercase tracking-widest text-cream">
            On Hold
          </p>
        </div>
      )}

      <div className="rounded-t-lg bg-primary-dark px-4 py-3 text-cream">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-cream/50">
              Private Objective
            </p>
            <h3 className={`mt-0.5 truncate font-serif text-xl font-bold leading-tight ${isComplete || isOnHold ? 'pr-24' : ''}`}>
              {goal.name}
            </h3>
            {isComplete && goal.completed_at && (
              <p className="mt-0.5 font-sans text-[11px] text-cream/70">
                Completed {new Date(goal.completed_at).toLocaleDateString()}
              </p>
            )}
            {isOnHold && goal.paused_at && (
              <p className="mt-0.5 font-sans text-[11px] text-cream/70">
                On hold since {new Date(goal.paused_at).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="relative z-20 flex shrink-0 items-start gap-1.5">
            {!isComplete && !isPaused && (
              <div className="group/status relative" ref={statusPopoverRef}>
                {showWarningIcon ? (
                  <button
                    type="button"
                    onClick={toggleStatusPopover}
                    aria-label={statusTooltipText}
                    className="flex h-8 w-8 items-center justify-center"
                  >
                    <span className="animate-pulse cursor-pointer font-serif text-2xl font-bold text-orange-400">!</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={toggleStatusPopover}
                    aria-label={statusTooltipText}
                    className="flex h-8 w-8 items-center justify-center font-serif text-xl font-bold text-gold transition-colors hover:text-gold-light"
                  >
                    ✓
                  </button>
                )}

                <div
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 hidden max-w-[240px] rounded-lg bg-primary-dark px-3 py-2 shadow-lg group-hover/status:block"
                >
                  <p className="font-sans text-xs leading-relaxed text-cream">{statusTooltipText}</p>
                  <div className="absolute -bottom-1.5 right-3 h-3 w-3 rotate-45 bg-primary-dark" />
                </div>

                {openPopover === 'status' && (
                  <div
                    className={`absolute bottom-full right-0 z-50 mb-2 max-w-[220px] rounded-lg p-4 shadow-xl ${
                      showWarningIcon
                        ? 'bg-primary-dark text-cream'
                        : 'border border-gold bg-primary-dark text-cream'
                    }`}
                  >
                    {isBehindSchedule || !goal.on_track ? (
                      <>
                        <p className="font-sans text-xs font-semibold">
                          ⚠ You&apos;re {money(Math.abs(surplusDeficit))} behind schedule.
                        </p>
                        <p className="mt-1 font-sans text-xs text-cream/80">
                          Save an extra {money(parseAmount(goal.extra_per_day_to_catch_up))}/day to catch up.
                        </p>
                        {isUnderfunded && (
                          <p className="mt-2 font-sans text-xs text-cream/80">
                            Allocation is {money(shortfall)}/month below what&apos;s needed.
                          </p>
                        )}
                      </>
                    ) : isAhead ? (
                      <>
                        <p className="font-sans text-xs font-semibold">
                          ✓ You&apos;re {money(surplusDeficit)} ahead.
                        </p>
                        <p className="mt-1 font-sans text-xs text-cream/80">
                          You can skip saving for {parseAmount(goal.days_can_skip).toFixed(1)} days.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-sans text-xs font-semibold">✓ You&apos;re on track.</p>
                        {isEarnerMode && goal.is_feasible && (
                          <p className="mt-1 font-sans text-xs text-cream/80">
                            Current funding covers this goal&apos;s monthly need.
                          </p>
                        )}
                      </>
                    )}
                    <div
                      className={`absolute -bottom-1.5 right-3 h-3 w-3 rotate-45 ${
                        showWarningIcon ? 'bg-primary-dark' : 'border-b border-r border-gold bg-primary-dark'
                      }`}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="relative shrink-0" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-label="Goal actions"
                  className="rounded border border-cream/20 p-1 text-cream/80 transition-colors hover:border-cream/40 hover:bg-cream/10"
                >
                  <Icon name="more_vert" className="text-lg" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                    {menuItems.map(({ id, label, icon, danger }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleMenuAction(id)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left font-sans text-sm transition-colors hover:bg-cream/50 ${
                          danger ? 'text-red-700 hover:bg-red-50' : 'text-primary-dark'
                        }`}
                      >
                        <Icon name={icon} className="text-base" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>

      <div className={`flex flex-1 flex-col gap-3 p-4 ${!isComplete && !isPaused && isEarnerMode ? '' : 'rounded-b-lg'}`}>
        <div className="flex items-center gap-2.5">
          <CircularProgress value={isComplete ? 100 : completion} />

          <div className="min-w-0 flex-1">
            <p className="font-sans text-[9px] font-bold uppercase tracking-widest text-taupe/70">
              Goal Status
            </p>
            <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1">
              {[
                ['Target', money(goal.target_amount)],
                ['Saved', money(goal.saved_amount)],
                ['Remaining', money(goal.remaining_amount)],
                ['Days Left', goal.days_remaining],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="font-sans text-[9px] font-medium uppercase tracking-wide text-taupe/55">
                    {label}
                  </p>
                  <p className="font-money text-sm font-bold leading-tight text-primary-dark">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {!isComplete && !isPaused && (
          <>
            <div className="border-t border-cream/80 pt-2">
              <div className="relative flex items-center justify-between rounded border border-cream bg-cream/30 px-2 py-1.5" ref={frequencyPopoverRef}>
                <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-taupe/70">
                  Monthly Savings Needed
                </p>
                <div className="flex items-center gap-2">
                  <p className="font-money text-sm font-bold text-primary-dark">
                    {money(monthlyNeeded)}
                  </p>
                  <button
                    type="button"
                    onClick={toggleFrequencyPopover}
                    aria-label="View all savings frequencies"
                    className="text-gold transition-colors hover:text-gold-light"
                  >
                    <Icon name="grid_view" className="text-sm" />
                  </button>
                </div>

                {openPopover === 'frequencies' && (
                  <div className="absolute bottom-full right-0 z-50 mb-2 w-[220px] rounded-lg border border-gold bg-white p-4 shadow-xl">
                    <div className="grid grid-cols-2 gap-3">
                      {frequencyCells.map(([label, value]) => (
                        <div key={label} className="rounded bg-cream p-2">
                          <p className="font-sans text-xs uppercase tracking-wide text-taupe">{label}</p>
                          <p className="font-money text-base font-bold text-primary-dark">
                            {money(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="absolute -bottom-1.5 right-4 h-3 w-3 rotate-45 border-b border-r border-gold bg-white" />
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <GoalActions
            ref={goalActionsRef}
            goal={goal}
            currencySymbol={user.currency_symbol || '$'}
            onGoalUpdated={(updatedGoals) => {
              onGoalUpdated(updatedGoals);
              setIsEditing(false);
              setActivePanel(null);
            }}
            onGoalDeleted={onGoalDeleted}
            hideActionButtons
            isEditing={isEditing}
            onEditingChange={(value) => {
              const next = typeof value === 'function' ? value(isEditing) : value;
              setIsEditing(next);
              if (!next) {
                setActivePanel(null);
              }
            }}
          />

      </div>

      {!isComplete && !isPaused && isEarnerMode && (
        <div className="mt-auto rounded-b-lg bg-primary-dark px-4 py-3 text-cream">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-cream/50">
                Monthly Allocation
              </p>
              <p className="mt-0.5 font-money text-lg font-bold leading-tight">
                {money(allocated)}
              </p>
              <p className="mt-0.5 font-sans text-[11px] text-cream/60">
                {goal.is_feasible
                  ? 'Achievable with current funding'
                  : `Shortfall: ${money(shortfall)}/month`}
              </p>
            </div>

            <div className="relative shrink-0" ref={infoRef}>
              <button
                type="button"
                onClick={fetchSuggestions}
                aria-label="View improvement suggestions"
                className="rounded border border-cream/20 p-1 text-cream/80 transition-colors hover:border-cream/40 hover:bg-cream/10"
              >
                <Icon name="info" className="text-lg" />
              </button>

              {suggestionsOpen && (
                <div className="absolute bottom-full right-0 z-30 mb-2 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
                  <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">
                    Suggestions
                  </p>
                  {suggestionsLoading ? (
                    <p className="font-sans text-xs text-taupe">Loading...</p>
                  ) : (
                    <div className="space-y-2">
                      {goalSuggestions?.issues?.length > 0 && (
                        <ul className="space-y-1">
                          {goalSuggestions.issues.map((issue, index) => (
                            <li key={index} className="font-sans text-xs text-red-700">
                              {issue}
                            </li>
                          ))}
                        </ul>
                      )}
                      {goalSuggestions?.recommendations?.map((tip, index) => (
                        <p key={index} className="font-sans text-xs leading-relaxed text-primary-dark">
                          {tip}
                        </p>
                      ))}
                      {!goalSuggestions?.issues?.length && !goalSuggestions?.recommendations?.length && (
                        <p className="font-sans text-xs text-taupe">No suggestions available.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showTransactionModal && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="presentation"
          onClick={closeTransactionModal}
        >
          <div className="absolute inset-0 bg-primary-dark/40 backdrop-blur-sm" />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-transaction-title"
            className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-primary-dark px-5 py-3.5 text-cream">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-gold">
                    Goal Ledger
                  </p>
                  <h2 id="record-transaction-title" className="mt-0.5 font-serif text-xl font-bold leading-tight">
                    Record Transaction
                  </h2>
                  <p className="mt-0.5 font-sans text-xs text-cream/60">{goal.name}</p>
                </div>
                <button
                  type="button"
                  onClick={closeTransactionModal}
                  aria-label="Close"
                  className="rounded-md border-2 border-cream/40 p-1 text-cream/80 transition-colors hover:border-cream/70 hover:bg-cream/10 hover:text-cream"
                >
                  <Icon name="close" className="text-lg" />
                </button>
              </div>
            </div>

            <form onSubmit={handleTransactionSubmit} className="space-y-3.5 px-5 py-4">
              <div className="grid grid-cols-2 gap-0.5 rounded-md border border-gray-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setTxType('deposit')}
                  className={`rounded-md px-3 py-2 font-sans text-xs font-semibold uppercase tracking-wider transition-colors ${
                    txType === 'deposit'
                      ? 'bg-primary-dark text-cream'
                      : 'text-taupe hover:text-primary-dark'
                  }`}
                >
                  Deposit
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('withdrawal')}
                  className={`rounded-md px-3 py-2 font-sans text-xs font-semibold uppercase tracking-wider transition-colors ${
                    txType === 'withdrawal'
                      ? 'bg-primary-dark text-cream'
                      : 'text-taupe hover:text-primary-dark'
                  }`}
                >
                  Withdrawal
                </button>
              </div>

              <div>
                <label
                  htmlFor={`tx-amount-${goal.goal_id}`}
                  className="mb-1.5 block font-sans text-[10px] font-bold uppercase tracking-widest text-taupe"
                >
                  Amount
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-money text-lg font-bold text-primary-dark">{user.currency_symbol || '$'}</span>
                  <input
                    id={`tx-amount-${goal.goal_id}`}
                    type="number"
                    value={txAmount}
                    onChange={(event) => setTxAmount(event.target.value)}
                    placeholder="100.00"
                    step="0.01"
                    min="0"
                    autoFocus
                    className="w-full rounded-md border border-gray-200 px-3 py-2 font-money text-sm transition-colors focus:border-primary-dark focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={`tx-note-${goal.goal_id}`}
                  className="mb-1.5 block font-sans text-[10px] font-bold uppercase tracking-widest text-taupe"
                >
                  Note <span className="font-normal normal-case tracking-normal text-taupe/70">(optional)</span>
                </label>
                <input
                  id={`tx-note-${goal.goal_id}`}
                  type="text"
                  value={txNote}
                  onChange={(event) => setTxNote(event.target.value)}
                  placeholder="e.g., Monthly savings"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 font-sans text-sm transition-colors focus:border-primary-dark focus:outline-none"
                />
              </div>

              {txError && (
                <div className="rounded-md border-l-2 border-red-500 bg-red-50 px-3 py-2">
                  <p className="font-sans text-xs text-red-700">{txError}</p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-3.5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeTransactionModal}
                  disabled={txLoading}
                  className="rounded-md border border-gray-200 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-taupe transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={txLoading}
                  className="rounded-md bg-primary-dark px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-cream transition-colors hover:bg-primary-dark-alt disabled:opacity-50"
                >
                  {txLoading ? 'Recording...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </article>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authPage, setAuthPage] = useState('login');
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthlyBudget, setMonthlyBudget] = useState(null);
  const [expenseRefresh, setExpenseRefresh] = useState(0);
  const [transactionRefresh, setTransactionRefresh] = useState(0);
  const [activityGoalFilter, setActivityGoalFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [goalsPage, setGoalsPage] = useState(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [completedGoalName, setCompletedGoalName] = useState(null);
  const [isEarnerMode, setIsEarnerMode] = useState(false);
  const [uiDensity, setUiDensity] = useState('classic');

  const userCurrency = user?.currency || 'USD';
  const userCurrencySymbol = user?.currency_symbol || '$';

  const applyTheme = (theme) => {
    document.documentElement.classList.toggle('theme-midnight', theme === 'midnight');
  };

  const handleUserUpdate = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    applyTheme(updatedUser.theme || 'classic');
    setUiDensity(updatedUser.ui_density || 'classic');
  };

  const handleTransactionRecorded = (responseData) => {
    setTransactionRefresh((prev) => prev + 1);

    if (responseData?.goal_completed) {
      setCompletedGoalName(responseData.completed_goal_name);
      fetchData();
      setTimeout(() => setCompletedGoalName(null), 5000);
    }
  };

  const openActivityPage = (goalId = 'all') => {
    setActivityGoalFilter(goalId === undefined ? 'all' : String(goalId));
    setCurrentPage('activity');
    setMobileMenuOpen(false);
  };

  const normalizeAmount = (value) => {
    const amount = parseFloat(value);
    return Number.isFinite(amount) ? amount : null;
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      applyTheme(parsedUser.theme || 'classic');
      setUiDensity(parsedUser.ui_density || 'classic');
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.onboarding_complete === false) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [user]);

  const handleOnboardingComplete = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    setIsEarnerMode(updatedUser.mode === 'earner' || updatedUser.is_earner);
    applyTheme(updatedUser.theme || 'classic');
    setUiDensity(updatedUser.ui_density || 'classic');
    setLoading(true);
  };

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(goals.length / GOALS_PER_PAGE));
    if (goalsPage > totalPages) {
      setGoalsPage(totalPages);
    }
  }, [goals.length, goalsPage]);

  const fetchData = async () => {
    try {
      const goalsResponse = await api.get(
        `/goals?userId=${user.user_id}`
      );
      setGoals(goalsResponse.data.goals);
      setMonthlyBudget(normalizeAmount(goalsResponse.data.monthly_budget));
      setIsEarnerMode(goalsResponse.data.mode === 'earner');
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogin = (userData, userToken, redirect) => {
    if (redirect === 'register') {
      setAuthPage('register');
      return;
    }
    setUser(userData);
    setIsEarnerMode(userData.mode === 'earner' || userData.is_earner === true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setGoals([]);
    setMonthlyBudget(null);
    setIsEarnerMode(false);
    setAuthPage('login');
    setCurrentPage('dashboard');
  };

  const handleBudgetSet = (budget, updatedUser) => {
    const normalizedBudget = normalizeAmount(budget);
    setMonthlyBudget(normalizedBudget);
    const nextUser = updatedUser || { ...user, monthly_budget: normalizedBudget };
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
    fetchData();
  };

  const handleEarnerModeChange = (updatedUser, mode) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    setIsEarnerMode(mode === 'earner');
    fetchData();
  };

  const hasBudget = parseAmount(monthlyBudget) > 0;

  const handleGoalCreated = () => {
    fetchData();
    setGoalsPage(1);
  };

  const handleGoalUpdated = (updatedGoals) => {
    setGoals(updatedGoals);
  };

  const handleGoalDeleted = (updatedGoals) => {
    if (Array.isArray(updatedGoals)) {
      setGoals(updatedGoals);
      return;
    }
    fetchData();
  };

  if (!user) {
    if (authPage === 'register') {
      return (
        <RegisterPage
          onRegister={handleLogin}
          onSwitchToLogin={() => setAuthPage('login')}
        />
      );
    }
    return <LoginPage onLogin={handleLogin} />;
  }

  if (user.onboarding_complete === false) {
    return <OnboardingPage user={user} onComplete={handleOnboardingComplete} />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          <p className="mt-5 font-sans text-sm font-bold uppercase tracking-widest text-primary-dark">
            Preparing your private ledger
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-6">
        <div className="max-w-md rounded-lg border-t-4 border-red-500 bg-white p-8 shadow-lg">
          <h2 className="font-serif text-2xl font-bold text-primary-dark">Unable to Load</h2>
          <p className="mt-2 font-sans text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const totalTarget = goals.reduce((sum, g) => sum + parseAmount(g.target_amount), 0);
  const totalSaved = goals.reduce((sum, g) => sum + parseAmount(g.saved_amount), 0);
  const activeGoalsCount = goals.filter(goal => !goal.is_complete && !goal.is_paused).length;
  const userInitials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'A';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'savings', label: 'Savings Goals', icon: 'payments' },
    { id: 'activity', label: 'Activity', icon: 'history' },
    { id: 'expenses', label: 'Expense Tracker', icon: 'receipt_long' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    ...(user.is_admin ? [{ id: 'admin', label: 'Admin', icon: 'admin_panel_settings' }] : []),
  ];

  const mobileNavItems = [
    { id: 'dashboard', label: 'Home', icon: 'dashboard' },
    { id: 'savings', label: 'Goals', icon: 'payments' },
    { id: 'activity', label: 'Activity', icon: 'history' },
    { id: 'expenses', label: 'Spend', icon: 'receipt_long' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    ...(user.is_admin ? [{ id: 'admin', label: 'Admin', icon: 'admin_panel_settings' }] : []),
  ];

  const selectPage = (page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  };

  const renderDashboard = () => (
    <div className="space-y-10">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-sans text-xs font-bold uppercase tracking-widest text-gold">
            Analytics
          </p>
          <h2 className="mt-2 font-serif text-4xl font-bold text-primary-dark md:text-5xl">
            Dashboard
          </h2>
          <p className="mt-3 max-w-2xl font-sans text-base text-taupe">
            A focused view of savings allocation, goal health, and expense movement.
          </p>
        </div>
        <div className="rounded-lg border border-gold/30 bg-white/70 px-5 py-4 shadow-sm">
          <p className="font-sans text-xs font-bold uppercase tracking-widest text-taupe">
            Total Portfolio Target
          </p>
          <p className="font-money text-3xl font-bold text-primary-dark">
            {formatMoney(totalTarget, userCurrency, userCurrencySymbol)}
          </p>
        </div>
      </section>

      <BudgetSetup
        userId={user.user_id}
        currentBudget={monthlyBudget}
        isEarnerMode={isEarnerMode}
        onBudgetSet={handleBudgetSet}
        currencyCode={userCurrency}
        currencySymbol={userCurrencySymbol}
      />

      <Dashboard
        userId={user.user_id}
        monthlyBudget={monthlyBudget}
        isEarnerMode={isEarnerMode}
        goals={goals}
        currencyCode={userCurrency}
        currencySymbol={userCurrencySymbol}
        expenseRefresh={expenseRefresh}
        transactionRefresh={transactionRefresh}
        onViewAllActivity={() => openActivityPage('all')}
      />

    </div>
  );

  const goalsPagination = {
    page: goalsPage,
    limit: GOALS_PER_PAGE,
    total_count: goals.length,
    total_pages: Math.ceil(goals.length / GOALS_PER_PAGE) || 0,
    has_prev: goalsPage > 1,
    has_next: goalsPage < Math.ceil(goals.length / GOALS_PER_PAGE),
    from: goals.length === 0 ? 0 : (goalsPage - 1) * GOALS_PER_PAGE + 1,
    to: Math.min(goalsPage * GOALS_PER_PAGE, goals.length),
  };

  const paginatedGoals = goals.slice(
    (goalsPage - 1) * GOALS_PER_PAGE,
    goalsPage * GOALS_PER_PAGE
  );

  const renderSavingsGoals = () => (
    <div className="space-y-6">
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-sans text-xs font-bold uppercase tracking-widest text-gold">
              Savings Goals
            </p>
            <h2 className="mt-1 font-serif text-3xl font-bold text-primary-dark md:text-4xl">
              Objective Ledger
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-9 items-center divide-x divide-gray-200 rounded-lg border border-gray-200 bg-white">
              <div className="flex items-baseline gap-1.5 px-3">
                <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">
                  Saved
                </span>
                <span className="font-money text-sm font-semibold text-primary-dark">
                  {formatMoney(totalSaved, userCurrency, userCurrencySymbol)}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 px-3">
                <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-taupe">
                  Active
                </span>
                <span className="font-money text-sm font-semibold text-primary-dark">
                  {activeGoalsCount}
                </span>
              </div>
            </div>

            <CreateGoalForm
              userId={user.user_id}
              currencyCode={userCurrency}
              currencySymbol={userCurrencySymbol}
              variant="discrete"
              onGoalCreated={handleGoalCreated}
            />
          </div>
        </div>

        {goals.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-5 text-center shadow-sm">
            <p className="font-serif text-lg font-bold text-primary-dark">No goals yet</p>
            <p className="mt-1 font-sans text-sm text-taupe">
              Click <span className="font-semibold text-primary-dark">New Goal</span> to create your first objective.
            </p>
          </div>
        ) : (
          <>
            <div
              className={`flex flex-wrap items-start justify-center gap-4 md:gap-5 ${
                paginatedGoals.length === 1 ? 'py-2 sm:py-4' : ''
              }`}
            >
              {paginatedGoals.map(goal => (
                <GoalPortfolioCard
                  key={goal.goal_id}
                  goal={goal}
                  user={user}
                  setGoals={setGoals}
                  onGoalUpdated={handleGoalUpdated}
                  onGoalDeleted={handleGoalDeleted}
                  onTransactionRecorded={handleTransactionRecorded}
                />
              ))}
            </div>

            {goals.length > GOALS_PER_PAGE && (
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <Pagination
                  pagination={goalsPagination}
                  onPageChange={setGoalsPage}
                  onLimitChange={() => {}}
                  limitOptions={[GOALS_PER_PAGE]}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-8">
      <section>
        <p className="font-sans text-xs font-bold uppercase tracking-widest text-gold">
          Expense Tracker
        </p>
        <h2 className="mt-2 font-serif text-4xl font-bold text-primary-dark md:text-5xl">
          Capital Outflow
        </h2>
        <p className="mt-3 max-w-2xl font-sans text-base text-taupe">
          Monitor spending against your savings mandate with category-level visibility.
        </p>
      </section>

      <ExpenseSummary
        userId={user.user_id}
        monthlyBudget={monthlyBudget}
        isEarnerMode={isEarnerMode}
        currencyCode={userCurrency}
        currencySymbol={userCurrencySymbol}
        refreshTrigger={expenseRefresh}
        onExpenseAdded={() => setExpenseRefresh((prev) => prev + 1)}
      />
    </div>
  );

  const renderActivity = () => (
    <ActivityLedger
      userId={user.user_id}
      goals={goals}
      refreshKey={transactionRefresh}
      initialGoalFilter={activityGoalFilter}
      currencyCode={userCurrency}
      currencySymbol={userCurrencySymbol}
    />
  );

  const renderSettings = () => (
    <SettingsPage
      user={user}
      isEarnerMode={isEarnerMode}
      hasBudget={hasBudget}
      monthlyBudget={monthlyBudget}
      onUserUpdate={handleUserUpdate}
      onBudgetSet={handleBudgetSet}
      onEarnerModeChange={handleEarnerModeChange}
      onLogout={handleLogout}
      onThemeChange={applyTheme}
      onDensityChange={setUiDensity}
      onNavigate={selectPage}
      onGoalsChange={setGoals}
    />
  );

  return (
    <div className="min-h-screen bg-cream font-sans text-primary-dark">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-primary-dark text-cream shadow-2xl lg:flex">
        <div className="border-b border-cream/10 p-6">
          <p className="font-engraved text-3xl font-bold text-gold">QUANT</p>
          <div className="mt-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/50 bg-gold/10 font-serif text-xl font-bold text-gold">
              {userInitials}
            </div>
            <div>
              <p className="font-sans text-sm font-bold text-cream">
                {user.first_name} {user.last_name}
              </p>
              <p className="font-sans text-xs font-bold uppercase tracking-widest text-gold-light">
                Private Member
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-8">
          {navItems.map(item => {
            const active = currentPage === item.id;
            return (
              <button
                key={`${item.label}-${item.id}`}
                type="button"
                onClick={() => selectPage(item.id)}
                className={`flex w-full items-center gap-3 border-l-4 px-4 py-3 text-left font-sans text-sm font-bold transition-colors ${
                  active
                    ? 'border-gold text-gold'
                    : 'border-transparent text-cream/60 hover:text-gold'
                }`}
              >
                <Icon name={item.icon} className="text-xl" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-cream/10 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-gold px-4 py-3 font-sans text-xs font-bold uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-primary-dark"
          >
            <Icon name="logout" className="text-lg" />
            Sign Out
          </button>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-gold/20 bg-cream/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(open => !open)}
          className="rounded-lg p-2 text-primary-dark"
          aria-label="Toggle navigation"
        >
          <Icon name="menu" className="text-3xl" />
        </button>
        <h1 className="font-engraved text-3xl font-bold text-primary-dark">QUANT</h1>
        <div className="flex items-center gap-2">
          <Icon name="notifications" className="text-2xl text-primary-dark" />
          <Icon name="account_circle" className="text-3xl text-gold" />
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-x-4 top-20 z-50 rounded-lg bg-primary-dark p-4 shadow-2xl lg:hidden">
          {navItems.map(item => (
            <button
              key={`mobile-drawer-${item.label}`}
              type="button"
              onClick={() => selectPage(item.id)}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 font-sans text-sm font-bold text-cream/80 hover:text-gold"
            >
              <Icon name={item.icon} className="text-xl" />
              {item.label}
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-sans text-xs font-bold uppercase tracking-widest text-primary-dark"
          >
            <Icon name="logout" className="text-lg" />
            Sign Out
          </button>
        </div>
      )}

      {completedGoalName && (
        <div className="fixed right-6 top-6 z-50 max-w-sm rounded-lg border-l-4 border-gold bg-primary-dark p-6 text-cream shadow-xl">
          <p className="mb-1 font-serif text-xl font-bold text-gold">
            Goal Complete! 🎉
          </p>
          <p className="font-sans text-sm text-cream">
            {completedGoalName} has been fully funded. Your remaining goals have been recalibrated.
          </p>
        </div>
      )}

      <main className="px-4 pb-28 pt-24 lg:ml-64 lg:px-8 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-[1200px]">
          {currentPage === 'dashboard' && renderDashboard()}
          {currentPage === 'savings' && renderSavingsGoals()}
          {currentPage === 'activity' && renderActivity()}
          {currentPage === 'expenses' && renderExpenses()}
          {currentPage === 'settings' && renderSettings()}
          {currentPage === 'admin' && user.is_admin && <AdminPage />}
        </div>
      </main>

      <nav className={`fixed inset-x-0 bottom-0 z-50 grid ${user.is_admin ? 'grid-cols-6' : 'grid-cols-5'} border-t border-gold/20 bg-white/95 px-0.5 py-2 shadow-2xl backdrop-blur lg:hidden`}>
        {mobileNavItems.map(item => {
          const active = currentPage === item.id;
          return (
            <button
              key={`bottom-${item.label}`}
              type="button"
              onClick={() => selectPage(item.id)}
              className={`flex flex-col items-center gap-1 rounded-lg px-0.5 py-2 font-sans text-[10px] font-bold ${
                active ? 'text-gold' : 'text-taupe'
              }`}
            >
              <Icon name={item.icon} className="text-2xl" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
