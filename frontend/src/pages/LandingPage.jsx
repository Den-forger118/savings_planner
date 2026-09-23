import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import ErrorBanner from '../components/ErrorBanner';
import { PATHS } from '../utils/paths';
import { savePendingGoal } from '../utils/pendingGoal';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const EASE = [0.22, 1, 0.36, 1];

const STORY_CHAPTERS = [
  {
    id: 'name',
    eyebrow: 'Chapter I',
    title: 'Name what you are saving for.',
    lede: 'Give the objective a target and a date. QUANT turns intent into a ledger entry you can actually follow.',
    image: '/illustrations/landing-story-goal.png',
    imageAlt: 'Clay woman planting a gold flag beside a savings goal tablet',
  },
  {
    id: 'grow',
    eyebrow: 'Chapter II',
    title: 'Watch the balance grow.',
    lede: 'Record deposits as you save. Progress stays visible — no guessing how close you are.',
    image: '/illustrations/landing-story-progress.png',
    imageAlt: 'Three clay friends filling a navy jar with gold coins',
  },
  {
    id: 'clarity',
    eyebrow: 'Chapter III',
    title: 'See the whole picture.',
    lede: 'Expenses, cadence, and earner allocation sit beside your goals — so the plan stays honest.',
    image: '/illustrations/landing-story-clarity.png',
    imageAlt: 'Clay colleagues reviewing a navy savings dashboard together',
  },
];

const todayInputValue = () => new Date().toISOString().slice(0, 10);

function Reveal({ children, className = '', delay = 0 }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.28 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

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

function StoryChapter({ chapter, reverse = false }) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-14 lg:py-24">
      <Reveal className={reverse ? 'lg:order-2' : ''}>
        <p className="font-sans text-xs font-normal uppercase tracking-[0.14em] text-gold">
          {chapter.eyebrow}
        </p>
        <h2 className="mt-3 max-w-md font-serif text-3xl font-light tracking-[-0.02em] text-primary-dark sm:text-4xl">
          {chapter.title}
        </h2>
        <p className="mt-4 max-w-md font-sans text-[15px] font-light leading-relaxed text-taupe sm:text-base">
          {chapter.lede}
        </p>
      </Reveal>

      <Reveal delay={0.08} className={reverse ? 'lg:order-1' : ''}>
        <div className="overflow-hidden rounded-card bg-[#0A0F1A] shadow-lift">
          <img
            src={chapter.image}
            alt={chapter.imageAlt}
            className="block h-auto w-full object-cover"
            loading="lazy"
            draggable={false}
          />
        </div>
      </Reveal>
    </section>
  );
}

function LandingPage() {
  const reduceMotion = useReducedMotion();
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
    <div className="landing-canvas relative min-h-screen overflow-x-clip bg-white font-sans text-primary-dark">
      <header className="sticky top-0 z-40 border-b border-primary-dark/[0.08] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <p className="font-engraved text-2xl text-gold sm:text-[1.65rem]">QUANT</p>
          <div className="flex items-center gap-3">
            <Link to={PATHS.login} className="btn-ghost min-h-[40px] px-4 py-2 text-xs">
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

      {/* Hero — full-bleed story plane, art dissolved into navy */}
      <section className="relative isolate min-h-[min(92vh,52rem)] overflow-hidden bg-[#0A0F1A] text-cream">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_28%_18%,rgba(212,177,109,0.14),transparent_52%)]"
          aria-hidden="true"
        />

        {/* Art sits as a field, not a framed photo */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.08 }}
          className="pointer-events-none absolute inset-x-0 bottom-0 top-[36%] sm:top-[26%] lg:inset-y-0 lg:left-[34%] lg:right-0 lg:top-0"
          aria-hidden="true"
        >
          <img
            src="/illustrations/landing-story-open.png"
            alt=""
            className="h-full w-full object-cover object-[center_30%] lg:object-center"
            draggable={false}
          />
          {/* Soft edge dissolve — keep the cream room readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1A] via-[#0A0F1A]/20 to-transparent lg:bg-gradient-to-r lg:from-[#0A0F1A] lg:via-[#0A0F1A]/40 lg:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F1A]/55 via-transparent to-[#0A0F1A]/45 lg:from-[#0A0F1A]/30 lg:to-[#0A0F1A]/35" />
        </motion.div>

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col justify-center px-5 pb-[42%] pt-14 sm:px-8 sm:pb-[36%] sm:pt-16 lg:min-h-[min(92vh,52rem)] lg:pb-20 lg:pt-16">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: EASE }}
            className="max-w-xl"
          >
            <p className="font-engraved text-[2rem] text-gold sm:text-[2.35rem]">QUANT</p>
            <h1 className="mt-5 max-w-lg font-serif text-4xl font-light tracking-[-0.03em] text-cream sm:text-5xl lg:text-[3.15rem] lg:leading-[1.15]">
              Plan savings like a quiet private ledger.
            </h1>
            <p className="mt-5 max-w-md font-sans text-base font-light leading-relaxed text-cream/65 sm:text-[17px]">
              Set an objective, record what you save, and see whether the plan still holds —
              without loud fintech noise.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={scrollToGoal} className="btn-primary min-h-[44px] px-6">
                Start your first goal
              </button>
              <Link
                to={PATHS.login}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-cream/25 px-6 font-sans text-xs font-normal uppercase tracking-[0.12em] text-cream transition-colors hover:border-gold/50 hover:text-gold"
              >
                I already have an account
              </Link>
            </div>
          </motion.div>
        </div>

        <span className="sr-only">
          Clay character holding a navy QUANT book marked with a gold Q, looking satisfied
        </span>
      </section>

      {/* Scrollytelling chapters */}
      <div className="border-t border-primary-dark/[0.06] bg-white">
        {STORY_CHAPTERS.map((chapter, index) => (
          <StoryChapter
            key={chapter.id}
            chapter={chapter}
            reverse={index % 2 === 1}
          />
        ))}
      </div>

      {/* Goal creation — interaction destination */}
      <section id="landing-goal" className="scroll-mt-24 border-t border-primary-dark/[0.06] bg-white px-5 py-16 sm:px-8 sm:py-20">
        <Reveal className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-card border border-primary-dark/[0.1] bg-white shadow-soft">
            <div className="border-b border-primary-dark/[0.08] px-5 py-5 sm:px-8 sm:py-6">
              <p className="font-sans text-xs font-normal uppercase tracking-[0.14em] text-gold">
                Begin here
              </p>
              <h2 className="mt-2 font-serif text-3xl font-light tracking-[-0.02em] text-primary-dark sm:text-4xl">
                What are you saving towards?
              </h2>
              <p className="mt-3 max-w-2xl font-sans text-sm font-light leading-relaxed text-taupe sm:text-[15px]">
                Start without an account. When you are ready, we guide you through a short setup
                and bring this goal back for you to review.
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
        </Reveal>
      </section>

      <LandingGoalGate open={gateOpen} onClose={() => setGateOpen(false)} />
    </div>
  );
}

export default LandingPage;
