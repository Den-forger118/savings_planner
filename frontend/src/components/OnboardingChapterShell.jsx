/**
 * Onboarding chapter plates — gold line-art infographics per step.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const EASE_LUXURY = [0.22, 1, 0.36, 1];

const chapterVariants = {
  enter: (dir) => ({
    opacity: 0,
    y: dir >= 0 ? 22 : -16,
  }),
  center: {
    opacity: 1,
    y: 0,
  },
  exit: (dir) => ({
    opacity: 0,
    y: dir >= 0 ? -14 : 18,
  }),
};

const formVariants = {
  enter: (dir) => ({
    opacity: 0,
    y: dir >= 0 ? 18 : -14,
  }),
  center: {
    opacity: 1,
    y: 0,
  },
  exit: (dir) => ({
    opacity: 0,
    y: dir >= 0 ? -10 : 14,
  }),
};

function ChapterArt({ src, className = '' }) {
  return (
    <img
      src={`${src}?v=6`}
      alt=""
      aria-hidden="true"
      className={`auth-story-illustration auth-story-illustration--onboarding ${className}`}
      draggable={false}
    />
  );
}

export const ONBOARDING_CHAPTERS = {
  welcome: {
    roman: 'I',
    title: 'The Opening',
    lede: 'Your private ledger begins with a few quiet choices.',
    artSrc: '/illustrations/onboarding-welcome.png',
  },
  identity: {
    roman: 'II',
    title: 'How you save',
    lede: 'Two honest paths. One ledger shaped around you.',
    artSrc: '/illustrations/onboarding-identity.png',
  },
  income: {
    roman: 'III',
    title: 'The inflow',
    lede: 'Understand what arrives each month—then decide what stays.',
    artSrc: '/illustrations/onboarding-income.png',
  },
  budget: {
    roman: 'IV',
    title: 'The allocation',
    lede: 'A single monthly commitment, distributed with intention.',
    artSrc: '/illustrations/onboarding-budget.png',
  },
  currency: {
    roman: 'V',
    title: 'The unit of account',
    lede: 'Every figure in QUANT will speak this currency.',
    artSrc: '/illustrations/onboarding-currency.png',
  },
  goal: {
    roman: 'VI',
    title: 'The first objective',
    lede: 'Name what you are moving toward. Or leave the page blank for now.',
    artSrc: '/illustrations/onboarding-goal.png',
  },
  complete: {
    roman: 'VII',
    title: 'Epilogue',
    lede: 'The seal is set. Your dashboard is ready.',
    artSrc: '/illustrations/onboarding-complete.png',
    artFitClass: 'auth-story-illustration--onboarding-epilogue',
  },
};

/**
 * Full-bleed onboarding shell: navy chapter panel + cream step content.
 */
function OnboardingChapterShell({
  stepId,
  stepIndex,
  totalSteps,
  progress,
  direction = 1,
  ProgressBarComponent,
  children,
}) {
  const chapter = ONBOARDING_CHAPTERS[stepId] || ONBOARDING_CHAPTERS.welcome;
  const reduceMotion = useReducedMotion();

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.52, ease: EASE_LUXURY };

  const formTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.48, ease: EASE_LUXURY };

  return (
    <div className="relative min-h-screen w-full bg-primary-dark lg:grid lg:grid-cols-2">
      <aside className="auth-story relative flex flex-col justify-between overflow-hidden px-8 py-10 text-cream sm:px-12 lg:min-h-screen lg:px-14 lg:py-12 xl:px-16">
        <div className="auth-story-glow pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 shrink-0">
          <p className="font-engraved text-3xl text-gold sm:text-4xl">QUANT</p>
          <p className="mt-2 font-sans text-xs font-normal uppercase tracking-[0.16em] text-cream/45">
            Private Savings Intelligence
          </p>
        </div>

        <div className="relative z-10 my-4 flex min-h-0 flex-1 flex-col lg:my-0">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={stepId}
              custom={direction}
              variants={chapterVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="flex min-h-0 flex-1 flex-col"
            >
              <p className="font-sans text-xs font-normal uppercase tracking-[0.16em] text-gold">
                Chapter {chapter.roman}
              </p>
              <h1 className="mt-3 max-w-md font-serif text-3xl font-light leading-snug tracking-[-0.02em] text-cream sm:text-[2.35rem]">
                {chapter.title}
              </h1>
              <p className="mt-3 max-w-md font-sans text-[15px] font-light leading-relaxed text-cream/60">
                {chapter.lede}
              </p>

              <div className="auth-onboarding-art-stage relative mt-4 hidden min-h-0 flex-1 items-center sm:flex lg:mt-6">
                <div className="auth-onboarding-art-glow pointer-events-none absolute inset-0" aria-hidden="true" />
                <ChapterArt
                  src={chapter.artSrc}
                  className={`auth-story-illustration--onboarding-fit relative z-10 ${chapter.artFitClass || ''}`}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative z-10 shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <p className="font-sans text-xs uppercase tracking-[0.14em] text-cream/45">
              Chapter {stepIndex + 1} of {totalSteps || 1}
            </p>
            <p className="font-money text-xs text-cream/40">{Math.round(progress)}%</p>
          </div>
          {ProgressBarComponent}
        </div>
      </aside>

      <section className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-white px-5 py-10 sm:px-8 lg:min-h-screen lg:px-14 lg:py-14 xl:px-20">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={stepId}
            custom={direction}
            variants={formVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={formTransition}
            className="w-full max-w-[480px]"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}

export default OnboardingChapterShell;
