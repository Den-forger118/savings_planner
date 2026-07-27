import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const formatDisplayDate = (value) => {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Hold / resume confirmation — matches the ledger hold dialog pattern.
 */
function HoldGoalDialog({
  open,
  mode = 'hold',
  isEarner = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const isHold = mode === 'hold';
  const [pausedSince, setPausedSince] = useState(todayInputValue());

  useEffect(() => {
    if (open && isHold) {
      setPausedSince(todayInputValue());
    }
  }, [open, isHold]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, loading, onCancel]);

  if (!open) {
    return null;
  }

  const title = isHold ? 'Hold Goal?' : 'Resume Goal?';
  const message = isHold
    ? (isEarner
      ? 'This goal will be removed from your monthly allocation. Your remaining goals will receive a higher share.'
      : 'This goal will pause schedule tracking until you resume it.')
    : (isEarner
      ? 'Your budget will be recalculated across active goals.'
      : 'Schedule tracking will resume for this goal.');
  const confirmLabel = isHold ? 'Yes, put on hold' : 'Yes, resume goal';

  const handleConfirm = () => {
    if (isHold) {
      onConfirm({ pausedAt: pausedSince });
      return;
    }
    onConfirm({});
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="presentation"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[3px]" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hold-goal-dialog-title"
        className="modal-shell"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="hold-goal-dialog-title" className="modal-title">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            disabled={loading}
            onClick={onCancel}
            className="modal-close"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-message">{message}</p>

          {isHold && (
            <div>
              <label htmlFor="hold-goal-since" className="modal-label">
                On hold since
              </label>
              <input
                id="hold-goal-since"
                type="date"
                value={pausedSince}
                max={todayInputValue()}
                onChange={(event) => setPausedSince(event.target.value)}
                disabled={loading}
                className="modal-field"
                aria-label={`On hold since ${formatDisplayDate(pausedSince)}`}
              />
            </div>
          )}

          <button
            type="button"
            disabled={loading || (isHold && !pausedSince)}
            onClick={handleConfirm}
            className="modal-submit"
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default HoldGoalDialog;
