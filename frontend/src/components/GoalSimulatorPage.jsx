/*
  THESIS: A what-if folio that solves cadence or date without pretending to be a ledger goal. Refuses undated live goals and allocation math.
  OWN-WORLD: QUANT navy / gold / cream; serif titles, sans labels, mono money; white surfaces and one navy result island.
  STORY: Member enters a target, fixes one known (date, contribution, or horizon), reads the other, optionally compares, then promotes with a required deadline.
  FIRST VIEWPORT: Eyebrow + title + lede; scenario notice; inputs left / navy result right; promote waits until a scenario is valid.
  FORM: Operate extension of Objective Ledger. Precisely specified; no concept seed.
*/
import { useMemo, useState } from 'react';
import api from '../services/api';
import { formatMoney } from '../utils/currency';
import { getFriendlyError } from '../utils/friendlyError';
import {
  FREQUENCIES,
  HORIZON_PRESETS,
  SIM_MODES,
  simulate,
  todayInputValue,
} from '../utils/goalSimulator';
import ErrorBanner from './ErrorBanner';

const emptyCompareRow = (id) => ({
  id,
  mode: id === 3 ? 'horizon' : 'contribution',
  deadline: '',
  contributionAmount: id === 1 ? '150' : '300',
  contributionFrequency: 'monthly',
  horizonMonths: '12',
  label: id === 1 ? 'A' : id === 2 ? 'B' : 'C',
});

const formatLongDate = (value) => {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

function ModeSwitch({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" role="tablist" aria-label="Scenario mode">
      {SIM_MODES.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={active ? 'btn-navy min-h-[44px]' : 'btn-ghost min-h-[44px]'}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function CadenceGrid({ cadence, money }) {
  const cells = [
    ['Daily', cadence?.daily],
    ['Weekly', cadence?.weekly],
    ['Monthly', cadence?.monthly],
    ['Yearly', cadence?.yearly],
  ];

  return (
    <div className="grid grid-cols-2 gap-px bg-cream/10">
      {cells.map(([label, amount]) => (
        <div key={label} className="bg-[#101826] px-4 py-3">
          <p className="font-sans text-[10px] font-normal uppercase tracking-[0.14em] text-gold">
            {label}
          </p>
          <p className="mt-1 font-money text-lg font-light text-cream">
            {amount > 0 ? money(amount) : '—'}
          </p>
        </div>
      ))}
    </div>
  );
}

function ScenarioFields({ values, onChange, minDate }) {
  if (values.mode === 'deadline') {
    return (
      <div>
        <label className="field-label" htmlFor={`sim-deadline-${values.id || 'main'}`}>
          Deadline
        </label>
        <input
          id={`sim-deadline-${values.id || 'main'}`}
          type="date"
          min={minDate}
          value={values.deadline}
          onChange={(event) => onChange({ deadline: event.target.value })}
          className="field"
        />
      </div>
    );
  }

  if (values.mode === 'contribution') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`sim-amount-${values.id || 'main'}`}>
            I can save
          </label>
          <input
            id={`sim-amount-${values.id || 'main'}`}
            type="number"
            min="0"
            step="0.01"
            value={values.contributionAmount}
            onChange={(event) => onChange({ contributionAmount: event.target.value })}
            className="field"
          />
        </div>
        <div>
          <p className="field-label">Each</p>
          <div className="grid grid-cols-2 gap-2">
            {FREQUENCIES.map((item) => {
              const active = values.contributionFrequency === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ contributionFrequency: item.id })}
                  className={active ? 'btn-navy min-h-[44px] text-[10px]' : 'btn-ghost min-h-[44px] text-[10px]'}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="field-label">Horizon</p>
      <div className="flex flex-wrap gap-2">
        {HORIZON_PRESETS.map((months) => {
          const active = String(values.horizonMonths) === String(months);
          return (
            <button
              key={months}
              type="button"
              onClick={() => onChange({ horizonMonths: String(months) })}
              className={active ? 'btn-navy min-h-[44px]' : 'btn-ghost min-h-[44px]'}
            >
              {months} months
            </button>
          );
        })}
      </div>
      <label className="field-label mt-4" htmlFor={`sim-horizon-${values.id || 'main'}`}>
        Custom months
      </label>
      <input
        id={`sim-horizon-${values.id || 'main'}`}
        type="number"
        min="1"
        step="1"
        value={values.horizonMonths}
        onChange={(event) => onChange({ horizonMonths: event.target.value })}
        className="field"
      />
    </div>
  );
}

function ResultPanel({ result, money, isEarnerMode }) {
  if (!result) {
    return (
      <div className="surface-navy p-5 md:p-6">
        <p className="font-sans text-xs font-normal uppercase tracking-[0.16em] text-gold">
          Scenario
        </p>
        <h3 className="mt-3 font-serif text-2xl font-light text-cream">Waiting for a target</h3>
        <p className="mt-3 max-w-sm font-sans text-[15px] font-light leading-relaxed text-cream/60">
          Fix one known — a date, a contribution, or a horizon — and QUANT will solve for the other.
        </p>
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div className="surface-navy p-5 md:p-6">
        <p className="font-sans text-xs font-normal uppercase tracking-[0.16em] text-gold">
          Scenario
        </p>
        <h3 className="mt-3 font-serif text-2xl font-light text-cream">Incomplete</h3>
        <p className="mt-3 font-sans text-[15px] font-light leading-relaxed text-cream/70">
          {result.error}
        </p>
      </div>
    );
  }

  if (result.met) {
    return (
      <div className="surface-navy p-5 md:p-6">
        <p className="font-sans text-xs font-normal uppercase tracking-[0.16em] text-gold">
          Scenario
        </p>
        <h3 className="mt-3 font-serif text-2xl font-light text-cream">Already funded</h3>
        <p className="mt-3 font-sans text-[15px] font-light leading-relaxed text-cream/70">
          {result.message}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card">
      <div className="surface-navy rounded-none p-5 md:p-6">
        <p className="font-sans text-xs font-normal uppercase tracking-[0.16em] text-gold">
          Scenario — not ledger
        </p>
        <p className="mt-4 font-sans text-[10px] font-normal uppercase tracking-[0.14em] text-cream/45">
          Remaining to save
        </p>
        <p className="mt-1 font-money text-3xl font-light tracking-[0.02em] text-cream">
          {money(result.remaining)}
        </p>
        <p className="mt-4 font-sans text-[15px] font-light leading-relaxed text-cream/70">
          {result.kind === 'date'
            ? `Estimated completion ${formatLongDate(result.finishDate)} · ${result.days} days`
            : `Cadence across ${result.days} days · through ${formatLongDate(result.finishDate)}`}
        </p>
      </div>
      <CadenceGrid cadence={result.cadence} money={money} />
      <div className="bg-[#0A0F1A] px-5 py-4">
        <p className="font-sans text-xs font-light leading-relaxed text-cream/55">
          {isEarnerMode
            ? 'This explorer does not take a share of monthly budget. Allocation begins only after it becomes a ledger goal.'
            : 'This explorer is a scenario only. Creating a goal is what places it on the Objective Ledger.'}
        </p>
      </div>
    </div>
  );
}

function GoalSimulatorPage({
  user,
  isEarnerMode = false,
  currencyCode = 'USD',
  currencySymbol = '$',
  onGoalCreated,
  onOpenLedger,
  embedded = false,
}) {
  const minDate = todayInputValue();
  const money = (value) => formatMoney(value, currencyCode, currencySymbol);

  const [targetAmount, setTargetAmount] = useState('');
  const [savedAmount, setSavedAmount] = useState('');
  const [mode, setMode] = useState('deadline');
  const [deadline, setDeadline] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionFrequency, setContributionFrequency] = useState('monthly');
  const [horizonMonths, setHorizonMonths] = useState('12');
  const [compareRows, setCompareRows] = useState([emptyCompareRow(1), emptyCompareRow(2)]);

  const [goalName, setGoalName] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [promoteError, setPromoteError] = useState(null);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteOk, setPromoteOk] = useState(null);

  const mainValues = {
    id: 'main',
    mode,
    deadline,
    contributionAmount,
    contributionFrequency,
    horizonMonths,
  };

  const result = useMemo(() => {
    if (!targetAmount || mode === 'compare') return null;
    return simulate({
      targetAmount,
      savedAmount,
      mode,
      deadline,
      contributionAmount,
      contributionFrequency,
      horizonMonths,
    });
  }, [targetAmount, savedAmount, mode, deadline, contributionAmount, contributionFrequency, horizonMonths]);

  const compareResults = useMemo(
    () =>
      compareRows.map((row) => ({
        row,
        result: targetAmount
          ? simulate({
              targetAmount,
              savedAmount,
              mode: row.mode,
              deadline: row.deadline,
              contributionAmount: row.contributionAmount,
              contributionFrequency: row.contributionFrequency,
              horizonMonths: row.horizonMonths,
            })
          : null,
      })),
    [compareRows, savedAmount, targetAmount]
  );

  const derivedDeadline =
    mode === 'compare'
      ? compareResults.find((item) => item.result?.ok && item.result.finishDate)?.result.finishDate || ''
      : result?.ok && result.finishDate
        ? result.finishDate
        : '';

  const handlePromote = async (event) => {
    event.preventDefault();
    setPromoteError(null);
    setPromoteOk(null);

    const name = goalName.trim();
    const chosenDeadline = goalDeadline || derivedDeadline;

    if (!name || !targetAmount || !chosenDeadline) {
      setPromoteError('A name, target, and deadline are required to enter the ledger.');
      return;
    }
    if (Number.parseFloat(targetAmount) <= 0) {
      setPromoteError('Target amount must be greater than zero.');
      return;
    }
    if (chosenDeadline < minDate) {
      setPromoteError('Deadline cannot be in the past.');
      return;
    }

    setPromoteLoading(true);
    try {
      await api.post('/goals', {
        userId: user.user_id,
        name,
        targetAmount: Number.parseFloat(targetAmount),
        deadline: chosenDeadline,
      });
      setPromoteOk('Ledger goal created. It now sits on the Objective Ledger.');
      setGoalName('');
      onGoalCreated?.();
    } catch (err) {
      setPromoteError(getFriendlyError(err, 'We couldn’t create that goal. Please try again.'));
    } finally {
      setPromoteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {embedded ? (
        <div>
          <h3 className="card-title">What-if Planner</h3>
          <p className="mt-1 max-w-2xl font-sans text-sm text-taupe">
            Explore a target without a ledger date. Nothing here claims a budget share until you turn it into a goal.
          </p>
        </div>
      ) : (
        <section className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Goal Simulator</p>
            <h2 className="page-title">What-if Planner</h2>
            <p className="page-lede">
              Explore a target without a ledger date. Nothing here claims a budget share until you turn it into a goal.
            </p>
          </div>
          {onOpenLedger ? (
            <button type="button" className="btn-ghost min-h-[44px]" onClick={onOpenLedger}>
              Open Objective Ledger
            </button>
          ) : null}
        </section>
      )}

      <div className="surface-navy px-5 py-4">
        <p className="font-sans text-[15px] font-light leading-relaxed text-cream/80">
          <span className="font-normal text-gold">Scenario, not ledger.</span>{' '}
          Live goals still require a deadline. This page only solves what cadence or date a target would imply.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className={`surface space-y-5 p-5 ${mode === 'compare' ? 'lg:col-span-12' : 'lg:col-span-7'}`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="sim-target">
                Target amount
              </label>
              <input
                id="sim-target"
                type="number"
                min="0"
                step="0.01"
                value={targetAmount}
                onChange={(event) => setTargetAmount(event.target.value)}
                placeholder={`${currencySymbol}8000`}
                className="field"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="sim-saved">
                Already saved <span className="font-light">(optional)</span>
              </label>
              <input
                id="sim-saved"
                type="number"
                min="0"
                step="0.01"
                value={savedAmount}
                onChange={(event) => setSavedAmount(event.target.value)}
                placeholder={`${currencySymbol}0`}
                className="field"
              />
            </div>
          </div>

          <ModeSwitch value={mode} onChange={setMode} />

          {mode !== 'compare' ? (
            <ScenarioFields
              values={mainValues}
              minDate={minDate}
              onChange={(patch) => {
                if (patch.deadline !== undefined) setDeadline(patch.deadline);
                if (patch.contributionAmount !== undefined) setContributionAmount(patch.contributionAmount);
                if (patch.contributionFrequency !== undefined) setContributionFrequency(patch.contributionFrequency);
                if (patch.horizonMonths !== undefined) setHorizonMonths(patch.horizonMonths);
              }}
            />
          ) : (
            <div className="space-y-4">
              {compareResults.map(({ row }, index) => (
                <div key={row.id} className="rounded-lg border border-primary-dark/10 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="font-sans text-xs font-normal uppercase tracking-[0.16em] text-gold">
                      Scenario {row.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {['deadline', 'contribution', 'horizon'].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            setCompareRows((rows) =>
                              rows.map((entry) =>
                                entry.id === row.id ? { ...entry, mode: item } : entry
                              )
                            );
                          }}
                          className={
                            row.mode === item
                              ? 'btn-navy min-h-9 px-3 text-[10px]'
                              : 'btn-ghost min-h-9 px-3 text-[10px]'
                          }
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ScenarioFields
                    values={row}
                    minDate={minDate}
                    onChange={(patch) => {
                      setCompareRows((rows) =>
                        rows.map((entry) => (entry.id === row.id ? { ...entry, ...patch } : entry))
                      );
                    }}
                  />
                  {index > 1 ? (
                    <button
                      type="button"
                      className="btn-ghost mt-4 min-h-[44px]"
                      onClick={() =>
                        setCompareRows((rows) => rows.filter((entry) => entry.id !== row.id))
                      }
                    >
                      Remove scenario
                    </button>
                  ) : null}
                </div>
              ))}
              {compareRows.length < 3 ? (
                <button
                  type="button"
                  className="btn-ghost min-h-[44px]"
                  onClick={() =>
                    setCompareRows((rows) => [...rows, emptyCompareRow(rows.length + 1)])
                  }
                >
                  Add a scenario
                </button>
              ) : null}
            </div>
          )}
        </div>

        <div className={mode === 'compare' ? 'lg:col-span-12' : 'lg:col-span-5'}>
          {mode === 'compare' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {compareResults.map(({ row, result: scenarioResult }) => (
                <div key={row.id}>
                  <p className="mb-2 font-sans text-xs font-normal uppercase tracking-[0.14em] text-taupe">
                    Scenario {row.label}
                  </p>
                  <ResultPanel result={scenarioResult} money={money} isEarnerMode={isEarnerMode} />
                </div>
              ))}
            </div>
          ) : (
            <ResultPanel result={result} money={money} isEarnerMode={isEarnerMode} />
          )}
        </div>
      </div>

      <section className="surface p-5">
        <p className="eyebrow">Ledger</p>
        <h3 className="mt-1 card-title">Turn this into a goal</h3>
        <p className="mt-2 max-w-2xl font-sans text-[15px] font-light leading-relaxed text-taupe">
          A deadline is required before it can join the portfolio
          {isEarnerMode ? ' or take part in monthly allocation' : ''}.
        </p>

        <form onSubmit={handlePromote} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="sim-goal-name">
              Goal name
            </label>
            <input
              id="sim-goal-name"
              type="text"
              value={goalName}
              onChange={(event) => setGoalName(event.target.value)}
              placeholder="e.g., House deposit"
              className="field"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="sim-goal-deadline">
              Deadline
            </label>
            <input
              id="sim-goal-deadline"
              type="date"
              min={minDate}
              value={goalDeadline || derivedDeadline}
              onChange={(event) => setGoalDeadline(event.target.value)}
              className="field"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={promoteLoading} className="btn-navy min-h-[44px] w-full">
              {promoteLoading ? 'Creating…' : 'Create ledger goal'}
            </button>
          </div>
        </form>

        {promoteError ? <ErrorBanner className="mt-4" message={promoteError} /> : null}
        {promoteOk ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary-dark/10 px-3.5 py-2.5">
            <p className="font-sans text-[15px] font-light text-primary-dark">{promoteOk}</p>
            {onOpenLedger ? (
              <button type="button" className="btn-ghost min-h-[44px]" onClick={onOpenLedger}>
                View ledger
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default GoalSimulatorPage;
