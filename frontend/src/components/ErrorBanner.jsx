/**
 * Calm inline alert for forms and panels.
 */
function ErrorBanner({ message, className = '' }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`rounded-lg border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-left ${className}`}
    >
      <p className="font-sans text-sm font-light leading-relaxed text-red-800">{message}</p>
    </div>
  );
}

export default ErrorBanner;
