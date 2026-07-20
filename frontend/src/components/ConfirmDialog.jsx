import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const TONE_STYLES = {
  default: {
    confirm: 'bg-gold text-primary-dark hover:bg-gold-light',
    accent: 'bg-gold',
    eyebrow: 'Confirmation',
  },
  warning: {
    confirm: 'bg-gold text-primary-dark hover:bg-gold-light',
    accent: 'bg-gold',
    eyebrow: 'Confirm action',
  },
  danger: {
    confirm: 'bg-red-700 text-white hover:bg-red-800',
    accent: 'bg-red-600',
    eyebrow: 'Confirm action',
  },
};

/**
 * In-app confirmation / alert dialog that replaces browser window.confirm / window.alert.
 *
 * @param {boolean} open
 * @param {string} title
 * @param {string|React.ReactNode} message
 * @param {string} [confirmLabel='Confirm']
 * @param {string} [cancelLabel='Cancel']
 * @param {boolean} [hideCancel=false] — single-button alert mode
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
  cancelLabel = 'Cancel',
  hideCancel = false,
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

  const styles = TONE_STYLES[tone] || TONE_STYLES.default;

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
        className="modal-shell max-w-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`h-1 ${styles.accent}`} />

        <div className="px-5 pt-5">
          <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe/60">
            {styles.eyebrow}
          </p>
          <h2
            id="confirm-dialog-title"
            className="mt-1 font-serif text-xl font-light leading-tight text-primary-dark"
          >
            {title}
          </h2>
        </div>

        <div className="px-5 pb-5 pt-3">
          <div
            id="confirm-dialog-message"
            className="font-sans text-sm leading-relaxed text-taupe"
          >
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>

          <div className="mt-5 flex gap-2">
            {!hideCancel && (
              <button
                type="button"
                disabled={loading}
                onClick={onCancel}
                className="btn-ghost flex-1"
              >
                {cancelLabel}
              </button>
            )}
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className={`${hideCancel ? 'w-full' : 'flex-1'} rounded-lg px-4 py-2.5 font-sans text-xs font-normal uppercase tracking-[0.12em] transition-all duration-200 ease-out-expo disabled:opacity-50 ${styles.confirm}`}
            >
              {loading ? 'Please wait…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ConfirmDialog;
