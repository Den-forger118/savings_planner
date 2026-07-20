import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { getFriendlyError } from '../utils/friendlyError';
import ErrorBanner from './ErrorBanner';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const initialFormState = {
  name: '',
  targetAmount: '',
  deadline: '',
};

function CreateGoalForm({
  userId,
  onGoalCreated,
  className = '',
  currencyCode = 'USD',
  currencySymbol = '$',
  variant = 'default',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setError(null);
    setFormData(initialFormState);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeModal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || !formData.targetAmount || !formData.deadline) {
      setError('Please fill in all fields');
      return;
    }

    if (parseFloat(formData.targetAmount) <= 0) {
      setError('Target amount must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/goals', {
        userId,
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        deadline: formData.deadline,
      });

      onGoalCreated(response.data.goal);
      closeModal();
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t create that goal. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const triggerClass =
    variant === 'discrete'
      ? 'btn-navy h-10'
      : 'btn-navy';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${triggerClass} ${className}`}
      >
        <Icon name="add" className="text-base text-cream/80" />
        New Goal
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="presentation"
          onClick={closeModal}
        >
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-goal-title"
            className="modal-shell"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
                    New Objective
                  </p>
                  <h2 id="create-goal-title" className="mt-0.5 font-serif text-xl font-light leading-tight">
                    Create a Goal
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close"
                  className="p-1 text-cream/80 transition-colors hover:bg-cream/10 hover:text-cream"
                >
                  <Icon name="close" className="text-lg" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 px-5 py-5">
              <div>
                <label htmlFor="goal-name" className="field-label">
                  Goal Name
                </label>
                <input
                  id="goal-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Summer Vacation, Car Down Payment"
                  autoFocus
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="goal-amount" className="field-label">
                  Target Amount
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-money text-lg font-light tracking-[0.02em] text-primary-dark">{currencySymbol}</span>
                  <input
                    id="goal-amount"
                    type="number"
                    name="targetAmount"
                    value={formData.targetAmount}
                    onChange={handleChange}
                    placeholder="5000.00"
                    step="0.01"
                    min="0"
                    className="field"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="goal-deadline" className="field-label">
                  Target Deadline
                </label>
                <input
                  id="goal-deadline"
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  className="field"
                />
              </div>

              {error && <ErrorBanner message={error} />}

              <div className="flex flex-col-reverse gap-2 border-t border-primary-dark/[0.08] pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default CreateGoalForm;
