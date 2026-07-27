import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const TONE_STYLES = {
  default: 'modal-submit',
  warning: 'modal-submit',
  danger:
    'w-full rounded-lg bg-red-700 px-4 py-3.5 font-sans text-sm font-normal text-white transition-colors hover:bg-red-800 disabled:opacity-50',
};

/**
 * In-app confirmation / alert dialog that replaces browser window.confirm / window.alert.
 *
 * @param {boolean} open
 * @param {string} title
 * @param {string|React.ReactNode} message
 * @param {string} [confirmLabel='Confirm']
 * @param {string} [cancelLabel='Cancel'] — unused visually; cancel via close / backdrop
 * @param {boolean} [hideCancel=false] — single-button alert mode (same chrome either way)
 * @param {'default'|'warning'|'danger'} [tone='default']
 * @param {boolean} [loading=false]
 * @param {() => void} onConfirm
 * @param {() => void} onCancel
 */
function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel: _cancelLabel = 'Cancel',
  hideCancel: _hideCancel = false,
  tone = 'default',
  loading = false,
  onConfirm,
  onCancel,
}) {
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

  const confirmClass = TONE_STYLES[tone] || TONE_STYLES.default;

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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="modal-shell"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="confirm-dialog-title" className="modal-title">
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
          <div id="confirm-dialog-message" className="modal-message">
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={confirmClass}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ConfirmDialog;
