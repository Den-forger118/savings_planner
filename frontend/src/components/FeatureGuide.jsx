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
    intro:
      'QUANT is a private savings ledger: name goals, record deposits, run what-if scenarios, and track spending — with or without a fixed monthly budget.',
    features: [
      {
        id: 'earner-modes',
        title: 'Earner vs Non-Earner Mode',
        icon: 'tune',
        badge: 'Settings',
        page: 'settings-financial',
        what: 'Two savings modes that change how QUANT plans money across your goals.',
        why: 'Not everyone has a predictable monthly income. Non-Earner focuses on how much you still need to save; Earner adds monthly budget splitting and feasibility checks.',
        where: 'Settings → Financial → Savings Mode, plus the monthly budget panel on the same tab and on Dashboard.',
        who: 'Anyone. Stay on Non-Earner while cash flow is uncertain. Switch to Earner once you can commit a monthly savings amount.',
        how: [
          'Open Settings and choose Financial.',
          'Set a monthly budget if you have not already (required before Earner mode).',
          'Toggle Savings Mode to Earner or Non-Earner.',
          'Return to Dashboard or Savings Goals — allocation panels and labels update immediately.',
        ],
      },
      {
        id: 'account-basics',
        title: 'Currency, Export & Account',
        icon: 'manage_accounts',
        badge: 'Settings',
        page: 'settings',
        what: 'Display currency for amounts across the app, export your statement, and manage password and session from Settings.',
        why: 'Keep the ledger formatted for your currency, backed up when you need it, and secure on shared devices.',
        where: 'Settings → Profile (currency), Data (export), Security (password & session). Trash lives under Settings → Trash.',
        who: 'All members.',
        how: [
          'Settings → Profile → pick Display Currency and save preferences.',
          'Settings → Data → Export JSON or Export CSV for a full statement.',
          'Settings → Security to change your password or end the session.',
          'Deleted goals are restored or permanently removed from Settings → Trash.',
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: 'dashboard',
    intro: 'Your home screen for goals, allocation health, spending trends, and a quick currency check.',
    features: [
      {
        id: 'dashboard-overview',
        title: 'Dashboard Overview',
        icon: 'analytics',
        badge: 'Dashboard',
        page: 'dashboard',
        what: 'Top tiles for Monthly Budget or Total Saved, Active Goals count, and a short Insight, with shortcuts to add a goal or adjust budget.',
        why: 'See the state of your plan before opening individual goals or expenses.',
        where: 'Dashboard in the left navigation (Home on mobile).',
        who: 'All members.',
        how: [
          'Sign in — Dashboard is the default home.',
          'Read the top tiles: budget or total saved, active goals, and the insight line.',
          'Use + New Goal or budget actions when you need to adjust the plan.',
          'Scroll for the performance chart, currency check, goals overview, spending trend, and (in Earner mode) allocation sections.',
        ],
      },
      {
        id: 'goal-performance-chart',
        title: 'All Goals Overview',
        icon: 'show_chart',
        badge: 'Dashboard',
        page: 'dashboard',
        what: 'A multi-goal line chart of cumulative progress — toggle between % Progress and $ Saved.',
        why: 'Spot which goals are moving and which need attention without opening every card.',
        where: 'Dashboard → All Goals Overview (eyebrow: Cumulative Savings Performance).',
        who: 'Members with at least one savings goal.',
        how: [
          'Record deposits from Savings Goals so the chart has history.',
          'Open Dashboard and switch % Progress / $ Saved.',
          'Use the legend to focus on a specific goal.',
        ],
      },
      {
        id: 'currency-converter',
        title: 'Currency Check',
        icon: 'currency_exchange',
        badge: 'Dashboard',
        page: 'dashboard',
        what: 'A planning converter that turns an amount from one currency into another.',
        why: 'Useful when a target or trip cost is quoted in another currency.',
        where: 'Dashboard → Currency check.',
        who: 'Anyone comparing amounts across currencies.',
        how: [
          'Open Dashboard and find Currency check.',
          'Enter an amount and pick From / To currencies.',
          'Read the converted result.',
        ],
      },
      {
        id: 'goals-overview-list',
        title: 'Goals Overview List',
        icon: 'view_list',
        badge: 'Dashboard',
        page: 'dashboard',
        what: 'A compact portfolio list of your goals with progress at a glance.',
        why: 'Scan every objective without leaving the home screen.',
        where: 'Dashboard → Goals Overview.',
        who: 'Members with one or more goals.',
        how: [
          'Open Dashboard and scroll to Goals Overview.',
          'Review each goal’s progress in the list.',
          'Go to Savings Goals when you need to edit, deposit, or reorder.',
        ],
      },
      {
        id: 'budget-overview',
        title: 'Monthly Allocation & Details',
        icon: 'account_balance_wallet',
        badge: 'Earner only',
        page: 'dashboard',
        what: 'How your monthly budget is split across goals, what remains unallocated, and which goals look underfunded.',
        why: 'Shows whether the plan fits your budget and where deadlines or targets need adjusting.',
        where: 'Dashboard → Monthly Allocation and Allocation Details (Earner mode with a budget and active goals).',
        who: 'Members in Earner mode with a monthly budget set.',
        how: [
          'Enable Earner mode and set a monthly budget in Settings → Financial.',
          'Create at least one active savings goal.',
          'Open Dashboard and review Monthly Allocation, then Allocation Details for feasibility notes.',
        ],
      },
      {
        id: 'spending-analytics',
        title: 'Monthly Spending Trend',
        icon: 'bar_chart',
        badge: 'Dashboard',
        page: 'dashboard',
        what: 'A year view of total spending by month (Jan–Dec), with a year selector.',
        why: 'See how spending moves across the year. Category breakdown lives on Expense Tracker.',
        where: 'Dashboard → Monthly Spending Trend.',
        who: 'Anyone logging expenses.',
        how: [
          'Log expenses from Expense Tracker (Capital Outflow).',
          'Return to Dashboard and pick a year on Monthly Spending Trend.',
          'Open Expense Tracker for category totals and the expense list.',
        ],
      },
    ],
  },
  {
    id: 'savings-goals',
    title: 'Savings Goals',
    icon: 'payments',
    intro: 'Create objectives, track progress, and record money moving in or out of each goal on the Objective Ledger.',
    features: [
      {
        id: 'create-goal',
        title: 'Create a Goal',
        icon: 'add_circle',
        badge: 'Savings Goals',
        page: 'savings',
        what: 'Name a goal, set a target amount, and pick a deadline.',
        why: 'Cadence, progress, and allocation all start from a defined objective.',
        where: 'Savings Goals → New Goal (also + New Goal on Dashboard). You can also start a draft from the public landing page before signing up.',
        who: 'All members.',
        how: [
          'Go to Savings Goals (or use + New Goal on Dashboard).',
          'Click New Goal.',
          'Enter a name, target amount, and deadline, then create the goal.',
          'It appears on the Objective Ledger with progress and cadence.',
        ],
      },
      {
        id: 'goal-card',
        title: 'Goal Portfolio Cards',
        icon: 'credit_card',
        badge: 'Savings Goals',
        page: 'savings',
        what: 'Each goal is a card with progress, saved/remaining stats, schedule status, cadence controls, hold switch, and action menu.',
        why: 'Manage every objective from one screen.',
        where: 'Savings Goals → Objective Ledger grid.',
        who: 'All members.',
        how: [
          'Open Savings Goals — cards sort by status, then priority.',
          'Roman numerals on the navy header mark rank within active, on hold, and complete groups.',
          'Use the frequency row for daily / weekly / monthly / yearly targets.',
          'Open the ⋮ menu to edit, reorder, or move a goal to trash.',
        ],
      },
      {
        id: 'goal-priority',
        title: 'Goal Priority & Order',
        icon: 'format_list_numbered',
        badge: 'Savings Goals',
        page: 'savings',
        what: 'Set display order. First in the folio is highest intent. Order is saved per status group — active, on hold, then complete.',
        why: 'Your most important goals should lead the ledger. Priority is visual order; earner allocation still balances magnitude and urgency.',
        where: 'Savings Goals → Objective Ledger. Drag from the navy card heading, or use Move up / Move down in the ⋮ menu.',
        who: 'Anyone with more than one goal in a status group.',
        how: [
          'Open Savings Goals and find the goal you want to move.',
          'Drag from the navy heading onto another card in the same status group, or use Move up / Move down in the ⋮ menu.',
          'Completed and on-hold goals reorder within their own group.',
          'New goals are added at the end of the active list.',
        ],
      },
      {
        id: 'goal-on-hold',
        title: 'Put a Goal on Hold',
        icon: 'pause_circle',
        badge: 'Savings Goals',
        page: 'savings',
        what: 'Pause an active goal without deleting it. On-hold goals stay visible but stop accepting transactions and drop out of active allocation.',
        why: 'Shelve an objective temporarily while keeping its history.',
        where: 'Goal card navy header → hold switch (next to the ⋮ menu).',
        who: 'Anyone who needs to pause saving for a while.',
        how: [
          'Open the goal card on Savings Goals.',
          'Toggle the hold switch on the navy header.',
          'The card shows an On hold badge and cadence controls are disabled.',
          'Toggle again to resume when you are ready.',
        ],
      },
      {
        id: 'edit-goal',
        title: 'Edit a Goal',
        icon: 'edit',
        badge: 'Savings Goals',
        page: 'savings',
        what: 'Change a goal’s name, target amount, or deadline after creation.',
        why: 'Plans evolve. Editing keeps the ledger accurate without starting over.',
        where: 'Goal card ⋮ menu → Edit.',
        who: 'Anyone with an active, on-hold, or completed goal that needs correction.',
        how: [
          'Open the goal’s ⋮ menu and choose Edit.',
          'Update the name, target, or deadline in the panel.',
          'Save — cadence, allocation, and charts recalculate.',
        ],
      },
      {
        id: 'savings-cadence',
        title: 'Savings Cadence',
        icon: 'schedule',
        badge: 'All modes',
        page: 'savings',
        what: 'Daily, weekly, monthly, and yearly amounts needed to hit your deadline based on what is left to save.',
        why: 'Turns a large target into a saving rhythm you can act on.',
        where: 'On each goal card — the Daily / Weekly / Monthly / Yearly row.',
        who: 'Everyone. The Monthly Allocation panel on the card is Earner-only.',
        how: [
          'Open a goal card on Savings Goals.',
          'Use the Daily / Weekly / Monthly / Yearly buttons to pick your view.',
          'Read the amount above the frequency buttons as your personal target when you deposit.',
        ],
      },
      {
        id: 'monthly-allocation',
        title: 'Monthly Allocation & Feasibility',
        icon: 'pie_chart',
        badge: 'Earner only',
        page: 'savings',
        what: 'How much of your monthly budget is assigned to this goal and whether the plan is achievable or underfunded.',
        why: 'Prevents over-committing and flags goals that need more time or money.',
        where: 'Goal card → Monthly Allocation panel (Earner mode). Also on Dashboard under Monthly Allocation / Allocation Details.',
        who: 'Members in Earner mode with a monthly budget.',
        how: [
          'Enable Earner mode and set a budget in Settings → Financial.',
          'Open a goal card and review Monthly Allocation.',
          'Use the info control for suggestions if a goal is underfunded.',
        ],
      },
      {
        id: 'record-transaction',
        title: 'Record a Transaction',
        icon: 'swap_horiz',
        badge: 'Savings Goals',
        page: 'savings',
        what: 'Log a deposit or withdrawal against a specific goal.',
        why: 'Updates saved balance, progress, charts, and completion status.',
        where: 'Goal card footer → transaction control on the ledger band.',
        who: 'Anyone actively saving toward goals.',
        how: [
          'Open the goal card and click the transaction control on the bottom band.',
          'Enter amount, choose deposit or withdrawal, add an optional note.',
          'Submit — the card, Dashboard charts, and Activity ledger refresh.',
        ],
      },
      {
        id: 'goal-completion',
        title: 'Goal Completion',
        icon: 'celebration',
        badge: 'Savings Goals',
        page: 'savings',
        what: 'When saved amount reaches the target, the goal is marked Complete with a stamp and timestamp.',
        why: 'Marks the win and removes the goal from active allocation.',
        where: 'Automatically on the goal card when fully funded.',
        who: 'Any member who reaches a target through deposits.',
        how: [
          'Keep recording deposits until saved equals the target.',
          'A completion notice appears and the card shows a Complete badge.',
          'New transactions are blocked; use Edit in the ⋮ menu if you need to correct the goal details.',
        ],
      },
      {
        id: 'goal-trash',
        title: 'Trash & Restore',
        icon: 'delete',
        badge: 'Settings',
        page: 'settings-trash',
        what: 'Move goals to trash instead of deleting them forever. Restore later or empty trash when you are sure.',
        why: 'Protects against accidental removal while still letting you clear the ledger.',
        where: 'Delete from the goal ⋮ menu. Restore from Settings → Trash.',
        who: 'Anyone managing their Objective Ledger.',
        how: [
          'Open the goal’s ⋮ menu and choose Delete.',
          'Confirm — the goal moves to trash, not permanent deletion.',
          'Open Settings → Trash to restore a goal or empty trash permanently.',
        ],
      },
    ],
  },
  {
    id: 'simulator',
    title: 'Goal Simulator',
    icon: 'query_stats',
    intro:
      'A what-if planner for targets you have not committed to the ledger yet. Scenarios never take a budget share until you create a real goal.',
    features: [
      {
        id: 'what-if-planner',
        title: 'What-if Planner',
        icon: 'query_stats',
        badge: 'All modes',
        page: 'simulator',
        what: 'Four modes: Deadline (given a date, what cadence?), Contribution (given a savings rate, when done?), Horizon (6 / 12 / 24 months or custom), and Compare (up to three scenarios side by side).',
        why: 'Wanting $X someday is real. Undated live goals would invent a monthly need and distort earner allocation.',
        where: 'Settings → Simulator, or Savings Goals → What-if planner.',
        who: 'Anyone exploring a target before it is ready to be a goal.',
        how: [
          'Open Settings → Simulator, or click What-if planner on Savings Goals.',
          'Enter a target and optional amount already saved.',
          'Pick Deadline, Contribution, Horizon, or Compare.',
          'Read the navy result: remaining to save plus daily / weekly / monthly / yearly cadence. Nothing here is allocated.',
        ],
      },
      {
        id: 'promote-to-goal',
        title: 'Create Ledger Goal',
        icon: 'upgrade',
        badge: 'All modes',
        page: 'simulator',
        what: 'Turn a validated simulator scenario into a live Objective Ledger goal with a required name and deadline.',
        why: 'The simulator stays isolated until you are ready to commit.',
        where: 'Settings → Simulator (or What-if planner) → form below the result → Create ledger goal.',
        who: 'Anyone who has settled on a target and deadline from a what-if run.',
        how: [
          'Complete a scenario so the navy result shows valid cadence or finish date.',
          'Enter a goal name and confirm the deadline (pre-filled from the scenario when available).',
          'Click Create ledger goal — it appears on Savings Goals at the end of your active list.',
        ],
      },
    ],
  },
  {
    id: 'activity',
    title: 'Activity',
    icon: 'history',
    intro: 'The Savings Ledger — a full history of deposits and withdrawals across every goal.',
    features: [
      {
        id: 'activity-ledger',
        title: 'Savings Ledger',
        icon: 'receipt_long',
        badge: 'Activity',
        page: 'activity',
        what: 'Searchable, filterable, paginated history with goal name, amount, type, and running context — plus Export Ledger.',
        why: 'Audit savings behavior and reconcile what happened when.',
        where: 'Activity in the sidebar (page title: Savings Ledger).',
        who: 'Anyone recording goal transactions.',
        how: [
          'Open Activity from the navigation.',
          'Filter by goal (All goals), search notes or amounts, and narrow by deposit or withdrawal.',
          'Browse pages for older entries, or use Export Ledger for a downloadable copy of the filtered view.',
        ],
      },
    ],
  },
  {
    id: 'expenses',
    title: 'Expense Tracker',
    icon: 'receipt_long',
    intro: 'Capital Outflow — log day-to-day spending and see monthly totals by category.',
    features: [
      {
        id: 'log-expense',
        title: 'Log an Expense',
        icon: 'add_shopping_cart',
        badge: 'Expense Tracker',
        page: 'expenses',
        what: 'Record spending amount, category, date, and optional note.',
        why: 'Builds the spending picture used in monthly totals and the Dashboard spending trend.',
        where: 'Expense Tracker (page title: Capital Outflow) → Log Expense. Categories are managed in Settings → Financial → Category Ledger.',
        who: 'All members tracking personal spending.',
        how: [
          'Go to Expense Tracker.',
          'Click Log Expense.',
          'Pick a category, enter amount and date, add a note if helpful, then submit.',
          'To add or rename categories, open Settings → Financial → Category Ledger.',
        ],
      },
      {
        id: 'expense-summary',
        title: 'Monthly Expense Summary',
        icon: 'summarize',
        badge: 'Expense Tracker',
        page: 'expenses',
        what: 'Current-month total spent, transaction count, average per transaction, category breakdown, and the expense list.',
        why: 'See how much you have spent so far and where it went by category.',
        where: 'Expense Tracker main page (Capital Outflow).',
        who: 'Everyone tracking personal spending.',
        how: [
          'Open Expense Tracker.',
          'Review month totals, category breakdown, and the expense list.',
          'Check Dashboard → Monthly Spending Trend for the year-by-month view.',
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
                Enable Earner mode in Settings → Financial to use this feature.
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
              <strong>Create a goal</strong> — Savings Goals → New Goal (or Dashboard → + New Goal). Name, target, and deadline.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-dark font-sans text-xs font-medium text-gold">2</span>
            <span>
              <strong>Record a deposit</strong> — use the transaction control on a goal card’s bottom band when you save money.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-dark font-sans text-xs font-medium text-gold">3</span>
            <span>
              <strong>Explore a what-if</strong> — Savings Goals → What-if planner (also Settings → Simulator) before committing a target to the ledger.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-dark font-sans text-xs font-medium text-gold">4</span>
            <span>
              <strong>Log expenses</strong> — Expense Tracker → Log Expense to track spending by category.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-dark font-sans text-xs font-medium text-gold">5</span>
            <span>
              <strong>Choose your mode</strong> — Settings → Financial → set a monthly budget, then toggle Earner if you want allocation.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-dark font-sans text-xs font-medium text-gold">6</span>
            <span>
              <strong>Set goal order</strong> — drag from a card’s navy heading to rank what matters most, then check Dashboard for the full picture.
            </span>
          </li>
        </ol>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="lg:sticky lg:top-24 lg:z-10 lg:self-start">
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
