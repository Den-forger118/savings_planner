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
    intro: 'QUANT helps you plan savings goals, run what-if scenarios, track deposits, and understand spending — whether you have a fixed monthly income or not.',
    features: [
      {
        id: 'earner-modes',
        title: 'Earner vs Non-Earner Mode',
        icon: 'tune',
        badge: 'Settings',
        page: 'settings-financial',
        what: 'Two savings modes that change how the app plans and allocates money across your goals.',
        why: 'Not everyone has a predictable monthly income. Non-Earner mode focuses on what you need to save; Earner mode adds budget splitting and feasibility checks.',
        where: 'Settings → Financial → Savings Mode toggle, plus the monthly budget panel on the same tab and Dashboard.',
        who: 'Anyone. Use Non-Earner if you are still figuring out cash flow. Switch to Earner once you can commit a monthly savings amount.',
        how: [
          'Open Settings and choose Financial.',
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
        what: 'Each goal is shown as a card with progress, target/saved/remaining stats, schedule status, cadence controls, and action menu.',
        why: 'Manage every objective from one screen without losing context.',
        where: 'Savings Goals → Objective Ledger grid.',
        who: 'All members.',
        how: [
          'Open Savings Goals to see all cards sorted by status, then priority.',
          'Roman numerals on the navy header mark rank within active, on hold, and complete groups.',
          'Use the frequency row to switch daily / weekly / monthly / yearly savings targets.',
          'Open the ⋮ menu to edit, reorder, or move a goal to trash.',
        ],
      },
      {
        id: 'goal-priority',
        title: 'Goal Priority & Order',
        icon: 'format_list_numbered',
        badge: 'Savings Goals',
        page: 'savings',
        what: 'Set display order for your goals. First in the folio is highest intent. Order is saved per status group — active, on hold, then complete.',
        why: 'Your most important goals should lead the ledger. Priority is visual order only; earner allocation still balances magnitude and urgency.',
        where: 'Savings Goals → Objective Ledger. Drag from the navy card heading, or use Move up / Move down in the ⋮ menu.',
        who: 'Anyone with more than one goal in a status group.',
        how: [
          'Open Savings Goals and find the goal you want to move.',
          'Drag from the navy heading and drop on another card in the same status group, or use Move up / Move down in the ⋮ menu.',
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
        why: 'Life changes. Hold lets you shelve an objective temporarily while keeping its history intact.',
        where: 'Goal card navy header → hold switch (next to the ⋮ menu).',
        who: 'Anyone who needs to pause saving toward a goal for a while.',
        how: [
          'Open the goal card on Savings Goals.',
          'Toggle the hold switch on the navy header to put the goal on hold.',
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
        who: 'Anyone with an active or on-hold goal.',
        how: [
          'Open the goal’s ⋮ menu and choose Edit.',
          'Update the name, target, or deadline in the inline panel.',
          'Save — cadence, allocation, and charts recalculate automatically.',
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
          'Use the Daily / Weekly / Monthly / Yearly row to pick your cadence view.',
          'Read the amount shown above the frequency buttons as your personal target when you deposit.',
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
        where: 'Goal card footer → transaction icon (ledger band at the bottom).',
        who: 'Anyone actively saving toward goals.',
        how: [
          'Open the goal card and click the transaction icon on the bottom band.',
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
        id: 'goal-trash',
        title: 'Trash & Restore',
        icon: 'delete',
        badge: 'Settings',
        page: 'settings-trash',
        what: 'Move goals to trash instead of deleting them permanently. Restore later or empty trash when you are sure.',
        why: 'Protects against accidental removal while still letting you clear the ledger.',
        where: 'Delete from the goal ⋮ menu. Restore from Settings → Trash.',
        who: 'Anyone managing their objective ledger.',
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
    intro: 'A what-if planner for targets you have not committed to the ledger yet. Scenarios never take a budget share until you promote them to a real goal.',
    features: [
      {
        id: 'what-if-planner',
        title: 'What-if Planner',
        icon: 'query_stats',
        badge: 'All modes',
        page: 'simulator',
        what: 'An explorer with four modes: Deadline (given a date, what cadence?), Contribution (given a savings rate, when done?), Horizon (6 / 12 / 24 months), and Compare (up to three scenarios side by side).',
        why: 'Wanting $X someday is real. Putting undated goals on the live ledger would invent a monthly need and distort earner allocation.',
        where: 'Settings → Simulator. From Savings Goals you can also open What-if planner.',
        who: 'Anyone exploring a target before it is ready to be a goal — earner and non-earner alike.',
        how: [
          'Open Settings and choose Simulator, or click What-if planner on Savings Goals.',
          'Enter a target and optional amount already saved.',
          'Pick Deadline, Contribution, Horizon, or Compare.',
          'Read the navy result: remaining to save plus daily / weekly / monthly / yearly cadence. Nothing here is allocated.',
        ],
      },
      {
        id: 'promote-to-goal',
        title: 'Promote to Goal',
        icon: 'upgrade',
        badge: 'All modes',
        page: 'simulator',
        what: 'Turn a validated simulator scenario into a live ledger goal with a required name and deadline.',
        why: 'The simulator stays isolated until you are ready to commit. Promotion is the bridge to the Objective Ledger.',
        where: 'Settings → Simulator → promote form below the result.',
        who: 'Anyone who has settled on a target and deadline from a what-if run.',
        how: [
          'Complete a scenario so the navy result shows valid cadence or finish date.',
          'Enter a goal name and confirm the deadline (pre-filled from the scenario when available).',
          'Submit — the goal appears on Savings Goals at the end of your active list.',
        ],
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: 'settings',
    intro: 'Profile, financial engine, security, data export, and trash — everything outside the day-to-day ledger.',
    features: [
      {
        id: 'display-currency',
        title: 'Display Currency',
        icon: 'payments',
        badge: 'Profile',
        page: 'settings',
        what: 'Choose the currency and symbol used to format amounts across your ledger.',
        why: 'QUANT supports many currencies. Set yours once and every surface follows.',
        where: 'Settings → Profile → Display Currency.',
        who: 'All members.',
        how: [
          'Open Settings and choose Profile.',
          'Pick your currency from the dropdown and review the preview.',
          'Click Save Preferences.',
        ],
      },
      {
        id: 'fiscal-year',
        title: 'Fiscal Year',
        icon: 'calendar_month',
        badge: 'Financial',
        page: 'settings-financial',
        what: 'Set the month your reporting cycle begins.',
        why: 'Aligns fiscal-period views with how you actually plan, not just the calendar year.',
        where: 'Settings → Financial → Fiscal Year.',
        who: 'Anyone who reports or plans on a non-January cycle.',
        how: [
          'Open Settings and choose Financial.',
          'Pick your start month under Fiscal Year.',
          'Click Save Fiscal Settings.',
        ],
      },
      {
        id: 'category-ledger',
        title: 'Category Ledger',
        icon: 'category',
        badge: 'Financial',
        page: 'settings-financial',
        what: 'Create and customize expense categories with names and colours.',
        why: 'Categories power expense logging and the spending charts on your Dashboard.',
        where: 'Settings → Financial → Category Ledger.',
        who: 'Anyone using the Expense Tracker.',
        how: [
          'Open Settings → Financial and scroll to Category Ledger.',
          'Edit an existing category name or colour inline, or add a new category at the bottom.',
          'Return to Expense Tracker — new categories appear in the log form.',
        ],
      },
      {
        id: 'export-data',
        title: 'Export Statement',
        icon: 'download',
        badge: 'Data',
        page: 'settings-data',
        what: 'Download your full financial statement as JSON or CSV — goals, transactions, expenses, and categories.',
        why: 'Keep a personal backup or use your data in a spreadsheet.',
        where: 'Settings → Data → Export Statement.',
        who: 'Anyone who wants an offline copy of their ledger.',
        how: [
          'Open Settings and choose Data.',
          'Click Export JSON or Export CSV.',
          'Save the downloaded file to your device.',
        ],
      },
      {
        id: 'security',
        title: 'Password & Session',
        icon: 'shield',
        badge: 'Security',
        page: 'settings-security',
        what: 'View your active session, sign out, or rotate your password.',
        why: 'Keep your ledger credentials secure on shared or public devices.',
        where: 'Settings → Security.',
        who: 'All members.',
        how: [
          'Open Settings and choose Security.',
          'Review session expiry under Active Session.',
          'Use Log Out of All Devices to sign out, or update your password with the form below.',
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
              <strong>Record a deposit</strong> — click the transaction icon on a goal card when you save money.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-dark font-sans text-xs font-medium text-gold">3</span>
            <span>
              <strong>Explore a what-if</strong> — Settings → Simulator, or What-if planner on Savings Goals, before committing a target to the ledger.
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
              <strong>Choose your mode</strong> — Settings → Financial → toggle Earner if you have a monthly budget to allocate.
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
