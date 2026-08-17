import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { Routes, Route, Navigate, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import api from './services/api';
import BudgetSetup from './components/BudgetSetup';
import CreateGoalForm from './components/CreateGoalForm';
import Dashboard from './components/Dashboard';
import ActivityLedger from './components/ActivityLedger';
import Pagination from './components/Pagination';
import GoalActions from './components/GoalActions';
import ConfirmDialog from './components/ConfirmDialog';
import HoldGoalDialog from './components/HoldGoalDialog';
import ExpenseSummary from './components/ExpenseSummary';
import SettingsPage from './components/SettingsPage';
import OnboardingPage from './pages/OnboardingPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import AnimatedOutlet, { ScreenTransition } from './components/AnimatedOutlet';
import { formatMoney } from './utils/currency';
import { getFriendlyError, isServerUnavailable } from './utils/friendlyError';
import ServerErrorPage from './components/ServerErrorPage';
import ErrorBanner from './components/ErrorBanner';
import OdometerNumber from './components/OdometerNumber';
import { PATHS, pathForPageId } from './utils/paths';
import { canMoveGoal, folioIndexInGroup, goalStatusRank, insertGoalAt, moveGoalInGroup, toRoman } from './utils/goalPriority';

const GOALS_PER_PAGE = 12;
const REORDER_HOLD_MS = 300;
const REORDER_MOUSE_MOVE_PX = 7;
const REORDER_TOUCH_CANCEL_PX = 12;
const REORDER_IGNORE_SELECTOR =
  'button, a, input, select, textarea, label, [role="switch"], [role="dialog"], [data-no-reorder]';

const goalIdFromPoint = (x, y) => {
  const node = document.elementFromPoint(x, y);
  const card = node instanceof Element ? node.closest('[data-goal-id]') : null;
  const id = Number.parseInt(card?.dataset?.goalId, 10);
  return Number.isInteger(id) ? id : null;
};

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

/** Deposit (green) / withdrawal (coral) transfer mark for navy footers. */
const TransactionIcon = ({ className = 'h-5 w-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M4 8.5h12.5M13 5.5l3.5 3-3.5 3"
      stroke="#6BBF8A"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20 15.5H7.5M11 12.5l-3.5 3 3.5 3"
      stroke="#E08A7A"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const parseAmount = (value) => {
  const amount = parseFloat(value);
  return Number.isFinite(amount) ? amount : 0;
};

const CircularProgress = ({ value, size = 96, strokeWidth = 7, caption = 'Complete' }) => {
  const gradientId = `goal-ring-${useId().replace(/:/g, '')}`;
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
        <defs>
          <linearGradient
            id={gradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor="#0A0F1A" />
            <stop offset="32%" stopColor="#1A2438" />
            <stop offset="58%" stopColor="#25375A" />
            <stop offset="82%" stopColor="#D4B16D" />
            <stop offset="100%" stopColor="#F8F4EC" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(10, 15, 26, 0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="progress-ring-fg"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
        <span className="font-money text-lg font-light leading-none tracking-[0.02em] text-primary-dark">
          {Math.round(target)}%
        </span>
        {caption ? (
          <span className="mt-1 font-sans text-[10px] font-normal uppercase tracking-[0.1em] text-taupe">
            {caption}
          </span>
        ) : null}
      </div>
    </div>
  );
};

function GoalPortfolioCard({
  goal,
  user,
  setGoals,
  folioRoman,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  isDragging = false,
  isDropTarget = false,
  onGoalUpdated,
  onGoalDeleted,
  onTransactionRecorded,
}) {
  const goalActionsRef = useRef(null);
  const menuRef = useRef(null);
  const infoRef = useRef(null);
  const editPanelRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [goalSuggestions, setGoalSuggestions] = useState(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
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
  const allocated = parseAmount(goal.allocated_monthly_amount);
  const surplusDeficit = parseAmount(goal.surplus_deficit);
  const isComplete = goal.is_complete === true;
  const isPaused = goal.is_paused === true;
  const isOnHold = isPaused && !isComplete;
  const isEarnerMode = goal.mode !== 'non-earner';
  const money = (value) => formatMoney(value, user.currency || 'USD', user.currency_symbol || '$');
  const isExactlyOnTrack = surplusDeficit === 0;
  const isAhead = goal.is_surplus && surplusDeficit > 0;
  const isBehindSchedule = !isExactlyOnTrack && !isAhead;

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

    if (action === 'move_up') {
      onMoveUp?.();
      return;
    }

    if (action === 'move_down') {
      onMoveDown?.();
      return;
    }

    if (action === 'delete') {
      goalActionsRef.current?.deleteGoal();
    }
  };

  const openTransactionModal = () => {
    resetTransactionForm();
    setShowTransactionModal(true);
  };

  const requestPauseToggle = () => {
    setPauseConfirmOpen(true);
  };

  const handlePauseToggle = async ({ pausedAt } = {}) => {
    const nextPaused = !isPaused;
    setPauseLoading(true);

    try {
      const payload = { is_paused: nextPaused };
      if (nextPaused && pausedAt) {
        payload.paused_at = pausedAt;
      }

      const response = await api.patch(`/goals/${goal.goal_id}/pause`, payload);
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

  const canReorder = Boolean(canMoveUp || canMoveDown);
  const menuItems = [
    { id: 'edit', label: 'Edit', icon: 'edit' },
    ...(canReorder
      ? [
          { id: 'move_up', label: 'Move up', icon: 'arrow_upward', disabled: !canMoveUp },
          { id: 'move_down', label: 'Move down', icon: 'arrow_downward', disabled: !canMoveDown },
        ]
      : []),
    { id: 'delete', label: 'Delete', icon: 'delete', danger: true },
  ];

  const frequencyCells = [
    ['Daily', goal.savings_needed?.daily],
    ['Weekly', goal.savings_needed?.weekly],
    ['Monthly', goal.savings_needed?.monthly],
    ['Yearly', goal.savings_needed?.annual],
  ];
  const selectedFrequencyAmount = frequencyCells.find(
    ([label]) => label === selectedFrequency
  )?.[1];
  const budgetShare = parseAmount(goal.allocation_percentage);
  const deadlineLabel = goal.deadline
    ? new Date(goal.deadline).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;
  const headerMeta = (() => {
    if (isComplete && goal.completed_at) {
      return `Completed ${new Date(goal.completed_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    }
    if (isOnHold) {
      return `On hold since ${
        goal.paused_at
          ? new Date(goal.paused_at).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
            })
          : '—'
      }`;
    }
    if (deadlineLabel) {
      return `Target by ${deadlineLabel}`;
    }
    return '\u00A0';
  })();

  return (
    <article
      data-goal-id={goal.goal_id}
      aria-grabbed={isDragging || undefined}
      className={`ledger-card ${isComplete || isOnHold ? 'opacity-70 grayscale-[30%]' : ''} ${
        canReorder ? 'is-reorderable' : ''
      } ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
    >
      {isComplete && (
        <div
          className="pointer-events-none absolute right-3 top-3 z-10 rotate-[-12deg] rounded-lg border-4 border-gold bg-primary-dark/80 px-2.5 py-1 opacity-90"
          title="Completed — use Edit in the menu to correct transactions"
        >
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
            Complete ✓
          </p>
        </div>
      )}

      <div
        data-reorder-handle={canReorder ? true : undefined}
        className="ledger-card-band ledger-card-handle shrink-0 px-4 py-3 text-cream"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 pt-0.5">
            {folioRoman ? (
              <p className="font-sans text-[10px] font-normal uppercase tracking-[0.16em] text-gold">
                <span className="sr-only">Priority </span>
                {folioRoman}
              </p>
            ) : null}
            <h3
              className={`truncate font-serif text-[1.35rem] font-light leading-none tracking-[-0.02em] ${
                folioRoman ? 'mt-1.5' : ''
              } ${isComplete ? 'pr-24' : ''}`}
              title={goal.name}
            >
              {goal.name}
            </h3>
            <p
              className={`mt-2 truncate font-sans text-xs font-light leading-snug ${
                isOnHold ? 'text-gold' : 'text-cream/55'
              }`}
            >
              {headerMeta}
            </p>
          </div>

          <div
            data-no-reorder
            className="relative z-30 flex shrink-0 flex-col items-end gap-1.5"
          >
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="Goal actions"
                className="p-1 text-cream/80 transition-colors hover:bg-cream/10 hover:text-cream"
              >
                <Icon name="more_horiz" className="text-lg" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  {menuItems.map(({ id, label, icon, danger, disabled }) => (
                    <button
                      key={id}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleMenuAction(id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left font-sans text-sm transition-colors ${
                        disabled
                          ? 'cursor-not-allowed text-primary-dark/40'
                          : danger
                            ? 'text-red-700 hover:bg-red-50'
                            : 'text-primary-dark hover:bg-cream/50'
                      }`}
                    >
                      <Icon name={icon} className="text-base" />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!isComplete && (
              <button
                type="button"
                role="switch"
                aria-checked={isPaused}
                aria-label={isPaused ? 'Resume goal' : 'Put goal on hold'}
                title={isPaused ? 'On hold — click to resume' : 'Put on hold'}
                disabled={pauseLoading}
                onClick={requestPauseToggle}
                className={`relative h-5 w-9 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-wait disabled:opacity-50 ${
                  isPaused ? 'bg-gold' : 'bg-cream/25'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-[left] duration-200 ease-out ${
                    isPaused ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-stretch gap-4 px-4 py-4">
          <div className="flex shrink-0 items-center">
            <CircularProgress
              value={isComplete ? 100 : completion}
              caption="Complete"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="grid h-full grid-cols-2 grid-rows-2">
              <div className="border-b border-r border-primary-dark/10 py-2 pr-3">
                <p className="font-sans text-[10px] font-normal uppercase tracking-[0.12em] text-taupe">
                  Target
                </p>
                <p className="mt-0.5 font-money text-sm font-light leading-tight text-primary-dark">
                  {money(goal.target_amount)}
                </p>
              </div>
              <div className="border-b border-primary-dark/10 py-2 pl-3">
                <p className="font-sans text-[10px] font-normal uppercase tracking-[0.12em] text-taupe">
                  Saved
                </p>
                <p className="mt-0.5 font-money text-sm font-light leading-tight text-primary-dark">
                  <OdometerNumber
                    value={goal.saved_amount}
                    prefix={user.currency_symbol || '$'}
                  />
                </p>
              </div>
              <div className="border-r border-primary-dark/10 py-2 pr-3">
                <p className="font-sans text-[10px] font-normal uppercase tracking-[0.12em] text-taupe">
                  Remaining
                </p>
                <p className="mt-0.5 font-money text-sm font-light leading-tight text-primary-dark">
                  <OdometerNumber
                    value={goal.remaining_amount}
                    prefix={user.currency_symbol || '$'}
                  />
                </p>
              </div>
              <div className="py-2 pl-3">
                <p className="font-sans text-[10px] font-normal uppercase tracking-[0.12em] text-taupe">
                  Days Left
                </p>
                <p className="mt-0.5 font-money text-sm font-light leading-tight text-primary-dark">
                  {goal.days_remaining}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={`border-t border-primary-dark/10 px-4 py-4 ${isComplete || isPaused ? 'pointer-events-none opacity-50' : ''}`}>
          <div className="border border-cream bg-cream/30 p-2">
            <div className="flex items-center justify-between gap-3">
              <p className="font-sans text-[10px] font-normal uppercase tracking-[0.12em] text-taupe/70">
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
                    disabled={isComplete || isPaused}
                    onClick={() => setSelectedFrequency(label)}
                    className={`px-1.5 py-1.5 font-sans text-[9px] font-normal uppercase tracking-[0.08em] transition-colors disabled:cursor-default ${
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

        <div
          ref={editPanelRef}
          data-no-reorder={isEditing ? true : undefined}
          className={`mt-auto ${isEditing ? 'border-t border-primary-dark/10 px-4 py-3' : ''}`}
        >
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

      <div className="ledger-card-band mt-auto shrink-0 border-t border-primary-dark/20 px-4 py-3.5 text-cream">
        {isPaused && !isComplete ? (
          <p className="text-center font-sans text-xs font-normal uppercase tracking-[0.16em] text-gold">
            On hold
          </p>
        ) : isComplete ? (
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-sans text-[10px] font-normal uppercase tracking-[0.12em] text-cream/60">
                Status
              </p>
              <p className="mt-0.5 font-serif text-lg font-light leading-tight tracking-[-0.02em]">
                Complete
              </p>
            </div>
          </div>
        ) : isEarnerMode ? (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] grid-rows-[auto_auto] gap-x-3">
              <p className="border-r border-cream/15 pr-3 font-sans text-[10px] font-normal uppercase tracking-[0.12em] text-cream/60">
                Monthly Allocation
              </p>
              <p className="font-sans text-[10px] font-normal uppercase tracking-[0.12em] text-cream/60">
                Budget Share
              </p>
              <div aria-hidden="true" />

              <div className="mt-0.5 flex items-center gap-1 border-r border-cream/15 pr-3">
                <p className="font-money text-base font-light leading-none tracking-[0.02em]">
                  <OdometerNumber
                    value={allocated}
                    prefix={user.currency_symbol || '$'}
                  />
                </p>
                <div className="relative flex items-center" ref={infoRef}>
                  <button
                    type="button"
                    onClick={fetchSuggestions}
                    aria-label="View improvement suggestions"
                    className="flex items-center justify-center p-0.5 text-cream/70 transition-colors hover:text-cream"
                  >
                    <Icon name="info" className="text-base leading-none" />
                  </button>
                  {suggestionsOpen && (
                    <div className="absolute bottom-full left-0 z-[60] mb-2 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
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
              <div className="mt-0.5 flex items-center">
                <p className="font-money text-base font-light leading-none tracking-[0.02em]">
                  {budgetShare.toFixed(0)}%
                </p>
              </div>
              <div className="mt-0.5 flex items-center justify-end">
                <button
                  type="button"
                  onClick={openTransactionModal}
                  aria-label="Log transaction"
                  className="flex items-center justify-center rounded-md p-0.5 opacity-90 transition-opacity hover:opacity-100"
                >
                  <TransactionIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-sans text-[10px] font-normal uppercase tracking-[0.12em] text-cream/60">
                  Pace Check
                </p>
                <p className="mt-0.5 font-serif text-lg font-light leading-tight tracking-[-0.02em]">
                  {isBehindSchedule || !goal.on_track
                    ? 'Needs attention'
                    : isAhead
                      ? 'Ahead of pace'
                      : 'On track'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <div className="relative" ref={infoRef}>
                  <button
                    type="button"
                    onClick={fetchSuggestions}
                    aria-label="View improvement suggestions"
                    className="flex items-center justify-center p-1 text-cream/80 transition-colors hover:bg-cream/10 hover:text-cream"
                  >
                    <Icon name="info" className="text-lg leading-none" />
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
                <button
                  type="button"
                  onClick={openTransactionModal}
                  aria-label="Log transaction"
                  className="flex items-center justify-center rounded-md p-0.5 opacity-90 transition-opacity hover:opacity-100"
                >
                  <TransactionIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
        )}
      </div>

      {showTransactionModal && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="presentation"
          onClick={closeTransactionModal}
        >
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[3px]" />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-transaction-title"
            className="modal-shell"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div className="min-w-0">
                <h2 id="record-transaction-title" className="modal-title">
                  Record Transaction
                </h2>
                <p className="mt-1 truncate font-sans text-sm font-light text-taupe">{goal.name}</p>
              </div>
              <button
                type="button"
                onClick={closeTransactionModal}
                aria-label="Close"
                disabled={txLoading}
                className="modal-close"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleTransactionSubmit} className="modal-body">
              <div className="grid grid-cols-2 gap-0.5 rounded-lg border border-primary-dark/10 bg-cream/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setTxType('deposit')}
                  className={`rounded-md px-3 py-2.5 font-sans text-xs font-normal uppercase tracking-[0.12em] transition-colors ${
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
                  className={`rounded-md px-3 py-2.5 font-sans text-xs font-normal uppercase tracking-[0.12em] transition-colors ${
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
                  className="modal-label"
                >
                  Amount
                </label>
                <input
                  id={`tx-amount-${goal.goal_id}`}
                  type="number"
                  value={txAmount}
                  onChange={(event) => setTxAmount(event.target.value)}
                  placeholder={`${user.currency_symbol || '$'}100.00`}
                  step="0.01"
                  min="0"
                  autoFocus
                  className="modal-field font-money"
                />
              </div>

              <div>
                <label
                  htmlFor={`tx-note-${goal.goal_id}`}
                  className="modal-label"
                >
                  Note <span className="font-light text-taupe">(optional)</span>
                </label>
                <input
                  id={`tx-note-${goal.goal_id}`}
                  type="text"
                  value={txNote}
                  onChange={(event) => setTxNote(event.target.value)}
                  placeholder="e.g., Monthly savings"
                  className="modal-field"
                />
              </div>

              {txError && <ErrorBanner message={txError} />}

              <button
                type="submit"
                disabled={txLoading}
                className="modal-submit"
              >
                {txLoading ? 'Recording…' : 'Confirm'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      <HoldGoalDialog
        open={pauseConfirmOpen}
        mode={isPaused ? 'resume' : 'hold'}
        isEarner={isEarnerMode}
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activityGoalFilter = searchParams.get('goal') || 'all';

  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthlyBudget, setMonthlyBudget] = useState(null);
  const [budgetEditRequest, setBudgetEditRequest] = useState(0);
  const [expenseRefresh, setExpenseRefresh] = useState(0);
  const [transactionRefresh, setTransactionRefresh] = useState(0);
  const [goalsPage, setGoalsPage] = useState(1);
  const [reorderError, setReorderError] = useState(null);
  const [draggingGoalId, setDraggingGoalId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const pendingReorderRef = useRef(null);
  const activeReorderRef = useRef(null);
  const dropTargetIdRef = useRef(null);
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

  const handleUserUpdate = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
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
    if (!user?.user_id) return [];

    try {
      const goalsResponse = await api.get(
        `/goals?userId=${user.user_id}`
      );
      setGoals(goalsResponse.data.goals);
      setMonthlyBudget(normalizeAmount(goalsResponse.data.monthly_budget));
      setIsEarnerMode(goalsResponse.data.mode === 'earner');
      setLoading(false);
      return goalsResponse.data.goals || [];
    } catch (err) {
      setError(err);
      setLoading(false);
      return [];
    }
  }, [user?.user_id]);

  useEffect(() => {
    document.documentElement.classList.remove('theme-midnight', 'density-compact');

    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
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
    window.requestAnimationFrame(async () => {
      const nextGoals = await fetchData();
      if (!Array.isArray(nextGoals) || nextGoals.length === 0) return;
      const lastActiveIndex = nextGoals.reduce(
        (lastIndex, goal, index) => (
          !goal.is_complete && !goal.is_paused ? index : lastIndex
        ),
        -1
      );
      const focusIndex = lastActiveIndex >= 0 ? lastActiveIndex : nextGoals.length - 1;
      setGoalsPage(Math.floor(focusIndex / GOALS_PER_PAGE) + 1);
    });
  };

  const persistGoalGroupOrder = async (nextGoals, rank) => {
    const previous = goals;
    setReorderError(null);
    setGoals(nextGoals);

    try {
      const response = await api.patch('/goals/reorder', {
        ordered_ids: nextGoals
          .filter((goal) => goalStatusRank(goal) === rank)
          .map((goal) => goal.goal_id),
      });
      if (Array.isArray(response.data.goals)) {
        setGoals(response.data.goals);
      }
    } catch (err) {
      setGoals(previous);
      setReorderError(getFriendlyError(err, 'We couldn’t save that order. Please try again.'));
    }
  };

  const handleMoveGoal = (goalId, direction) => {
    const nextGoals = moveGoalInGroup(goals, goalId, direction);
    if (nextGoals === goals) return;
    const current = goals.find((goal) => Number(goal.goal_id) === Number(goalId));
    if (!current) return;
    persistGoalGroupOrder(nextGoals, goalStatusRank(current));
  };

  const handleReorderDrop = (draggedId, targetId) => {
    if (Number(draggedId) === Number(targetId)) return;
    const nextGoals = insertGoalAt(goals, draggedId, targetId);
    if (nextGoals === goals) return;
    const dragged = goals.find((goal) => Number(goal.goal_id) === Number(draggedId));
    if (!dragged) return;
    persistGoalGroupOrder(nextGoals, goalStatusRank(dragged));
  };

  const clearPendingReorder = () => {
    if (pendingReorderRef.current?.timer) {
      window.clearTimeout(pendingReorderRef.current.timer);
    }
    pendingReorderRef.current = null;
  };

  const beginActiveReorder = (id, pointerId, grid) => {
    clearPendingReorder();
    activeReorderRef.current = { id, pointerId };
    setDraggingGoalId(id);
    document.body.classList.add('is-reordering-goals');
    try {
      grid?.setPointerCapture(pointerId);
    } catch {
      /* capture is best-effort */
    }
  };

  const endActiveReorder = (clientX, clientY) => {
    const session = activeReorderRef.current;
    activeReorderRef.current = null;
    dropTargetIdRef.current = null;
    setDraggingGoalId(null);
    setDropTargetId(null);
    document.body.classList.remove('is-reordering-goals');
    if (!session) return;
    const targetId = goalIdFromPoint(clientX, clientY);
    if (targetId && targetId !== session.id) {
      handleReorderDrop(session.id, targetId);
    }
  };

  const handleGoalsGridPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (activeReorderRef.current) return;
    if (event.target instanceof Element && event.target.closest(REORDER_IGNORE_SELECTOR)) return;
    if (!(event.target instanceof Element) || !event.target.closest('[data-reorder-handle]')) return;

    const card = event.target instanceof Element ? event.target.closest('[data-goal-id]') : null;
    if (!card) return;

    const id = Number.parseInt(card.dataset.goalId, 10);
    if (!Number.isInteger(id)) return;
    if (!canMoveGoal(goals, id, -1) && !canMoveGoal(goals, id, 1)) return;

    const grid = event.currentTarget;
    const isTouch = event.pointerType === 'touch' || event.pointerType === 'pen';

    if (event.detail >= 2 && !isTouch) {
      event.preventDefault();
      beginActiveReorder(id, event.pointerId, grid);
      return;
    }

    pendingReorderRef.current = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      isTouch,
      timer: window.setTimeout(() => {
        beginActiveReorder(id, event.pointerId, grid);
      }, REORDER_HOLD_MS),
    };
  };

  const handleGoalsGridPointerMove = (event) => {
    const pending = pendingReorderRef.current;
    if (pending && pending.pointerId === event.pointerId && !activeReorderRef.current) {
      const distance = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY);
      if (pending.isTouch) {
        if (distance > REORDER_TOUCH_CANCEL_PX) {
          clearPendingReorder();
        }
      } else if (distance > REORDER_MOUSE_MOVE_PX) {
        beginActiveReorder(pending.id, event.pointerId, event.currentTarget);
      }
    }

    const session = activeReorderRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    event.preventDefault();
    const overId = goalIdFromPoint(event.clientX, event.clientY);
    const nextOver = overId && overId !== session.id ? overId : null;
    if (dropTargetIdRef.current !== nextOver) {
      dropTargetIdRef.current = nextOver;
      setDropTargetId(nextOver);
    }
  };

  const handleGoalsGridPointerUp = (event) => {
    if (pendingReorderRef.current?.pointerId === event.pointerId) {
      clearPendingReorder();
    }
    if (activeReorderRef.current?.pointerId !== event.pointerId) return;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    endActiveReorder(event.clientX, event.clientY);
  };

  useEffect(() => () => {
    if (pendingReorderRef.current?.timer) {
      window.clearTimeout(pendingReorderRef.current.timer);
    }
    document.body.classList.remove('is-reordering-goals');
  }, []);

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

  if (
    location.pathname === PATHS.forgotPassword ||
    location.pathname === PATHS.resetPassword
  ) {
    return (
      <Routes>
        <Route path={PATHS.forgotPassword} element={
          <ScreenTransition screenKey="forgot"><ForgotPasswordPage /></ScreenTransition>
        } />
        <Route path={PATHS.resetPassword} element={
          <ScreenTransition screenKey="reset"><ResetPasswordPage /></ScreenTransition>
        } />
      </Routes>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path={PATHS.register} element={
          <ScreenTransition screenKey="register"><RegisterPage onRegister={handleLogin} /></ScreenTransition>
        } />
        <Route path={PATHS.login} element={
          <ScreenTransition screenKey="login"><LoginPage onLogin={handleLogin} /></ScreenTransition>
        } />
        <Route path={PATHS.forgotPassword} element={
          <ScreenTransition screenKey="forgot"><ForgotPasswordPage /></ScreenTransition>
        } />
        <Route path={PATHS.resetPassword} element={
          <ScreenTransition screenKey="reset"><ResetPasswordPage /></ScreenTransition>
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
    <div className="space-y-6">
      <section className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Operations</p>
          <h2 className="page-title">Goal &amp; Savings</h2>
          <p className="page-lede">
            Allocation, goal health, spending movement, and recent ledger activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="surface min-w-0 px-4 py-3">
            <p className="field-label mb-0">Portfolio Target</p>
            <p className="mt-1 break-words font-money text-xl font-light tracking-[0.02em] text-primary-dark sm:text-2xl">
              {formatMoney(totalTarget, userCurrency, userCurrencySymbol)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(PATHS.savings)}
            className="btn-navy"
          >
            + New Goal
          </button>
        </div>
      </section>

      <BudgetSetup
        userId={user.user_id}
        currentBudget={monthlyBudget}
        isEarnerMode={isEarnerMode}
        onBudgetSet={handleBudgetSet}
        currencyCode={userCurrency}
        currencySymbol={userCurrencySymbol}
        hideWhenSet
        editRequest={budgetEditRequest}
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
        onAddGoal={() => navigate(PATHS.savings)}
        onEditBudget={() => setBudgetEditRequest((n) => n + 1)}
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
            <p className="page-lede">
              First in the folio is highest intent. Drag a card from its navy heading to set order.
            </p>
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
            <button
              type="button"
              className="btn-ghost h-10"
              onClick={() => navigate(`${PATHS.settings}?tab=simulator`)}
            >
              What-if planner
            </button>
          </div>
        </div>

        {reorderError && (
          <ErrorBanner message={reorderError} />
        )}

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
              className={`grid grid-cols-1 items-stretch gap-8 md:grid-cols-2 lg:gap-10 xl:grid-cols-3 ${
                paginatedGoals.length === 1 ? 'py-2 sm:py-4' : ''
              } ${draggingGoalId ? 'touch-none' : ''}`}
              onPointerDown={handleGoalsGridPointerDown}
              onPointerMove={handleGoalsGridPointerMove}
              onPointerUp={handleGoalsGridPointerUp}
              onPointerCancel={handleGoalsGridPointerUp}
            >
              {paginatedGoals.map(goal => (
                <GoalPortfolioCard
                  key={goal.goal_id}
                  goal={goal}
                  user={user}
                  setGoals={setGoals}
                  folioRoman={toRoman(folioIndexInGroup(goals, goal.goal_id))}
                  canMoveUp={canMoveGoal(goals, goal.goal_id, -1)}
                  canMoveDown={canMoveGoal(goals, goal.goal_id, 1)}
                  onMoveUp={() => handleMoveGoal(goal.goal_id, -1)}
                  onMoveDown={() => handleMoveGoal(goal.goal_id, 1)}
                  isDragging={Number(draggingGoalId) === Number(goal.goal_id)}
                  isDropTarget={Number(dropTargetId) === Number(goal.goal_id)}
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
    <div className="space-y-6">
      <section className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Operations</p>
          <h2 className="page-title">Capital Outflow</h2>
          <p className="page-lede">
            Log spend, watch monthly trends, and see where capital leaves the ledger.
          </p>
        </div>
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
      onNavigate={selectPage}
      onGoalsChange={setGoals}
      onGoalCreated={handleGoalCreated}
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
              <div className="mx-auto w-full min-w-0 max-w-[1480px]">
                <AnimatedOutlet />
              </div>
            }
          >
            <Route path={PATHS.dashboard} element={renderDashboard()} />
            <Route path={PATHS.savings} element={renderSavingsGoals()} />
            <Route
              path="/simulator"
              element={<Navigate to={`${PATHS.settings}?tab=simulator`} replace />}
            />
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
