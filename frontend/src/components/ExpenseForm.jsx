import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

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
        setError('Unable to load categories. Please try again.');
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

      onExpenseAdded(response.data.expense);
      closeModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log expense');
    } finally {
      setLoading(false);
    }
  };

  const triggerClass =
    variant === 'discrete'
      ? 'inline-flex items-center justify-center gap-2 rounded-lg bg-primary-dark px-4 py-2 font-sans text-sm font-medium text-cream transition-colors hover:bg-primary-dark-alt'
      : 'inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-5 py-3 font-sans text-xs font-bold uppercase tracking-widest text-primary-dark shadow-sm transition-colors hover:bg-gold-light';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${triggerClass} ${className}`}
      >
        <Icon name="receipt_long" className={variant === 'discrete' ? 'text-base text-cream/80' : 'text-lg'} />
        Log Expense
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
            aria-labelledby="log-expense-title"
            className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-primary-dark px-5 py-3.5 text-cream">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-gold">
                    Capital Outflow
                  </p>
                  <h2 id="log-expense-title" className="mt-0.5 font-serif text-xl font-bold leading-tight">
                    Log an Expense
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
                  htmlFor="expense-category"
                  className="mb-1.5 block font-sans text-[10px] font-bold uppercase tracking-widest text-taupe"
                >
                  Category
                </label>
                <select
                  id="expense-category"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  disabled={categories.length === 0}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-sans text-sm transition-colors focus:border-primary-dark focus:outline-none disabled:opacity-50"
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
                <label
                  htmlFor="expense-amount"
                  className="mb-1.5 block font-sans text-[10px] font-bold uppercase tracking-widest text-taupe"
                >
                  Amount
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-money text-lg font-bold text-primary-dark">{currencySymbol}</span>
                  <input
                    id="expense-amount"
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    autoFocus
                    className="w-full rounded-md border border-gray-200 px-3 py-2 font-sans text-sm transition-colors focus:border-primary-dark focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="expense-date"
                  className="mb-1.5 block font-sans text-[10px] font-bold uppercase tracking-widest text-taupe"
                >
                  Date
                </label>
                <input
                  id="expense-date"
                  type="date"
                  name="expenseDate"
                  value={formData.expenseDate}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 font-sans text-sm transition-colors focus:border-primary-dark focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="expense-note"
                  className="mb-1.5 block font-sans text-[10px] font-bold uppercase tracking-widest text-taupe"
                >
                  Note <span className="font-normal normal-case tracking-normal text-taupe/70">(optional)</span>
                </label>
                <input
                  id="expense-note"
                  type="text"
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  placeholder="e.g., Lunch at restaurant"
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
                  disabled={loading || categories.length === 0}
                  className="rounded-md bg-primary-dark px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-cream transition-colors hover:bg-primary-dark-alt disabled:opacity-50"
                >
                  {loading ? 'Logging...' : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ExpenseForm;
