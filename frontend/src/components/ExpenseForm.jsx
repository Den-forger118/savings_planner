import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { getFriendlyError } from '../utils/friendlyError';
import ErrorBanner from './ErrorBanner';

const Icon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const getTodayDate = () => new Date().toISOString().split('T')[0];

const buildInitialFormState = (categoryId = '') => ({
  categoryId,
  amount: '',
  note: '',
  expenseDate: getTodayDate(),
});

function ExpenseForm({
  userId,
  onExpenseAdded,
  className = '',
  currencyCode = 'USD',
  currencySymbol = '$',
  variant = 'default',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState(buildInitialFormState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setError(null);
    setFormData(buildInitialFormState(categories[0]?.category_id || ''));
  }, [categories]);

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

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchCategories = async () => {
      try {
        const response = await api.get(`/expenses/categories?userId=${userId}`);
        const nextCategories = response.data.categories || [];
        setCategories(nextCategories);

        if (nextCategories.length > 0) {
          setFormData((prev) => ({
            ...prev,
            categoryId: prev.categoryId || nextCategories[0].category_id,
          }));
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(getFriendlyError(err, 'We couldn’t load your categories. Please try again.'));
      }
    };

    fetchCategories();
  }, [isOpen, userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.categoryId) {
      setError('Please select a category');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/expenses', {
        userId,
        categoryId: parseInt(formData.categoryId, 10),
        amount: parseFloat(formData.amount),
        note: formData.note,
        expenseDate: formData.expenseDate,
      });

      closeModal();
      window.requestAnimationFrame(() => {
        onExpenseAdded(response.data.expense);
      });
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t log that expense. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const triggerClass =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-primary-dark px-4 py-2.5 font-sans text-xs font-normal uppercase tracking-[0.12em] text-cream transition-colors hover:bg-primary-dark-alt';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${triggerClass} ${className}`}
      >
        <Icon name="receipt_long" className="text-base text-cream/80" />
        Log Expense
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
            aria-labelledby="log-expense-title"
            className="modal-shell"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="log-expense-title" className="modal-title">
                Log an Expense
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
                <label htmlFor="expense-category" className="modal-label">
                  Category
                </label>
                <select
                  id="expense-category"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  disabled={categories.length === 0}
                  className="modal-field"
                >
                  {categories.length === 0 ? (
                    <option value="">Loading categories...</option>
                  ) : (
                    categories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="expense-amount" className="modal-label">
                  Amount
                </label>
                <input
                  id="expense-amount"
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder={`${currencySymbol}0.00`}
                  step="0.01"
                  min="0"
                  autoFocus
                  className="modal-field"
                />
              </div>

              <div>
                <label htmlFor="expense-date" className="modal-label">
                  Date
                </label>
                <input
                  id="expense-date"
                  type="date"
                  name="expenseDate"
                  value={formData.expenseDate}
                  onChange={handleChange}
                  className="modal-field"
                />
              </div>

              <div>
                <label htmlFor="expense-note" className="modal-label">
                  Note <span className="font-light text-taupe">(optional)</span>
                </label>
                <input
                  id="expense-note"
                  type="text"
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  placeholder="e.g., Lunch at restaurant"
                  className="modal-field"
                />
              </div>

              {error && <ErrorBanner message={error} />}

              <button
                type="submit"
                disabled={loading || categories.length === 0}
                className="modal-submit"
              >
                {loading ? 'Logging…' : 'Log Expense'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ExpenseForm;
