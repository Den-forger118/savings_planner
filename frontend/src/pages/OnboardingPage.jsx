import { useMemo, useState } from 'react';
import api from '../services/api';
import { ONBOARDING_CURRENCIES, formatMoney, getCurrencyByCode } from '../utils/currency';
import { getFriendlyError } from '../utils/friendlyError';
import ErrorBanner from '../components/ErrorBanner';
import ProgressBar from '../components/ProgressBar';

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
        className="flex w-full items-center justify-between rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-left font-sans text-sm transition-colors hover:border-gold focus:border-gold focus:outline-none"
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
          <div className="text-center">
            <h1 className="font-serif text-4xl font-normal tracking-[-0.03em] text-primary-dark md:text-5xl">
              Welcome to QUANT, {user.first_name}.
            </h1>
            <p className="mx-auto mt-4 max-w-md font-sans text-base text-taupe">
              Let&apos;s personalise your experience. This will only take a minute.
            </p>
            <button
              type="button"
              onClick={goNext}
              className="mt-10 rounded-lg bg-gold px-8 py-4 font-sans text-xs font-normal uppercase tracking-[0.12em] text-primary-dark transition-colors hover:bg-gold-light"
            >
              Get Started →
            </button>
          </div>
        );

      case STEP_IDS.identity:
        return (
          <div>
            <h1 className="font-serif text-4xl font-normal tracking-[-0.03em] text-primary-dark">How would you describe yourself?</h1>
            <p className="mt-3 max-w-md font-sans text-base text-taupe">
              This helps us tailor how the app works for you. You can change this anytime.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                {
                  id: 'earner',
                  icon: 'work',
                  title: 'I have an income',
                  description: 'Employed, freelancing, or receiving a regular allowance. I want to set a savings mandate from my earnings.',
                },
                {
                  id: 'non-earner',
                  icon: 'school',
                  title: 'I save when I can',
                  description: 'Student, between jobs, or no fixed income. I want to track goals without a fixed monthly commitment.',
                },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setData((prev) => ({ ...prev, mode: option.id }))}
                  className={`rounded-lg border-2 p-6 text-left transition-all ${
                    data.mode === option.id
                      ? 'border-gold bg-white shadow-lg'
                      : 'border-gray-200 bg-white hover:border-gold/50'
                  }`}
                >
                  <Icon name={option.icon} className="text-3xl text-gold" />
                  <h3 className="mt-4 font-serif text-xl font-light tracking-[-0.015em] text-primary-dark">{option.title}</h3>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-taupe">{option.description}</p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleIdentityContinue}
              className="mt-8 rounded-lg bg-gold px-8 py-4 font-sans text-xs font-normal uppercase tracking-[0.12em] text-primary-dark transition-colors hover:bg-gold-light"
            >
              Continue →
            </button>
          </div>
        );

      case STEP_IDS.income:
        return (
          <div>
            <h1 className="font-serif text-4xl font-normal tracking-[-0.03em] text-primary-dark">What is your monthly income?</h1>
            <p className="mt-3 max-w-md font-sans text-base text-taupe">
              We&apos;ll use this to suggest a healthy savings budget. You set the final amount.
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
              <p className="mt-4 font-sans text-sm text-taupe">
                💡 A healthy savings rate is 20% of income. Based on ${incomeValue.toFixed(2)}, we suggest saving ${suggestedBudget}/month.
              </p>
            )}
            <button
              type="button"
              onClick={handleIncomeContinue}
              className="mt-8 rounded-lg bg-gold px-8 py-4 font-sans text-xs font-normal uppercase tracking-[0.12em] text-primary-dark transition-colors hover:bg-gold-light"
            >
              Continue →
            </button>
          </div>
        );

      case STEP_IDS.budget:
        return (
          <div>
            <h1 className="font-serif text-4xl font-normal tracking-[-0.03em] text-primary-dark">How much can you commit to saving each month?</h1>
            <p className="mt-3 max-w-md font-sans text-base text-taupe">
              This is the total amount distributed across all your goals automatically.
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
            <p className="mt-4 font-sans text-xs text-taupe">You can change this anytime from your settings.</p>
            <button
              type="button"
              onClick={handleBudgetContinue}
              className="mt-8 rounded-lg bg-gold px-8 py-4 font-sans text-xs font-normal uppercase tracking-[0.12em] text-primary-dark transition-colors hover:bg-gold-light"
            >
              Continue →
            </button>
          </div>
        );

      case STEP_IDS.currency:
        return (
          <div>
            <h1 className="font-serif text-4xl font-normal tracking-[-0.03em] text-primary-dark">What currency do you save in?</h1>
            <p className="mt-3 max-w-md font-sans text-base text-taupe">
              All your goals and expenses will display in this currency.
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
              className="mt-8 rounded-lg bg-gold px-8 py-4 font-sans text-xs font-normal uppercase tracking-[0.12em] text-primary-dark transition-colors hover:bg-gold-light"
            >
              Continue →
            </button>
          </div>
        );

      case STEP_IDS.goal:
        return (
          <div>
            <h1 className="font-serif text-4xl font-normal tracking-[-0.03em] text-primary-dark">What are you saving towards?</h1>
            <p className="mt-3 max-w-md font-sans text-base text-taupe">
              Set your first goal now, or skip and do it from your dashboard.
            </p>
            <div className="mt-8 space-y-4">
              <div>
                <label className="mb-1 block font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                  Goal Name
                </label>
                <input
                  type="text"
                  value={goalForm.name}
                  onChange={(e) => setGoalForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 font-sans text-sm focus:border-gold focus:outline-none"
                  placeholder="e.g. Bali Trip"
                />
              </div>
              <div>
                <label className="mb-1 block font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                  Target Amount
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-money text-lg font-light tracking-[0.02em] text-gold">{data.currency_symbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={goalForm.targetAmount}
                    onChange={(e) => setGoalForm((prev) => ({ ...prev, targetAmount: e.target.value }))}
                    className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 font-sans text-sm focus:border-gold focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                  Deadline
                </label>
                <input
                  type="date"
                  value={goalForm.deadline}
                  onChange={(e) => setGoalForm((prev) => ({ ...prev, deadline: e.target.value }))}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 font-sans text-sm focus:border-gold focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleCreateGoal}
                disabled={goalSaving}
                className="rounded-lg bg-gold px-8 py-4 font-sans text-xs font-normal uppercase tracking-[0.12em] text-primary-dark transition-colors hover:bg-gold-light disabled:opacity-60"
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
          <div className="text-center">
            <h1 className="font-serif text-4xl font-normal tracking-[-0.03em] text-primary-dark">You&apos;re all set, {user.first_name}.</h1>
            <p className="mx-auto mt-4 max-w-md font-sans text-base text-taupe">
              Your QUANT dashboard is ready.
            </p>
            <div className="mx-auto mt-8 max-w-sm rounded-lg border border-cream bg-white p-6 text-left shadow-sm">
              <p className="font-sans text-sm text-primary-dark">
                <span className="font-normal uppercase tracking-[0.14em] text-taupe text-xs">Mode</span>
                <br />
                {data.mode === 'earner' ? 'Earner' : 'Non-Earner'}
              </p>
              <p className="mt-4 font-sans text-sm text-primary-dark">
                <span className="font-normal uppercase tracking-[0.14em] text-taupe text-xs">Currency</span>
                <br />
                {data.currency} ({data.currency_symbol})
              </p>
              {data.mode === 'earner' && (
                <p className="mt-4 font-sans text-sm text-primary-dark">
                  <span className="font-normal uppercase tracking-[0.14em] text-taupe text-xs">Monthly Budget</span>
                  <br />
                  {formatMoney(data.monthly_budget, data.currency, data.currency_symbol)}/month
                </p>
              )}
              {data.firstGoal && (
                <p className="mt-4 font-sans text-sm text-primary-dark">
                  <span className="font-normal uppercase tracking-[0.14em] text-taupe text-xs">First Goal</span>
                  <br />
                  {data.firstGoal.name} — {formatMoney(data.firstGoal.target_amount, data.currency, data.currency_symbol)}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={finishOnboarding}
              disabled={submitting}
              className="mt-10 rounded-lg bg-gold px-8 py-4 font-sans text-xs font-normal uppercase tracking-[0.12em] text-primary-dark transition-colors hover:bg-gold-light disabled:opacity-60"
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
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="border-b border-cream/80 bg-cream px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <p className="font-engraved text-2xl font-normal text-primary-dark">QUANT</p>
          <p className="font-sans text-xs text-taupe">
            Step {stepIndex + 1} of {totalSteps || 1}
          </p>
        </div>
        <ProgressBar
          className="mx-auto mt-3 max-w-3xl"
          value={progress}
          size="sm"
          rounded="rounded-full"
          trackClassName="bg-white"
        />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div
          className={`w-full max-w-xl transition-all duration-300 ${
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
      </main>
    </div>
  );
}

export default OnboardingPage;
