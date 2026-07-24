import { useMemo, useState } from 'react';
import api from '../services/api';
import { ONBOARDING_CURRENCIES, formatMoney, getCurrencyByCode } from '../utils/currency';
import { getFriendlyError } from '../utils/friendlyError';
import ErrorBanner from '../components/ErrorBanner';
import ProgressBar from '../components/ProgressBar';
import OnboardingChapterShell from '../components/OnboardingChapterShell';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const STEP_IDS = {
  welcome: 'welcome',
  identity: 'identity',
  income: 'income',
  budget: 'budget',
  currency: 'currency',
  goal: 'goal',
  complete: 'complete',
};

function buildStepOrder(mode) {
  const steps = [STEP_IDS.welcome, STEP_IDS.identity];
  if (mode === 'earner') {
    steps.push(STEP_IDS.income, STEP_IDS.budget);
  }
  if (mode) {
    steps.push(STEP_IDS.currency, STEP_IDS.goal, STEP_IDS.complete);
  }
  return steps;
}

function CurrencyPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = getCurrencyByCode(value);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ONBOARDING_CURRENCIES;
    return ONBOARDING_CURRENCIES.filter(
      (item) =>
        item.code.toLowerCase().includes(query)
        || item.name.toLowerCase().includes(query)
        || item.symbol.includes(query)
    );
  }, [search]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-primary-dark/15 bg-white px-4 py-3 text-left font-sans text-sm transition-colors hover:border-gold focus:border-gold focus:outline-none"
      >
        <span>
          {selected.symbol} — {selected.code} — {selected.name}
        </span>
        <Icon name={open ? 'expand_less' : 'expand_more'} className="text-taupe" />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-hidden rounded-lg border border-cream bg-white shadow-xl">
          <div className="border-b border-cream p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search currency..."
              className="w-full rounded-md border border-cream px-3 py-2 font-sans text-sm focus:border-gold focus:outline-none"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.map((item) => (
              <li key={item.code}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(item);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`flex w-full px-4 py-2.5 text-left font-sans text-sm transition-colors hover:bg-cream/60 ${
                    item.code === value ? 'bg-cream/80 font-normal text-primary-dark' : 'text-taupe'
                  }`}
                >
                  {item.symbol} — {item.code} — {item.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function OnboardingPage({ user, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [data, setData] = useState({
    mode: null,
    monthly_income: '',
    monthly_budget: '',
    currency: 'USD',
    currency_symbol: '$',
    firstGoal: null,
  });

  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
  });
  const [goalSaving, setGoalSaving] = useState(false);

  const steps = useMemo(() => buildStepOrder(data.mode), [data.mode]);
  const currentStepId = steps[stepIndex] || STEP_IDS.welcome;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  const incomeValue = parseFloat(data.monthly_income) || 0;
  const suggestedBudget = incomeValue > 0 ? (incomeValue * 0.2).toFixed(2) : '0.00';

  const goToStep = (nextIndex) => {
    setTransitioning(true);
    setTimeout(() => {
      setStepIndex(nextIndex);
      setTransitioning(false);
    }, 180);
  };

  const goNext = () => {
    if (stepIndex < steps.length - 1) {
      goToStep(stepIndex + 1);
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      goToStep(stepIndex - 1);
    }
  };

  const handleIdentityContinue = () => {
    if (!data.mode) {
      setError('Please select how you save.');
      return;
    }
    setError(null);
    const order = buildStepOrder(data.mode);
    const nextId = data.mode === 'earner' ? STEP_IDS.income : STEP_IDS.currency;
    goToStep(order.indexOf(nextId));
  };

  const handleIncomeContinue = () => {
    if (!data.monthly_income || parseFloat(data.monthly_income) <= 0) {
      setError('Please enter your monthly income.');
      return;
    }
    setError(null);
    if (!data.monthly_budget) {
      setData((prev) => ({ ...prev, monthly_budget: suggestedBudget }));
    }
    goNext();
  };

  const handleBudgetContinue = () => {
    if (!data.monthly_budget || parseFloat(data.monthly_budget) <= 0) {
      setError('Please enter a monthly savings budget.');
      return;
    }
    setError(null);
    goNext();
  };

  const handleCreateGoal = async () => {
    if (!goalForm.name.trim() || !goalForm.targetAmount || !goalForm.deadline) {
      setError('Please fill in all goal fields or skip for now.');
      return;
    }

    setGoalSaving(true);
    setError(null);

    try {
      await api.post('/goals', {
        userId: user.user_id,
        name: goalForm.name.trim(),
        targetAmount: parseFloat(goalForm.targetAmount),
        deadline: goalForm.deadline,
      });

      setData((prev) => ({
        ...prev,
        firstGoal: {
          name: goalForm.name.trim(),
          target_amount: parseFloat(goalForm.targetAmount),
        },
      }));
      goNext();
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t create that goal. Please try again.'));
    } finally {
      setGoalSaving(false);
    }
  };

  const finishOnboarding = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        mode: data.mode,
        currency: data.currency,
        currency_symbol: data.currency_symbol,
        onboarding_complete: true,
      };

      if (data.mode === 'earner') {
        payload.monthly_income = parseFloat(data.monthly_income);
        payload.monthly_budget = parseFloat(data.monthly_budget);
      }

      const response = await api.put(`/users/${user.user_id}/onboarding`, payload);
      onComplete(response.data.user);
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t finish setting up your account. Please try again.'));
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStepId) {
      case STEP_IDS.welcome:
        return (
          <div>
            <p className="font-sans text-xs font-normal uppercase tracking-[0.14em] text-gold">
              Welcome
            </p>
            <h2 className="mt-2 font-serif text-3xl font-light tracking-[-0.025em] text-primary-dark sm:text-4xl">
              Hello, {user.first_name}.
            </h2>
            <p className="mt-3 font-sans text-[15px] font-light leading-relaxed text-taupe">
              Let&apos;s personalise your ledger. This will only take a minute.
            </p>
            <button
              type="button"
              onClick={goNext}
              className="btn-navy mt-10 w-full py-3 text-white sm:w-auto sm:px-10"
            >
              Begin →
            </button>
          </div>
        );

      case STEP_IDS.identity:
        return (
          <div>
            <p className="font-sans text-xs font-normal uppercase tracking-[0.14em] text-gold">
              Identity
            </p>
            <h2 className="mt-2 font-serif text-3xl font-light tracking-[-0.025em] text-primary-dark sm:text-4xl">
              How do you save?
            </h2>
            <p className="mt-3 font-sans text-[15px] font-light leading-relaxed text-taupe">
              This shapes how QUANT works for you. You can change it anytime.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                {
                  id: 'earner',
                  icon: 'work',
                  title: 'I have an income',
                  description: 'Set a savings mandate from regular earnings.',
                },
                {
                  id: 'non-earner',
                  icon: 'school',
                  title: 'I save when I can',
                  description: 'Track goals without a fixed monthly commitment.',
                },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setData((prev) => ({ ...prev, mode: option.id }))}
                  className={`rounded-lg border p-5 text-left transition-all ${
                    data.mode === option.id
                      ? 'border-gold bg-cream/40 shadow-soft'
                      : 'border-primary-dark/12 bg-white hover:border-gold/50'
                  }`}
                >
                  <Icon name={option.icon} className="text-2xl text-gold" />
                  <h3 className="mt-3 font-serif text-lg font-light tracking-[-0.015em] text-primary-dark">
                    {option.title}
                  </h3>
                  <p className="mt-1.5 font-sans text-sm font-light leading-relaxed text-taupe">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleIdentityContinue}
              className="btn-navy mt-8 w-full py-3 text-white sm:w-auto sm:px-10"
            >
              Continue →
            </button>
          </div>
        );

      case STEP_IDS.income:
        return (
          <div>
            <p className="font-sans text-xs font-normal uppercase tracking-[0.14em] text-gold">
              Income
            </p>
            <h2 className="mt-2 font-serif text-3xl font-light tracking-[-0.025em] text-primary-dark sm:text-4xl">
              Monthly income
            </h2>
            <p className="mt-3 font-sans text-[15px] font-light leading-relaxed text-taupe">
              We&apos;ll suggest a healthy savings rate. You set the final amount.
            </p>
            <div className="mt-8 flex items-center gap-2">
              <span className="font-money text-3xl font-light tracking-[0.02em] text-gold">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={data.monthly_income}
                onChange={(e) => setData((prev) => ({ ...prev, monthly_income: e.target.value }))}
                className="w-full border-b-2 border-primary-dark bg-transparent py-2 font-money text-4xl font-light tracking-[0.02em] text-primary-dark focus:border-gold focus:outline-none"
                placeholder="0.00"
              />
            </div>
            {incomeValue > 0 && (
              <p className="mt-4 font-sans text-sm font-light leading-relaxed text-taupe">
                A common starting point is 20% of income — about{' '}
                <span className="font-money text-primary-dark">${suggestedBudget}</span> / month.
              </p>
            )}
            <button
              type="button"
              onClick={handleIncomeContinue}
              className="btn-navy mt-8 w-full py-3 text-white sm:w-auto sm:px-10"
            >
              Continue →
            </button>
          </div>
        );

      case STEP_IDS.budget:
        return (
          <div>
            <p className="font-sans text-xs font-normal uppercase tracking-[0.14em] text-gold">
              Budget
            </p>
            <h2 className="mt-2 font-serif text-3xl font-light tracking-[-0.025em] text-primary-dark sm:text-4xl">
              Monthly savings commitment
            </h2>
            <p className="mt-3 font-sans text-[15px] font-light leading-relaxed text-taupe">
              This total is distributed across your goals automatically.
            </p>
            <div className="mt-8 flex items-center gap-2">
              <span className="font-money text-3xl font-light tracking-[0.02em] text-gold">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={data.monthly_budget || suggestedBudget}
                onChange={(e) => setData((prev) => ({ ...prev, monthly_budget: e.target.value }))}
                className="w-full border-b-2 border-primary-dark bg-transparent py-2 font-money text-4xl font-light tracking-[0.02em] text-primary-dark focus:border-gold focus:outline-none"
              />
              <span className="shrink-0 font-sans text-sm text-taupe">/month</span>
            </div>
            <p className="mt-4 font-sans text-xs text-taupe">You can change this anytime in Settings.</p>
            <button
              type="button"
              onClick={handleBudgetContinue}
              className="btn-navy mt-8 w-full py-3 text-white sm:w-auto sm:px-10"
            >
              Continue →
            </button>
          </div>
        );

      case STEP_IDS.currency:
        return (
          <div>
            <p className="font-sans text-xs font-normal uppercase tracking-[0.14em] text-gold">
              Currency
            </p>
            <h2 className="mt-2 font-serif text-3xl font-light tracking-[-0.025em] text-primary-dark sm:text-4xl">
              Unit of account
            </h2>
            <p className="mt-3 font-sans text-[15px] font-light leading-relaxed text-taupe">
              Goals and expenses will display in this currency.
            </p>
            <div className="mt-8">
              <CurrencyPicker
                value={data.currency}
                onChange={(item) => setData((prev) => ({
                  ...prev,
                  currency: item.code,
                  currency_symbol: item.symbol,
                }))}
              />
            </div>
            <button
              type="button"
              onClick={goNext}
              className="btn-navy mt-8 w-full py-3 text-white sm:w-auto sm:px-10"
            >
              Continue →
            </button>
          </div>
        );

      case STEP_IDS.goal:
        return (
          <div>
            <p className="font-sans text-xs font-normal uppercase tracking-[0.14em] text-gold">
              First goal
            </p>
            <h2 className="mt-2 font-serif text-3xl font-light tracking-[-0.025em] text-primary-dark sm:text-4xl">
              What are you saving towards?
            </h2>
            <p className="mt-3 font-sans text-[15px] font-light leading-relaxed text-taupe">
              Set your first objective now, or skip and add it from the dashboard.
            </p>
            <div className="mt-8 space-y-4">
              <div>
                <label className="field-label">Goal Name</label>
                <input
                  type="text"
                  value={goalForm.name}
                  onChange={(e) => setGoalForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="field"
                  placeholder="e.g. Bali Trip"
                />
              </div>
              <div>
                <label className="field-label">Target Amount</label>
                <div className="flex items-center gap-2">
                  <span className="font-money text-lg font-light tracking-[0.02em] text-gold">
                    {data.currency_symbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={goalForm.targetAmount}
                    onChange={(e) => setGoalForm((prev) => ({ ...prev, targetAmount: e.target.value }))}
                    className="field"
                  />
                </div>
              </div>
              <div>
                <label className="field-label">Deadline</label>
                <input
                  type="date"
                  value={goalForm.deadline}
                  onChange={(e) => setGoalForm((prev) => ({ ...prev, deadline: e.target.value }))}
                  min={new Date().toISOString().slice(0, 10)}
                  className="field"
                />
              </div>
            </div>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleCreateGoal}
                disabled={goalSaving}
                className="btn-navy py-3 text-white sm:px-8"
              >
                {goalSaving ? 'Creating…' : 'Create Goal & Continue →'}
              </button>
              <button
                type="button"
                onClick={goNext}
                className="font-sans text-sm font-normal text-taupe transition-colors hover:text-primary-dark"
              >
                Skip for now →
              </button>
            </div>
          </div>
        );

      case STEP_IDS.complete:
        return (
          <div>
            <p className="font-sans text-xs font-normal uppercase tracking-[0.14em] text-gold">
              Ready
            </p>
            <h2 className="mt-2 font-serif text-3xl font-light tracking-[-0.025em] text-primary-dark sm:text-4xl">
              You&apos;re all set, {user.first_name}.
            </h2>
            <p className="mt-3 font-sans text-[15px] font-light leading-relaxed text-taupe">
              Your QUANT dashboard is ready.
            </p>
            <div className="mt-8 space-y-4 border-t border-primary-dark/10 pt-6">
              <div>
                <p className="font-sans text-xs uppercase tracking-[0.14em] text-taupe">Mode</p>
                <p className="mt-1 font-sans text-sm text-primary-dark">
                  {data.mode === 'earner' ? 'Earner' : 'Non-Earner'}
                </p>
              </div>
              <div>
                <p className="font-sans text-xs uppercase tracking-[0.14em] text-taupe">Currency</p>
                <p className="mt-1 font-sans text-sm text-primary-dark">
                  {data.currency} ({data.currency_symbol})
                </p>
              </div>
              {data.mode === 'earner' && (
                <div>
                  <p className="font-sans text-xs uppercase tracking-[0.14em] text-taupe">Monthly Budget</p>
                  <p className="mt-1 font-money text-sm font-light text-primary-dark">
                    {formatMoney(data.monthly_budget, data.currency, data.currency_symbol)}/month
                  </p>
                </div>
              )}
              {data.firstGoal && (
                <div>
                  <p className="font-sans text-xs uppercase tracking-[0.14em] text-taupe">First Goal</p>
                  <p className="mt-1 font-sans text-sm text-primary-dark">
                    {data.firstGoal.name} —{' '}
                    <span className="font-money font-light">
                      {formatMoney(data.firstGoal.target_amount, data.currency, data.currency_symbol)}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={finishOnboarding}
              disabled={submitting}
              className="btn-navy mt-10 w-full py-3 text-white sm:w-auto sm:px-10"
            >
              {submitting ? 'Setting up…' : 'Go to Dashboard →'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <OnboardingChapterShell
      stepId={currentStepId}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      progress={progress}
      ProgressBarComponent={(
        <ProgressBar
          value={progress}
          size="sm"
          rounded="rounded-full"
          trackClassName="bg-cream/15"
          fillClassName="bg-gold"
        />
      )}
    >
      <div
        className={`transition-all duration-300 ${
          transitioning ? 'translate-y-1 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        {error && <ErrorBanner className="mb-6" message={error} />}

        {stepIndex > 0 && currentStepId !== STEP_IDS.complete && (
          <button
            type="button"
            onClick={goBack}
            className="mb-6 flex items-center gap-1 font-sans text-sm text-taupe transition-colors hover:text-primary-dark"
          >
            ← Back
          </button>
        )}

        {renderStep()}
      </div>
    </OnboardingChapterShell>
  );
}

export default OnboardingPage;
