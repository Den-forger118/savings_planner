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
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="presentation"
          onClick={closeModal}
        >
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[3px]" />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-goal-title"
            className="modal-shell"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="create-goal-title" className="modal-title">
                Create a Goal
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                disabled={loading}
                className="modal-close"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div>
                <label htmlFor="goal-name" className="modal-label">
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
                  className="modal-field"
                />
              </div>

              <div>
                <label htmlFor="goal-amount" className="modal-label">
                  Target Amount
                </label>
                <input
                  id="goal-amount"
                  type="number"
                  name="targetAmount"
                  value={formData.targetAmount}
                  onChange={handleChange}
                  placeholder={`${currencySymbol}5000.00`}
                  step="0.01"
                  min="0"
                  className="modal-field"
                />
              </div>

              <div>
                <label htmlFor="goal-deadline" className="modal-label">
                  Target Deadline
                </label>
                <input
                  id="goal-deadline"
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  className="modal-field"
                />
              </div>

              {error && <ErrorBanner message={error} />}

              <button
                type="submit"
                disabled={loading}
                className="modal-submit"
              >
                {loading ? 'Creating…' : 'Create Goal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default CreateGoalForm;
