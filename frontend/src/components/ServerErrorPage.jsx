const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

/**
 * Full-screen premium error state for server / network failures.
 */
function ServerErrorPage({
  title = 'A quiet pause in the ledger',
  message = 'Our servers need a moment. Your data is safe — please try again shortly.',
  onRetry,
  onHome,
  secondaryLabel,
  onSecondary,
}) {
  return (
    <div className="page-canvas relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="error-aurora absolute -left-24 top-16 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="error-aurora-delayed absolute -right-16 bottom-24 h-80 w-80 rounded-full bg-primary-dark/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
      </div>

      <div className="error-content relative z-10 w-full max-w-lg text-center">
        <p className="font-engraved text-sm tracking-[0.2em] text-gold">QUANT</p>

        <div className="mx-auto mt-10 flex h-28 w-28 items-center justify-center" aria-hidden="true">
          <div className="error-ring relative flex h-full w-full items-center justify-center">
            <span className="error-ring-orbit absolute inset-0 rounded-full border border-gold/35" />
            <span className="error-ring-orbit-slow absolute inset-2 rounded-full border border-dashed border-primary-dark/15" />
            <span className="error-pulse absolute h-3 w-3 rounded-full bg-gold" />
            <Icon name="account_balance" className="relative z-10 text-3xl text-primary-dark/80" />
          </div>
        </div>

        <h1 className="page-title mt-8 text-center">{title}</h1>
        <p className="page-lede mx-auto mt-4 text-center">{message}</p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn-navy min-w-[10rem]">
              Try again
            </button>
          )}
          {onHome && (
            <button type="button" onClick={onHome} className="btn-ghost min-w-[10rem]">
              Back to home
            </button>
          )}
          {onSecondary && (
            <button type="button" onClick={onSecondary} className="btn-ghost min-w-[10rem]">
              {secondaryLabel || 'Continue'}
            </button>
          )}
        </div>

        <p className="mt-12 font-sans text-xs font-normal uppercase tracking-[0.14em] text-taupe">
          Private savings intelligence
        </p>
      </div>
    </div>
  );
}

export default ServerErrorPage;
