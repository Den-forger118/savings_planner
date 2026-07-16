import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

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
      setError(err.response?.data?.error || 'Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  const triggerClass =
    variant === 'discrete'
      ? 'inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary-dark px-4 font-sans text-sm font-medium text-cream transition-colors hover:bg-primary-dark-alt'
      : 'inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-5 py-3 font-sans text-xs font-bold uppercase tracking-widest text-primary-dark shadow-sm transition-colors hover:bg-gold-light';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${triggerClass} ${className}`}
      >
        <Icon name="add" className={variant === 'discrete' ? 'text-base text-cream/80' : 'text-lg'} />
        New Goal
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="presentation"
          onClick={closeModal}
        >
          <div className="absolute inset-0 bg-primary-dark/40 backdrop-blur-sm" />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-goal-title"
            className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-primary-dark px-5 py-3.5 text-cream">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-gold">
                    New Objective
                  </p>
                  <h2 id="create-goal-title" className="mt-0.5 font-serif text-xl font-bold leading-tight">
                    Create a Goal
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close"
                  className="rounded-md border-2 border-cream/40 p-1 text-cream/80 transition-colors hover:border-cream/70 hover:bg-cream/10 hover:text-cream"
                >
                  <Icon name="close" className="text-lg" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 px-5 py-4">
              <div>
                <label
                  htmlFor="goal-name"
                  className="mb-1.5 block font-sans text-[10px] font-bold uppercase tracking-widest text-taupe"
                >
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
                  className="w-full rounded-md border border-gray-200 px-3 py-2 font-sans text-sm transition-colors focus:border-primary-dark focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="goal-amount"
                  className="mb-1.5 block font-sans text-[10px] font-bold uppercase tracking-widest text-taupe"
                >
                  Target Amount
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-money text-lg font-bold text-primary-dark">{currencySymbol}</span>
                  <input
                    id="goal-amount"
                    type="number"
                    name="targetAmount"
                    value={formData.targetAmount}
                    onChange={handleChange}
                    placeholder="5000.00"
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-gray-200 px-3 py-2 font-sans text-sm transition-colors focus:border-primary-dark focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="goal-deadline"
                  className="mb-1.5 block font-sans text-[10px] font-bold uppercase tracking-widest text-taupe"
                >
                  Target Deadline
                </label>
                <input
                  id="goal-deadline"
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 font-sans text-sm transition-colors focus:border-primary-dark focus:outline-none"
                />
              </div>

              {error && (
                <div className="rounded-md border-l-2 border-red-500 bg-red-50 px-3 py-2">
                  <p className="font-sans text-xs text-red-700">{error}</p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-3.5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="rounded-md border border-gray-200 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-taupe transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-primary-dark px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-cream transition-colors hover:bg-primary-dark-alt disabled:opacity-50"
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
