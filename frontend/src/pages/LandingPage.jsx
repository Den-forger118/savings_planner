import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorBanner from '../components/ErrorBanner';
import { PATHS } from '../utils/paths';
import { savePendingGoal } from '../utils/pendingGoal';
import { useNavigate } from 'react-router-dom';
const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const FEATURES = [
  {
    icon: 'flag',
    title: 'Objective Ledger',
    description: 'Name what you are saving for, set a target, and watch progress build over time.',
  },
  {
    icon: 'account_balance_wallet',
    title: 'Earner & Non-Earner',
    description: 'Track goals your way — with or without a fixed monthly savings budget.',
  },
  {
    icon: 'receipt_long',
    title: 'Spending & Activity',
    description: 'Log expenses by category and keep a clear record of every deposit.',
  },
];

const todayInputValue = () => new Date().toISOString().slice(0, 10);

function LandingGoalGate({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[3px]" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="landing-gate-title"
        className="modal-shell max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="min-w-0">
            <p className="font-sans text-[11px] font-normal uppercase tracking-[0.14em] text-gold">
              Almost there
            </p>
            <h2 id="landing-gate-title" className="modal-title">
              Save this goal to your ledger
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="modal-close"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        <div className="modal-body space-y-5">
          <p className="font-sans text-sm font-light leading-relaxed text-taupe">
            Create a free QUANT account to finish. Your goal stays filled in — you will review it
            at the end of setup before it goes on the ledger.
          </p>

          <Link
            to={PATHS.register}
            className="btn-navy flex min-h-[44px] w-full items-center justify-center gap-2"
          >
            Create account
            <Icon name="arrow_forward" className="text-base" />
          </Link>

          <p className="text-center font-sans text-sm text-taupe">
            Already have an account?{' '}
            <Link
              to={PATHS.login}
              className="font-normal text-primary-dark transition-colors hover:text-gold"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
  });
  const [error, setError] = useState(null);
  const [gateOpen, setGateOpen] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError(null);

    if (!goalForm.name.trim() || !goalForm.targetAmount || !goalForm.deadline) {
      setError('Please fill in all goal fields to continue.');
      return;
    }

    if (Number.parseFloat(goalForm.targetAmount) <= 0) {
      setError('Target amount must be greater than zero.');
      return;
    }

    if (goalForm.deadline < todayInputValue()) {
      setError('Deadline cannot be in the past.');
      return;
    }

    if (!savePendingGoal(goalForm)) {
      setError('We could not save your goal draft. Please try again.');
      return;
    }

    setGateOpen(true);
  };

  const scrollToGoal = () => {
    document.getElementById('landing-goal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="page-canvas min-h-screen font-sans">
      <header className="sticky top-0 z-40 border-b border-primary-dark/[0.06] bg-ivory/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <p className="font-engraved text-2xl text-gold sm:text-[1.65rem]">QUANT</p>
          <div className="flex items-center gap-3">
            <Link
              to={PATHS.login}
              className="btn-ghost min-h-[40px] px-4 py-2 text-xs"
            >
              Sign in
            </Link>
            <Link
              to={PATHS.register}
              className="btn-navy hidden min-h-[40px] px-4 py-2 text-xs sm:inline-flex"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-14">
          <div>
            <p className="font-sans text-xs font-normal uppercase tracking-[0.14em] text-gold">
              Private savings intelligence
            </p>
            <h1 className="mt-3 font-serif text-4xl font-light tracking-[-0.03em] text-primary-dark sm:text-5xl lg:text-[3.25rem] lg:leading-[1.15]">
              Plan savings like a quiet private ledger.
            </h1>
            <p className="mt-5 max-w-xl font-sans text-base font-light leading-relaxed text-taupe sm:text-[17px]">
              Set objectives, record deposits, understand spending, and see how your monthly plan
              supports what matters — whether you earn on a schedule or save when you can.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={scrollToGoal}
                className="btn-navy min-h-[44px] px-6"
              >
                Start your first goal
              </button>
              <Link
                to={PATHS.login}
                className="btn-ghost min-h-[44px] px-6"
              >
                I already have an account
              </Link>
            </div>
          </div>

          <div className="surface-navy relative overflow-hidden p-6 text-cream sm:p-8">
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gold/10 blur-2xl" aria-hidden="true" />
            <p className="font-sans text-xs font-normal uppercase tracking-[0.14em] text-gold/80">
              What you get
            </p>
            <ul className="mt-5 space-y-4">
              {[
                'Goal-led savings with clear progress',
                'Earner allocation when you have a monthly budget',
                'Expense tracking and dashboard analytics',
                'A calm ledger — no loud fintech noise',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Icon name="check_circle" className="mt-0.5 text-lg text-gold" />
                  <span className="font-sans text-sm font-light leading-relaxed text-cream/85">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-16 sm:mt-20">
          <div className="mb-8 max-w-2xl">
            <p className="font-sans text-xs font-normal uppercase tracking-[0.14em] text-gold">
              Capabilities
            </p>
            <h2 className="mt-2 font-serif text-3xl font-light tracking-[-0.02em] text-primary-dark sm:text-4xl">
              Everything in one composed ledger
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="surface p-5 sm:p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-dark text-gold">
                  <Icon name={feature.icon} className="text-xl" />
                </span>
                <h3 className="mt-4 font-serif text-xl font-light tracking-[-0.015em] text-primary-dark">
                  {feature.title}
                </h3>
                <p className="mt-2 font-sans text-sm font-light leading-relaxed text-taupe">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="landing-goal" className="mt-16 scroll-mt-24 sm:mt-20">
          <div className="surface overflow-hidden">
            <div className="border-b border-primary-dark/[0.06] bg-cream/40 px-5 py-5 sm:px-8 sm:py-6">
              <p className="font-sans text-xs font-normal uppercase tracking-[0.14em] text-gold">
                First objective
              </p>
              <h2 className="mt-2 font-serif text-3xl font-light tracking-[-0.02em] text-primary-dark sm:text-4xl">
                What are you saving towards?
              </h2>
              <p className="mt-3 max-w-2xl font-sans text-sm font-light leading-relaxed text-taupe sm:text-[15px]">
                Start here — no account needed yet. When you are ready, we will guide you through
                a short setup and bring this goal back for you to review.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-6 sm:px-8 sm:py-8">
              <div>
                <label className="field-label" htmlFor="landing-goal-name">
                  Goal Name
                </label>
                <input
                  id="landing-goal-name"
                  type="text"
                  value={goalForm.name}
                  onChange={(e) => setGoalForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="field"
                  placeholder="e.g. Bali Trip"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="landing-goal-amount">
                    Target Amount
                  </label>
                  <input
                    id="landing-goal-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={goalForm.targetAmount}
                    onChange={(e) => setGoalForm((prev) => ({ ...prev, targetAmount: e.target.value }))}
                    className="field"
                    placeholder="$0.00"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="landing-goal-deadline">
                    Deadline
                  </label>
                  <input
                    id="landing-goal-deadline"
                    type="date"
                    min={todayInputValue()}
                    value={goalForm.deadline}
                    onChange={(e) => setGoalForm((prev) => ({ ...prev, deadline: e.target.value }))}
                    className="field"
                  />
                </div>
              </div>

              {error && <ErrorBanner message={error} />}

              <button
                type="submit"
                className="btn-navy min-h-[44px] w-full sm:w-auto sm:px-10"
              >
                Create Goal →
              </button>
            </form>
          </div>
        </section>
      </main>

      <LandingGoalGate open={gateOpen} onClose={() => setGateOpen(false)} />
    </div>
  );
}

export default LandingPage;
