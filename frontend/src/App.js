import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Routes, Route, Navigate, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import api from './services/api';
import BudgetSetup from './components/BudgetSetup';
import CreateGoalForm from './components/CreateGoalForm';
import Dashboard from './components/Dashboard';
import ActivityLedger from './components/ActivityLedger';
import Pagination from './components/Pagination';
import GoalActions from './components/GoalActions';
import ConfirmDialog from './components/ConfirmDialog';
import ExpenseSummary from './components/ExpenseSummary';
import SettingsPage from './components/SettingsPage';
import OnboardingPage from './pages/OnboardingPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import AnimatedOutlet, { ScreenTransition } from './components/AnimatedOutlet';
import { formatMoney } from './utils/currency';
import { getFriendlyError, isServerUnavailable } from './utils/friendlyError';
import ServerErrorPage from './components/ServerErrorPage';
import ErrorBanner from './components/ErrorBanner';
import OdometerNumber from './components/OdometerNumber';
import { PATHS, pathForPageId } from './utils/paths';

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
  const target = Math.min(100, Math.max(0, Number(value) || 0));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      setDisplay(target);
      return undefined;
    }

    let frameA;
    let frameB;
    frameA = requestAnimationFrame(() => {
      frameB = requestAnimationFrame(() => setDisplay(target));
    });

    return () => {
      cancelAnimationFrame(frameA);
      cancelAnimationFrame(frameB);
    };
  }, [target]);

  const offset = circumference - (display / 100) * circumference;

  return (
    <div className="relative shrink-0 self-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
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
          className="progress-ring-fg"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-money text-base font-light tracking-[0.02em] text-primary-dark">
          {Math.round(target)}%
        </span>
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
  const editPanelRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
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
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [statusAlert, setStatusAlert] = useState(null);
  const [selectedFrequency, setSelectedFrequency] = useState('Monthly');

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
      if (!inStatus) {
        setOpenPopover(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openPopover]);

  useEffect(() => {
    if (!isEditing) return undefined;

    const handleClickOutside = (event) => {
      if (editPanelRef.current && !editPanelRef.current.contains(event.target)) {
        goalActionsRef.current?.cancelEdit();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        goalActionsRef.current?.cancelEdit();
      }
    };

    // Defer so the same tap/click that opened edit doesn't immediately close it
    const timeoutId = window.setTimeout(() => {
      document.addEventListener('pointerdown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing]);

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

      const updatedGoal = response.data.updated_goal;

      // Close the modal first so the goal card is visible when digits roll
      closeTransactionModal();

      window.requestAnimationFrame(() => {
        setGoals((goals) =>
          goals.map((g) =>
            Number(g.goal_id) === Number(updatedGoal.goal_id) ? updatedGoal : g
          )
        );
        onTransactionRecorded?.(response.data);
      });
    } catch (err) {
      setTxError(getFriendlyError(err, 'We couldn’t record that transaction. Please try again.'));
    } finally {
      setTxLoading(false);
    }
  };

  const handleMenuAction = (action) => {
    closeMenu();

    if (action === 'edit') {
      setIsEditing(true);
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
      requestPauseToggle();
    }
  };

  const requestPauseToggle = () => {
    setPauseConfirmOpen(true);
  };

  const handlePauseToggle = async () => {
    const nextPaused = !isPaused;
    setPauseLoading(true);

    try {
      const response = await api.patch(`/goals/${goal.goal_id}/pause`, {
        is_paused: nextPaused,
      });
      // Close confirm first so remaining goal cards are visible while amounts roll
      setPauseConfirmOpen(false);
      window.requestAnimationFrame(() => {
        setGoals(response.data.goals);
      });
    } catch (err) {
      setPauseConfirmOpen(false);
      setStatusAlert(getFriendlyError(err, 'We couldn’t update that goal. Please try again.'));
    } finally {
      setPauseLoading(false);
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

  const frequencyCells = [
    ['Daily', goal.savings_needed?.daily],
    ['Weekly', goal.savings_needed?.weekly],
    ['Monthly', goal.savings_needed?.monthly],
    ['Yearly', goal.savings_needed?.annual],
  ];
  const selectedFrequencyAmount = frequencyCells.find(
    ([label]) => label === selectedFrequency
  )?.[1];

  return (
    <article
      className={`ledger-card ${isComplete || isOnHold ? 'opacity-70 grayscale-[30%]' : ''}`}
    >
      {isComplete && (
        <div
          className="pointer-events-none absolute right-3 top-3 z-10 rotate-[-12deg] rounded-lg border-4 border-gold bg-primary-dark/80 px-2.5 py-1 opacity-90"
          title="Completed — use the menu to edit or correct transactions"
        >
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
            Complete ✓
          </p>
        </div>
      )}
      {isOnHold && (
        <div
          className="pointer-events-none absolute right-3 top-3 z-10 rotate-[-12deg] rounded-lg border-4 border-taupe/40 bg-primary-dark/80 px-2.5 py-1 opacity-90"
          title="On hold — resume from the menu to include in budget allocation again"
        >
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-cream">
            On Hold
          </p>
        </div>
      )}

      <div className="rounded-t-[0.75rem] bg-navy-sheen px-4 py-3.5 text-cream">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-cream/60">
              Private Objective
            </p>
            <h3 className={`mt-1 truncate font-serif text-xl font-light leading-snug tracking-[-0.02em] ${isComplete || isOnHold ? 'pr-24' : ''}`}>
              {goal.name}
            </h3>
            {isComplete && goal.completed_at && (
              <p className="mt-0.5 font-sans text-xs text-cream/70">
                Completed {new Date(goal.completed_at).toLocaleDateString()}
              </p>
            )}
            {isOnHold && goal.paused_at && (
              <p className="mt-0.5 font-sans text-xs text-cream/70">
                On hold since {new Date(goal.paused_at).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="relative z-30 flex shrink-0 items-start gap-1.5">
            {!isComplete && !isPaused && (
              <div className="group/status relative" ref={statusPopoverRef}>
                {showWarningIcon ? (
                  <button
                    type="button"
                    onClick={toggleStatusPopover}
                    aria-label={statusTooltipText}
                    className="flex h-8 w-8 items-center justify-center"
                  >
                    <span className="animate-pulse cursor-pointer font-serif text-2xl font-light tracking-[-0.02em] text-orange-400">!</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={toggleStatusPopover}
                    aria-label={statusTooltipText}
                    className="flex h-8 w-8 items-center justify-center font-serif text-xl font-light tracking-[-0.015em] text-gold transition-colors hover:text-gold-light"
                  >
                    ✓
                  </button>
                )}

                {openPopover !== 'status' && (
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute right-0 top-full z-[60] mt-2 hidden w-max max-w-[220px] rounded-lg bg-primary-dark px-3 py-2 shadow-lift group-hover/status:block"
                  >
                    <div className="absolute -top-1 right-3 h-2.5 w-2.5 rotate-45 bg-primary-dark" />
                    <p className="relative whitespace-normal break-words font-sans text-xs leading-relaxed text-cream">
                      {statusTooltipText}
                    </p>
                  </div>
                )}

                {openPopover === 'status' && (
                  <div
                    className={`absolute right-0 top-full z-[60] mt-2 w-[220px] rounded-lg p-4 shadow-lift ${
                      showWarningIcon
                        ? 'bg-primary-dark text-cream'
                        : 'border border-gold bg-primary-dark text-cream'
                    }`}
                  >
                    <div
                      className={`absolute -top-1.5 right-3 h-3 w-3 rotate-45 ${
                        showWarningIcon ? 'bg-primary-dark' : 'border-l border-t border-gold bg-primary-dark'
                      }`}
                    />
                    {isBehindSchedule || !goal.on_track ? (
                      <>
                        <p className="font-sans text-xs font-normal">
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
                        <p className="font-sans text-xs font-normal">
                          ✓ You&apos;re {money(surplusDeficit)} ahead.
                        </p>
                        <p className="mt-1 font-sans text-xs text-cream/80">
                          You can skip saving for {parseAmount(goal.days_can_skip).toFixed(1)} days.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="relative font-sans text-xs font-normal">✓ You&apos;re on track.</p>
                        {isEarnerMode && goal.is_feasible && (
                          <p className="relative mt-1 font-sans text-xs text-cream/80">
                            Current funding covers this goal&apos;s monthly need.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="relative shrink-0" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-label="Goal actions"
                  className="p-1 text-cream/80 transition-colors hover:bg-cream/10 hover:text-cream"
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

      <div className={`flex flex-1 flex-col gap-3 p-4 ${!isComplete && !isPaused ? '' : 'rounded-b-lg'}`}>
        <div className="flex items-center gap-2.5">
          <CircularProgress value={isComplete ? 100 : completion} />

          <div className="min-w-0 flex-1">
            <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
              Goal Status
            </p>
            <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1">
              <div>
                <p className="font-sans text-xs font-normal uppercase tracking-[0.08em] text-taupe">
                  Target
                </p>
                <p className="font-money text-sm font-light leading-tight text-primary-dark">
                  {money(goal.target_amount)}
                </p>
              </div>
              <div>
                <p className="font-sans text-xs font-normal uppercase tracking-[0.08em] text-taupe">
                  Saved
                </p>
                <p className="font-money text-sm font-light leading-tight text-primary-dark">
                  <OdometerNumber
                    value={goal.saved_amount}
                    prefix={user.currency_symbol || '$'}
                  />
                </p>
              </div>
              <div>
                <p className="font-sans text-xs font-normal uppercase tracking-[0.08em] text-taupe">
                  Remaining
                </p>
                <p className="font-money text-sm font-light leading-tight text-primary-dark">
                  <OdometerNumber
                    value={goal.remaining_amount}
                    prefix={user.currency_symbol || '$'}
                  />
                </p>
              </div>
              <div>
                <p className="font-sans text-xs font-normal uppercase tracking-[0.08em] text-taupe">
                  Days Left
                </p>
                <p className="font-money text-sm font-light leading-tight text-primary-dark">
                  {goal.days_remaining}
                </p>
              </div>
            </div>
          </div>
        </div>

        {!isComplete && !isPaused && (
          <div className="border-t border-cream/80 pt-2">
            <div className="border border-cream bg-cream/30 p-2">
              <div className="flex items-center justify-between gap-3">
                <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                  {selectedFrequency} Savings Needed
                </p>
                <p className="font-money text-sm font-light text-primary-dark">
                  <OdometerNumber
                    value={parseAmount(selectedFrequencyAmount)}
                    prefix={user.currency_symbol || '$'}
                  />
                </p>
              </div>

              <div
                className="mt-2 grid grid-cols-4 gap-px border border-cream bg-cream"
                role="group"
                aria-label="Savings frequency"
              >
                {frequencyCells.map(([label]) => {
                  const isSelected = selectedFrequency === label;

                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedFrequency(label)}
                      className={`px-1.5 py-1.5 font-sans text-xs font-normal uppercase tracking-[0.08em] transition-colors ${
                        isSelected
                          ? 'bg-primary-dark text-cream'
                          : 'bg-white text-taupe hover:bg-cream/70 hover:text-primary-dark'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div ref={editPanelRef}>
          <GoalActions
            ref={goalActionsRef}
            goal={goal}
            currencySymbol={user.currency_symbol || '$'}
            onGoalUpdated={(updatedGoals) => {
              onGoalUpdated(updatedGoals);
              setIsEditing(false);
            }}
            onGoalDeleted={onGoalDeleted}
            hideActionButtons
            isEditing={isEditing}
            onEditingChange={(value) => {
              const next = typeof value === 'function' ? value(isEditing) : value;
              setIsEditing(next);
            }}
          />
        </div>

      </div>

      {!isComplete && !isPaused && (
        <div className="mt-auto rounded-b-[0.75rem] bg-navy-sheen px-4 py-3.5 text-cream">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {isEarnerMode ? (
                <>
                  <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-cream/60">
                    Monthly Allocation
                  </p>
                  <p className="mt-0.5 font-money text-lg font-light leading-tight tracking-[0.02em]">
                    <OdometerNumber
                      value={allocated}
                      prefix={user.currency_symbol || '$'}
                    />
                  </p>
                  <p className="mt-0.5 font-sans text-xs text-cream/60">
                    {goal.is_feasible
                      ? 'Achievable with current funding'
                      : (
                        <>
                          Shortfall:{' '}
                          <OdometerNumber
                            value={shortfall}
                            prefix={user.currency_symbol || '$'}
                            className="inline-flex"
                          />
                          /month
                        </>
                      )}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-cream/60">
                    Pace Check
                  </p>
                  <p className="mt-0.5 font-serif text-lg font-light leading-tight tracking-[-0.02em]">
                    {isBehindSchedule || !goal.on_track
                      ? 'Needs attention'
                      : isAhead
                        ? 'Ahead of pace'
                        : 'On track'}
                  </p>
                  <p className="mt-0.5 font-sans text-xs text-cream/60">
                    {isBehindSchedule || !goal.on_track
                      ? (
                        <>
                          Save an extra{' '}
                          <OdometerNumber
                            value={parseAmount(goal.extra_per_day_to_catch_up)}
                            prefix={user.currency_symbol || '$'}
                            className="inline-flex"
                          />
                          /day to catch up
                        </>
                      )
                      : isAhead
                        ? `You can skip saving for ${parseAmount(goal.days_can_skip).toFixed(1)} days`
                        : 'Keep your current saving rhythm'}
                  </p>
                </>
              )}
            </div>

            <div className="relative shrink-0" ref={infoRef}>
              <button
                type="button"
                onClick={fetchSuggestions}
                aria-label="View improvement suggestions"
                className="p-1 text-cream/80 transition-colors hover:bg-cream/10 hover:text-cream"
              >
                <Icon name="info" className="text-lg" />
              </button>

              {suggestionsOpen && (
                <div className="absolute bottom-full right-0 z-[60] mb-2 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
                  <p className="mb-2 font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
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
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-transaction-title"
            className="modal-shell"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
                    Goal Ledger
                  </p>
                  <h2 id="record-transaction-title" className="mt-0.5 font-serif text-xl font-light leading-tight">
                    Record Transaction
                  </h2>
                  <p className="mt-0.5 font-sans text-xs text-cream/60">{goal.name}</p>
                </div>
                <button
                  type="button"
                  onClick={closeTransactionModal}
                  aria-label="Close"
                  className="p-1 text-cream/80 transition-colors hover:bg-cream/10 hover:text-cream"
                >
                  <Icon name="close" className="text-lg" />
                </button>
              </div>
            </div>

            <form onSubmit={handleTransactionSubmit} className="space-y-3.5 px-5 py-5">
              <div className="grid grid-cols-2 gap-0.5 rounded-lg border border-primary-dark/10 bg-ivory p-0.5">
                <button
                  type="button"
                  onClick={() => setTxType('deposit')}
                  className={`rounded-md px-3 py-2 font-sans text-xs font-normal uppercase tracking-[0.12em] transition-colors ${
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
                  className={`rounded-md px-3 py-2 font-sans text-xs font-normal uppercase tracking-[0.12em] transition-colors ${
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
                  className="field-label"
                >
                  Amount
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-money text-lg font-light tracking-[0.02em] text-primary-dark">{user.currency_symbol || '$'}</span>
                  <input
                    id={`tx-amount-${goal.goal_id}`}
                    type="number"
                    value={txAmount}
                    onChange={(event) => setTxAmount(event.target.value)}
                    placeholder="100.00"
                    step="0.01"
                    min="0"
                    autoFocus
                    className="field font-money"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={`tx-note-${goal.goal_id}`}
                  className="mb-1.5 block font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe"
                >
                  Note <span className="font-normal normal-case tracking-normal text-taupe">(optional)</span>
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

              {txError && <ErrorBanner message={txError} />}

              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-3.5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeTransactionModal}
                  disabled={txLoading}
                  className="rounded-md border border-gray-200 px-4 py-2 font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={txLoading}
                  className="rounded-md bg-gold px-4 py-2 font-sans text-xs font-normal uppercase tracking-[0.12em] text-primary-dark transition-colors hover:bg-gold-light disabled:opacity-50"
                >
                  {txLoading ? 'Recording...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        open={pauseConfirmOpen}
        title={isPaused ? `Resume "${goal.name}"?` : `Put "${goal.name}" on hold?`}
        message={
          isPaused
            ? 'Your budget will be recalculated across active goals.'
            : 'It will be removed from budget allocation until you resume it.'
        }
        confirmLabel={isPaused ? 'Resume Goal' : 'Put on Hold'}
        tone="warning"
        loading={pauseLoading}
        onConfirm={handlePauseToggle}
        onCancel={() => {
          if (!pauseLoading) setPauseConfirmOpen(false);
        }}
      />

      <ConfirmDialog
        open={Boolean(statusAlert)}
        title="Something went wrong"
        message={statusAlert || ''}
        confirmLabel="OK"
        hideCancel
        tone="danger"
        onConfirm={() => setStatusAlert(null)}
        onCancel={() => setStatusAlert(null)}
      />
    </article>
  );
}

function App() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activityGoalFilter = searchParams.get('goal') || 'all';

  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthlyBudget, setMonthlyBudget] = useState(null);
  const [expenseRefresh, setExpenseRefresh] = useState(0);
  const [transactionRefresh, setTransactionRefresh] = useState(0);
  const [goalsPage, setGoalsPage] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('quant_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [completedGoalName, setCompletedGoalName] = useState(null);
  const [isEarnerMode, setIsEarnerMode] = useState(false);

  const userCurrency = user?.currency || 'USD';
  const userCurrencySymbol = user?.currency_symbol || '$';

  const applyDensity = (density) => {
    document.documentElement.classList.toggle('density-compact', density === 'compact');
  };

  const handleUserUpdate = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    applyDensity(updatedUser.ui_density || 'classic');
  };

  const handleTransactionRecorded = (responseData) => {
    setTransactionRefresh((prev) => prev + 1);

    if (responseData?.goal_completed) {
      setCompletedGoalName(responseData.completed_goal_name);
      // Let allocation odometers on remaining goals roll after the modal is gone
      window.setTimeout(() => {
        fetchData();
      }, 80);
      setTimeout(() => setCompletedGoalName(null), 5000);
    }
  };

  const openActivityPage = (goalId = 'all') => {
    const search = goalId && goalId !== 'all' ? `?goal=${encodeURIComponent(goalId)}` : '';
    navigate(`${PATHS.activity}${search}`);
  };

  const selectPage = (page) => {
    navigate(pathForPageId(page));
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('quant_sidebar_collapsed', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const normalizeAmount = (value) => {
    const amount = parseFloat(value);
    return Number.isFinite(amount) ? amount : null;
  };

  const fetchData = useCallback(async () => {
    if (!user?.user_id) return;

    try {
      const goalsResponse = await api.get(
        `/goals?userId=${user.user_id}`
      );
      setGoals(goalsResponse.data.goals);
      setMonthlyBudget(normalizeAmount(goalsResponse.data.monthly_budget));
      setIsEarnerMode(goalsResponse.data.mode === 'earner');
      setLoading(false);
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    document.documentElement.classList.remove('theme-midnight');

    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      applyDensity(parsedUser.ui_density || 'classic');
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
  }, [user, fetchData]);

  const handleOnboardingComplete = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    setIsEarnerMode(updatedUser.mode === 'earner' || updatedUser.is_earner);
    applyDensity(updatedUser.ui_density || 'classic');
    setLoading(true);
    navigate(PATHS.dashboard, { replace: true });
  };

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(goals.length / GOALS_PER_PAGE));
    if (goalsPage > totalPages) {
      setGoalsPage(totalPages);
    }
  }, [goals.length, goalsPage]);

  const handleLogin = (userData) => {
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
    navigate(PATHS.login, { replace: true });
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
    // Refresh after create so sibling goal allocations can odometer to new shares
    window.requestAnimationFrame(() => {
      fetchData();
      setGoalsPage(1);
    });
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
    return (
      <Routes>
        <Route path={PATHS.register} element={
          <ScreenTransition screenKey="register"><RegisterPage onRegister={handleLogin} /></ScreenTransition>
        } />
        <Route path={PATHS.login} element={
          <ScreenTransition screenKey="login"><LoginPage onLogin={handleLogin} /></ScreenTransition>
        } />
        <Route path="*" element={<Navigate to={PATHS.login} replace />} />
      </Routes>
    );
  }

  if (user.onboarding_complete === false) {
    return (
      <Routes>
        <Route path={PATHS.onboarding} element={
          <ScreenTransition screenKey="onboarding">
            <OnboardingPage user={user} onComplete={handleOnboardingComplete} />
          </ScreenTransition>
        } />
        <Route path="*" element={<Navigate to={PATHS.onboarding} replace />} />
      </Routes>
    );
  }

  if (loading) {
    return (
      <div className="page-canvas flex min-h-screen items-center justify-center">
        <div className="relative z-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
          <p className="mt-5 font-sans text-xs font-normal uppercase tracking-[0.12em] text-primary-dark">
            Preparing your private ledger
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    const friendly = getFriendlyError(
      error,
      'We couldn’t load your ledger right now. Please try again.'
    );

    return (
      <ServerErrorPage
        title={isServerUnavailable(error) ? 'A quiet pause in the ledger' : 'Unable to load your ledger'}
        message={friendly}
        onRetry={() => {
          setError(null);
          setLoading(true);
          fetchData();
        }}
        onSecondary={handleLogout}
        secondaryLabel="Sign out"
      />
    );
  }

  const totalTarget = goals.reduce((sum, g) => sum + parseAmount(g.target_amount), 0);
  const totalSaved = goals.reduce((sum, g) => sum + parseAmount(g.saved_amount), 0);
  const activeGoalsCount = goals.filter(goal => !goal.is_complete && !goal.is_paused).length;
  const userInitials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'A';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'savings', label: 'Savings Goals', icon: 'payments' },
    { id: 'expenses', label: 'Expense Tracker', icon: 'receipt_long' },
    { id: 'activity', label: 'Activity', icon: 'history' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    ...(user.is_admin ? [{ id: 'admin', label: 'Admin', icon: 'admin_panel_settings' }] : []),
  ];

  const mobileNavItems = [
    { id: 'dashboard', label: 'Home', icon: 'dashboard' },
    { id: 'savings', label: 'Goals', icon: 'payments' },
    { id: 'expenses', label: 'Spend', icon: 'receipt_long' },
    { id: 'activity', label: 'Activity', icon: 'history' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    ...(user.is_admin ? [{ id: 'admin', label: 'Admin', icon: 'admin_panel_settings' }] : []),
  ];

  const renderDashboard = () => (
    <div className="space-y-10">
      <section className="flex min-w-0 flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Analytics</p>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-lede">
            A focused view of savings allocation, goal health, and expense movement.
          </p>
        </div>
        <div className="surface min-w-0 px-5 py-4">
          <p className="field-label mb-0">Total Portfolio Target</p>
          <p className="mt-1 break-words font-money text-2xl font-light tracking-[0.02em] text-primary-dark sm:text-3xl">
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
      <section className="space-y-6">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Savings Goals</p>
            <h2 className="page-title">Objective Ledger</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="surface flex h-10 items-center divide-x divide-primary-dark/10">
              <div className="flex items-baseline gap-1.5 px-3.5">
                <span className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-taupe">
                  Saved
                </span>
                <span className="font-money text-sm font-light text-primary-dark">
                  <OdometerNumber
                    value={totalSaved}
                    prefix={userCurrencySymbol}
                  />
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 px-3.5">
                <span className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                  Active
                </span>
                <span className="font-money text-sm font-light text-primary-dark">
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
          <div className="surface px-5 py-8 text-center">
            <p className="font-serif text-xl font-light text-primary-dark">No goals yet</p>
            <p className="mt-1 font-sans text-sm text-taupe">
              Click <span className="font-normal text-primary-dark">New Goal</span> to create your first objective.
            </p>
          </div>
        ) : (
          <>
            <div
              className={`grid grid-cols-1 items-start gap-12 md:grid-cols-2 lg:gap-14 xl:grid-cols-3 ${
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
        <p className="eyebrow">Expense Tracker</p>
        <h2 className="page-title">Capital Outflow</h2>
        <p className="page-lede">
          A running ledger of what you&apos;ve spent — log expenses and see your totals by category.
        </p>
      </section>

      <ExpenseSummary
        userId={user.user_id}
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
      onDensityChange={applyDensity}
      onNavigate={selectPage}
      onGoalsChange={setGoals}
    />
  );

  return (
    <div className="page-canvas font-sans">
      <aside className={`nav-rail ${sidebarCollapsed ? 'nav-rail-collapsed' : ''}`}>
        <div className={`relative z-10 border-b border-cream/10 ${sidebarCollapsed ? 'px-2 pb-4 pt-5' : 'px-6 pb-6 pt-7'}`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
            {!sidebarCollapsed && (
              <p className="font-engraved text-[1.55rem] text-gold">QUANT</p>
            )}
            <button
              type="button"
              onClick={toggleSidebar}
              className="rounded-lg p-1.5 text-cream/55 transition-colors hover:bg-cream/10 hover:text-gold"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand' : 'Collapse'}
            >
              <Icon
                name={sidebarCollapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
                className="text-xl"
              />
            </button>
          </div>

          <div className={`mt-6 flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3.5'}`}>
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gold/35 bg-gold/10 font-serif text-lg font-light text-gold"
              title={`${user.first_name} ${user.last_name}`}
            >
              {userInitials}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate font-sans text-sm font-normal text-cream">
                  {user.first_name} {user.last_name}
                </p>
                <p className="mt-0.5 font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold/80">
                  Private Member
                </p>
              </div>
            )}
          </div>
        </div>

        <nav className={`relative z-10 flex-1 space-y-1 py-6 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map(item => (
            <NavLink
              key={`${item.label}-${item.id}`}
              to={pathForPageId(item.id)}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : 'nav-item-idle'}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon name={item.icon} className="text-xl opacity-90" />
              {!sidebarCollapsed && item.label}
            </NavLink>
          ))}
        </nav>

        <div className={`relative z-10 border-t border-cream/10 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
          <button
            onClick={handleLogout}
            className={sidebarCollapsed
              ? 'flex w-full items-center justify-center rounded-lg border border-gold/50 p-2.5 text-gold transition-colors hover:bg-gold hover:text-primary-dark'
              : 'btn-outline-gold w-full'}
            title="Sign Out"
          >
            <Icon name="logout" className="text-lg" />
            {!sidebarCollapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-primary-dark/10 bg-cream/80 px-4 backdrop-blur-md lg:hidden">
        <h1 className="font-engraved text-2xl font-normal tracking-[0.12em] text-primary-dark">QUANT</h1>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 font-serif text-sm font-medium text-gold">
          {userInitials}
        </div>
      </header>

      {completedGoalName && (
        <div className="fixed right-5 top-5 z-50 max-w-sm rounded-card border border-gold/30 bg-navy-sheen p-5 text-cream shadow-lift">
          <p className="mb-1 font-serif text-xl font-light text-gold">
            Goal Complete
          </p>
          <p className="font-sans text-sm leading-relaxed text-cream/80">
            {completedGoalName} has been fully funded. Your remaining goals have been recalibrated.
          </p>
        </div>
      )}

      <main
        className={`relative z-10 min-w-0 px-4 pb-32 pt-20 transition-[margin] duration-300 ease-out-expo sm:px-5 lg:px-10 lg:pb-14 lg:pt-10 ${
          sidebarCollapsed ? 'lg:ml-[4.75rem]' : 'lg:ml-[17.5rem]'
        }`}
      >
        <Routes>
          <Route
            element={
              <div className="mx-auto w-full min-w-0 max-w-[1180px]">
                <AnimatedOutlet />
              </div>
            }
          >
            <Route path={PATHS.dashboard} element={renderDashboard()} />
            <Route path={PATHS.savings} element={renderSavingsGoals()} />
            <Route path={PATHS.activity} element={renderActivity()} />
            <Route path={PATHS.expenses} element={renderExpenses()} />
            <Route path={PATHS.settings} element={renderSettings()} />
            {user.is_admin ? <Route path={PATHS.admin} element={<AdminPage />} /> : null}
            <Route path="/" element={<Navigate to={PATHS.dashboard} replace />} />
            <Route path="*" element={<Navigate to={PATHS.dashboard} replace />} />
          </Route>
        </Routes>
      </main>

      <nav className={`fixed inset-x-0 bottom-0 z-50 grid ${user.is_admin ? 'grid-cols-6' : 'grid-cols-5'} border-t border-primary-dark/10 bg-ivory/90 px-1 py-2 shadow-lift backdrop-blur-md lg:hidden`}>
        {mobileNavItems.map(item => (
          <NavLink
            key={`bottom-${item.label}`}
            to={pathForPageId(item.id)}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-lg px-0.5 py-2 font-sans text-xs font-medium tracking-wide transition-colors ${
                isActive ? 'text-gold' : 'text-taupe'
              }`
            }
          >
            <Icon name={item.icon} className="text-xl" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default App;
