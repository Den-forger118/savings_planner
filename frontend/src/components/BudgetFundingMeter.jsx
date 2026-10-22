import { formatMoney } from '../utils/currency';

/**
 * Month-to-date inbound funding vs monthly budget target.
 * Separate from Earner plan-feasibility (“underfunded goals”).
 */
function BudgetFundingMeter({
  progress,
  currencyCode = 'GHS',
  currencySymbol = '₵',
  compact = false,
  onOpenFunding,
  onEditBudget,
}) {
  if (!progress) return null;

  const money = (value) => formatMoney(value, currencyCode, currencySymbol);
  const funded = Number(progress.funded_mtd) || 0;
  const budget = Number(progress.monthly_budget) || 0;
  const status = progress.status || 'no_budget';
  const periodLabel = progress.period?.label || 'This month';

  const pct =
    budget > 0 ? Math.min(100, Math.round((funded / budget) * 100)) : funded > 0 ? 100 : 0;

  let title = 'This month’s funding';
  let body = '';
  if (status === 'no_budget') {
    if (!progress.is_earner) {
      title = 'Monthly target off';
      body = `Inbound transfers this month: ${money(funded)}. Turn on Earner and set a monthly budget to compare plan vs cash in.`;
    } else {
      title = 'Set a monthly budget';
      body = `You’ve brought in ${money(funded)} this month. Add a budget so QUANT can show whether you’re on plan.`;
    }
  } else if (status === 'behind') {
    title = 'Behind this month’s budget';
    body = `${money(funded)} of ${money(budget)} transferred in — ${money(progress.remaining)} left to meet your plan.`;
  } else if (status === 'ahead') {
    title = 'Ahead of this month’s budget';
    body = `${money(funded)} of ${money(budget)} transferred in — ${money(progress.surplus)} above your plan.`;
  } else {
    title = 'On track this month';
    body = `${money(funded)} of ${money(budget)} transferred in — monthly plan met.`;
  }

  return (
    <div className={compact ? 'space-y-2' : 'surface space-y-3 px-5 py-4'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{periodLabel}</p>
          <h3 className={`mt-1 font-sans ${compact ? 'text-sm' : 'text-base'} font-normal text-primary-dark`}>
            {title}
          </h3>
          <p className="mt-1 font-sans text-sm leading-relaxed text-taupe">{body}</p>
          <p className="mt-2 font-sans text-xs text-taupe">
            Counts successful transfers into QUANT (transfer account). Manual ledger entries and goal
            plan shares do not count here.
          </p>
        </div>
        {(onOpenFunding || onEditBudget) && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {status === 'no_budget' && onEditBudget && (
              <button type="button" className="btn-ghost h-9 text-xs" onClick={onEditBudget}>
                Set budget
              </button>
            )}
            {onOpenFunding && (
              <button type="button" className="btn-ghost h-9 text-xs" onClick={onOpenFunding}>
                Funding
              </button>
            )}
          </div>
        )}
      </div>

      {budget > 0 && (
        <div>
          <div className="mb-1.5 flex justify-between font-sans text-xs text-taupe">
            <span>{money(funded)} in</span>
            <span>{pct}%</span>
            <span>{money(budget)} target</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-primary-dark/10">
            <div
              className={`h-full rounded-full transition-all ${
                status === 'behind'
                  ? 'bg-taupe'
                  : status === 'ahead'
                    ? 'bg-gold'
                    : 'bg-primary-dark'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetFundingMeter;
