import { useState } from 'react';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const DOC_FIELDS = [
  { key: 'what', label: 'What', icon: 'info' },
  { key: 'why', label: 'Why', icon: 'lightbulb' },
  { key: 'where', label: 'Where', icon: 'pin_drop' },
  { key: 'who', label: 'Who', icon: 'person' },
  { key: 'how', label: 'How', icon: 'route' },
];

const GUIDE_SECTIONS = [
  {
    id: 'overview',
    title: 'Overview',
    icon: 'home',
    intro: 'QUANT helps you plan savings goals, track deposits, and understand spending — whether you have a fixed monthly income or not.',
    features: [
      {
        id: 'earner-modes',
        title: 'Earner vs Non-Earner Mode',
        icon: 'tune',
        badge: 'Settings',
        page: 'settings',
        what: 'Two savings modes that change how the app plans and allocates money across your goals.',
        why: 'Not everyone has a predictable monthly income. Non-Earner mode focuses on what you need to save; Earner mode adds budget splitting and feasibility checks.',
        where: 'Settings → Savings Mode toggle, plus the monthly budget panel on the same page and Dashboard.',
        who: 'Anyone. Use Non-Earner if you are still figuring out cash flow. Switch to Earner once you can commit a monthly savings amount.',
        how: [
          'Open Settings and choose Financial Engine or Help.',
          'Set a monthly budget if you have not already.',
          'Toggle Savings Mode to Earner or Non-Earner.',
          'Return to Dashboard or Savings Goals — labels and allocation panels update immediately.',
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: 'dashboard',
    intro: 'Your home screen for a quick read on goals, spending, and recent movement.',
    features: [
      {
        id: 'dashboard-overview',
        title: 'Dashboard Overview',
        icon: 'analytics',
        badge: 'Dashboard',
        page: 'dashboard',
        what: 'A summary page showing portfolio targets, budget health, spending charts, goal performance, and recent activity.',
        why: 'See everything important in one place before diving into individual goals or expenses.',
        where: 'Dashboard in the left navigation (Home on mobile).',
        who: 'All members — especially useful in Earner mode when you want to check allocation and spending together.',
        how: [
          'Sign in and land on Dashboard by default.',
          'Review Total Portfolio Target at the top right.',
          'Scroll for budget overview (Earner mode), spending analytics, goal charts, and recent transactions.',
        ],
      },
      {
        id: 'budget-overview',
        title: 'Budget Overview & Allocation',
        icon: 'account_balance_wallet',
        badge: 'Earner only',
        page: 'dashboard',
        what: 'Cards and charts showing how your monthly budget is split across goals, what is unallocated, and which goals are underfunded.',
        why: 'Tells you at a glance whether your plan is realistic and where to adjust deadlines or amounts.',
        where: 'Dashboard — visible when Earner mode is on and you have an active budget and goals.',
        who: 'Members in Earner mode with a monthly budget set.',
        how: [
          'Enable Earner mode and set a monthly budget in Settings.',
          'Create at least one active savings goal.',
          'Open Dashboard and read the Budget Overview and How Your Budget is Allocated sections.',
          'Follow recommendations if any goals show as underfunded.',
        ],
      },
      {
        id: 'spending-analytics',
        title: 'Spending Analytics',
        icon: 'bar_chart',
        badge: 'Dashboard',
        page: 'dashboard',
        what: 'A histogram of spending by category for the selected month, with totals and month-over-month change.',
        why: 'Understand where your money is going, category by category.',
        where: 'Dashboard → Where Your Money Goes.',
        who: 'Anyone logging expenses.',
        how: [
          'Log expenses from the Expense Tracker.',
          'Return to Dashboard and pick a month from the chart controls.',
          'Review total spend, top category, and month-over-month change.',
        ],
      },
      {
        id: 'goal-performance-chart',
        title: 'Goal Performance Chart',
        icon: 'show_chart',
        badge: 'Dashboard',
        page: 'dashboard',
        what: 'A multi-goal line chart comparing progress over time — by percentage or dollars saved.',
        why: 'Spot which goals are moving fastest and which need attention without opening each card.',
        where: 'Dashboard → Goal Performance Over Time.',
        who: 'Members with at least one savings goal.',
        how: [
          'Record deposits on your goals from Savings Goals.',
          'Open Dashboard and use the chart toggles to switch view modes.',
          'Click a goal name in the legend to focus on it.',
        ],
      },
      {
        id: 'recent-activity',
        title: 'Recent Activity',
        icon: 'history',
        badge: 'Dashboard',
        page: 'activity',
        what: 'A short list of your latest savings deposits and withdrawals across all goals.',
        why: 'Quick audit trail without opening the full Activity ledger.',
        where: 'Dashboard bottom section, or Activity in the sidebar for the full ledger.',
        who: 'Anyone recording goal transactions.',
        how: [
          'Record a deposit or withdrawal on any goal.',
          'Check Dashboard for the latest entries.',
          'Click View All to open the full Activity page.',
        ],
      },
    ],
  },
  {
    id: 'savings-goals',
    title: 'Savings Goals',
    icon: 'payments',
    intro: 'Create objectives, track progress, and record money moving in or out of each goal.',
    features: [
      {
        id: 'create-goal',
        title: 'Create a Goal',
        icon: 'add_circle',
        badge: 'Savings Goals',
        page: 'savings',
        what: 'A form to name a goal, set a target amount, and pick a deadline.',
        why: 'Every calculation in the app — cadence, progress, allocation — starts from a defined objective.',
        where: 'Savings Goals → New Goal button (top right of Objective Ledger).',
        who: 'All members.',
        how: [
          'Go to Savings Goals.',
          'Click New Goal.',
          'Enter a name, target amount, and deadline, then Create Goal.',
          'Your new goal appears in the portfolio grid with progress and cadence info.',
        ],
      },
      {
        id: 'goal-card',
        title: 'Goal Portfolio Cards',
        icon: 'credit_card',
        badge: 'Savings Goals',
        page: 'savings',
        what: 'Each goal is shown as a card with progress, target/saved/remaining stats, schedule status, and action menu.',
        why: 'Manage every objective from one screen without losing context.',
        where: 'Savings Goals → Objective Ledger grid.',
        who: 'All members.',
        how: [
          'Open Savings Goals to see all cards.',
          'Read the progress bar and schedule banner (ahead, behind, or on track).',
          'Use the ⋮ menu for edit, delete, record transaction, cadence, or performance views.',
        ],
      },
      {
        id: 'savings-cadence',
        title: 'Savings Cadence',
        icon: 'schedule',
        badge: 'All modes',
        page: 'savings',
        what: 'Daily, weekly, monthly, and yearly amounts needed to hit your deadline based on what is left to save.',
        why: 'Turns a big target into actionable saving rhythms.',
        where: 'On each goal card, or expand Savings Cadence from the ⋮ menu.',
        who: 'Everyone — always visible. Monthly allocation panel is Earner-only.',
        how: [
          'Open a goal card on Savings Goals.',
          'Read the cadence row or open Savings Cadence from the menu.',
          'Use the daily/weekly/monthly figures as personal targets when you deposit.',
        ],
      },
      {
        id: 'monthly-allocation',
        title: 'Monthly Allocation & Feasibility',
        icon: 'pie_chart',
        badge: 'Earner only',
        page: 'savings',
        what: 'Shows how much of your monthly budget is assigned to this goal and whether the plan is achievable or underfunded.',
        why: 'Prevents over-committing and highlights goals that need more time or money.',
        where: 'Goal card → Monthly Allocation panel (Earner mode only).',
        who: 'Members in Earner mode with a monthly budget.',
        how: [
          'Enable Earner mode and set a budget.',
          'Open a goal card and review Monthly Allocation.',
          'Tap the info icon for improvement suggestions if a goal is underfunded.',
        ],
      },
      {
        id: 'record-transaction',
        title: 'Record a Transaction',
        icon: 'swap_horiz',
        badge: 'Savings Goals',
        page: 'savings',
        what: 'Log a deposit or withdrawal against a specific goal.',
        why: 'Updates saved balance, progress %, charts, and completion status.',
        where: 'Goal card ⋮ menu → Record Transaction.',
        who: 'Anyone actively saving toward goals.',
        how: [
          'Open the goal’s ⋮ menu and choose Record Transaction.',
          'Enter amount, pick deposit or withdrawal, add an optional note.',
          'Submit — the card, dashboard charts, and Activity ledger refresh.',
        ],
      },
      {
        id: 'goal-completion',
        title: 'Goal Completion',
        icon: 'celebration',
        badge: 'Savings Goals',
        page: 'savings',
        what: 'When saved amount reaches the target, the goal is marked Complete with a stamp and timestamp.',
        why: 'Celebrates wins and removes completed goals from active allocation.',
        where: 'Automatically on the goal card when fully funded.',
        who: 'Any member who reaches a target through deposits.',
        how: [
          'Keep recording deposits until saved equals target.',
          'A completion notice appears and the card shows a Complete badge.',
          'Completed goals stay visible for history but no longer accept edits or new transactions.',
        ],
      },
      {
        id: 'goal-performance',
        title: 'Individual Goal Chart',
        icon: 'monitoring',
        badge: 'Savings Goals',
        page: 'savings',
        what: 'A line chart of cumulative balance over time for one goal, with growth percentage.',
        why: 'See momentum for a single objective in detail.',
        where: 'Goal card ⋮ menu → Savings Performance.',
        who: 'Members who want per-goal history beyond the dashboard multi-goal chart.',
        how: [
          'Record at least one transaction on the goal.',
          'Open ⋮ → Savings Performance to expand the chart inline.',
        ],
      },
    ],
  },
  {
    id: 'activity',
    title: 'Activity',
    icon: 'history',
    intro: 'A full ledger of savings movements across every goal.',
    features: [
      {
        id: 'activity-ledger',
        title: 'Activity Ledger',
        icon: 'receipt_long',
        badge: 'Activity',
        page: 'activity',
        what: 'Searchable, paginated history of all deposits and withdrawals with goal name, amount, type, and running balance.',
        why: 'Audit your savings behavior and reconcile what happened when.',
        where: 'Activity in the sidebar.',
        who: 'Anyone recording goal transactions.',
        how: [
          'Open Activity from the navigation.',
          'Filter by goal using the dropdown, or leave on All Goals.',
          'Browse pages and use pagination for older entries.',
        ],
      },
    ],
  },
  {
    id: 'expenses',
    title: 'Expense Tracker',
    icon: 'receipt_long',
    intro: 'A simple ledger to log day-to-day spending and keep track of what you have spent.',
    features: [
      {
        id: 'log-expense',
        title: 'Log an Expense',
        icon: 'add_shopping_cart',
        badge: 'Expense Tracker',
        page: 'expenses',
        what: 'A form to record spending amount, category, date, and optional note.',
        why: 'Builds the spending picture used in your ledger totals and category charts.',
        where: 'Expense Tracker → Log Expense button.',
        who: 'All members tracking personal spending.',
        how: [
          'Go to Expense Tracker.',
          'Click Log Expense.',
          'Pick a category, enter amount and date, add a note if helpful, then submit.',
        ],
      },
      {
        id: 'expense-summary',
        title: 'Monthly Expense Summary',
        icon: 'summarize',
        badge: 'Expense Tracker',
        page: 'expenses',
        what: 'Current-month total spent, transaction count, average per transaction, and a category breakdown.',
        why: 'See how much you have spent so far and spot your spending patterns.',
        where: 'Expense Tracker main page.',
        who: 'Everyone tracking personal spending.',
        how: [
          'Open Expense Tracker.',
          'Review totals, category bars, and the expense list for the current month.',
        ],
      },
    ],
  },
];

function DocField({ label, icon, children }) {
  return (
    <div className="rounded-lg border border-cream bg-white/60 px-4 py-3">
      <div className="mb-1.5 flex items-center gap-2">
        <Icon name={icon} className="text-base text-gold" />
        <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
          {label}
        </p>
      </div>
      <div className="font-sans text-sm leading-relaxed text-primary-dark">{children}</div>
    </div>
  );
}

function FeatureDoc({ feature, onNavigate, isEarnerMode }) {
  const isEarnerOnly = feature.badge === 'Earner only';
  const hiddenForMode = isEarnerOnly && !isEarnerMode;

  return (
    <article
      id={feature.id}
      className={`scroll-mt-28 rounded-lg border border-cream bg-cream/30 p-6 shadow-sm ${
        hiddenForMode ? 'opacity-60' : ''
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-dark text-gold">
            <Icon name={feature.icon} className="text-xl" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif text-xl font-light tracking-[-0.015em] text-primary-dark">{feature.title}</h3>
              <span className="rounded-full bg-primary-dark/10 px-2.5 py-0.5 font-sans text-xs font-normal uppercase tracking-[0.12em] text-primary-dark">
                {feature.badge}
              </span>
              {isEarnerOnly && (
                <span className="rounded-full bg-gold/20 px-2.5 py-0.5 font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
                  Earner mode
                </span>
              )}
            </div>
            {hiddenForMode && (
              <p className="mt-1 font-sans text-xs text-taupe">
                Enable Earner mode in Settings to use this feature.
              </p>
            )}
          </div>
        </div>
        {feature.page && onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate(feature.page)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-primary-dark px-4 py-2 font-sans text-xs font-normal uppercase tracking-[0.12em] text-primary-dark transition-colors hover:bg-primary-dark hover:text-cream"
          >
            Open
            <Icon name="arrow_forward" className="text-sm" />
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        {DOC_FIELDS.map(({ key, label, icon }) => (
          <DocField key={key} label={label} icon={icon}>
            {key === 'how' ? (
              <ol className="list-decimal space-y-1.5 pl-4">
                {feature.how.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            ) : (
              feature[key]
            )}
          </DocField>
        ))}
      </div>
    </article>
  );
}

function FeatureGuide({ isEarnerMode = false, onNavigate, embedded = false }) {
  const [activeSection, setActiveSection] = useState('overview');

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    document.getElementById(`guide-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-8">
      <section>
        <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
          {embedded ? 'Help' : 'Guide'}
        </p>
        <h2 className="mt-2 font-serif text-4xl font-normal tracking-[-0.03em] text-primary-dark md:text-5xl">
          How to Use QUANT
        </h2>
        <p className="mt-3 max-w-3xl font-sans text-base leading-relaxed text-taupe">
          A practical reference for every feature in your account — what it does, why it matters,
          where to find it, who it is for, and how to use it step by step.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gold/30 bg-white px-4 py-2">
          <span className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
            Your mode
          </span>
          <span className="rounded-full bg-gold/20 px-2.5 py-0.5 font-sans text-xs font-medium text-primary-dark">
            {isEarnerMode ? 'Earner' : 'Non-Earner'}
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-primary-dark/[0.08] bg-white p-6 shadow-soft">
        <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
          Quick start
        </p>
        <h3 className="mt-1 font-serif text-2xl font-light tracking-[-0.02em] text-primary-dark">
          Recommended first steps
        </h3>
        <ol className="mt-4 space-y-3 font-sans text-sm leading-relaxed text-primary-dark">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-dark font-sans text-xs font-medium text-gold">1</span>
            <span>
              <strong>Create a goal</strong> — Savings Goals → New Goal. Give it a name, target, and deadline.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-dark font-sans text-xs font-medium text-gold">2</span>
            <span>
              <strong>Record a deposit</strong> — open the goal menu → Record Transaction when you save money.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-dark font-sans text-xs font-medium text-gold">3</span>
            <span>
              <strong>Log expenses</strong> — Expense Tracker → Log Expense to track spending by category.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-dark font-sans text-xs font-medium text-gold">4</span>
            <span>
              <strong>Choose your mode</strong> — Settings → toggle Earner if you have a monthly budget to allocate.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-dark font-sans text-xs font-medium text-gold">5</span>
            <span>
              <strong>Check Dashboard</strong> — review progress charts, spending, and recent activity in one view.
            </span>
          </li>
        </ol>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="xl:sticky xl:top-24 xl:self-start">
          <p className="mb-3 font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
            On this page
          </p>
          <ul className="space-y-1 rounded-lg border border-cream bg-white p-2 shadow-sm">
            {GUIDE_SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left font-sans text-sm transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary-dark font-semibold text-gold'
                      : 'text-primary-dark hover:bg-cream/60'
                  }`}
                >
                  <Icon name={section.icon} className="text-lg" />
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-12">
          {GUIDE_SECTIONS.map((section) => (
            <section key={section.id} id={`guide-${section.id}`} className="scroll-mt-28 space-y-5">
              <div className="border-b border-cream pb-4">
                <div className="flex items-center gap-2">
                  <Icon name={section.icon} className="text-2xl text-gold" />
                  <h3 className="font-serif text-3xl font-light tracking-[-0.02em] text-primary-dark">
                    {section.title}
                  </h3>
                </div>
                <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-taupe">
                  {section.intro}
                </p>
              </div>

              <div className="space-y-5">
                {section.features.map((feature) => (
                  <FeatureDoc
                    key={feature.id}
                    feature={feature}
                    onNavigate={onNavigate}
                    isEarnerMode={isEarnerMode}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FeatureGuide;
