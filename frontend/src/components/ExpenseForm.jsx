import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { getFriendlyError } from '../utils/friendlyError';
import ErrorBanner from './ErrorBanner';
import { CATEGORY_COLOR_PRESETS, DEFAULT_CATEGORY_COLOR } from '../utils/categoryColors';

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
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(DEFAULT_CATEGORY_COLOR);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const selectedCategory = categories.find(
    (cat) => String(cat.category_id) === String(formData.categoryId)
  );

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setError(null);
    setShowNewCategory(false);
    setNewCategoryName('');
    setNewCategoryColor(DEFAULT_CATEGORY_COLOR);
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

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    setError(null);

    const name = newCategoryName.trim();
    if (!name) {
      setError('Enter a name for the new category.');
      return;
    }

    setCreatingCategory(true);
    try {
      const response = await api.post('/expenses/categories', {
        userId,
        name,
        color: newCategoryColor || DEFAULT_CATEGORY_COLOR,
      });
      const created = response.data.category;
      setCategories((prev) => [...prev, created]);
      setFormData((prev) => ({ ...prev, categoryId: created.category_id }));
      setNewCategoryName('');
      setNewCategoryColor(DEFAULT_CATEGORY_COLOR);
      setShowNewCategory(false);
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t create that category. Please try again.'));
    } finally {
      setCreatingCategory(false);
    }
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
                disabled={loading || creatingCategory}
                className="modal-close"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label htmlFor="expense-category" className="modal-label mb-0">
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategory((prev) => !prev);
                      setError(null);
                    }}
                    className="font-sans text-xs font-normal text-primary-dark underline underline-offset-2"
                  >
                    {showNewCategory ? 'Cancel' : 'New category'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-primary-dark/10"
                    style={{
                      backgroundColor:
                        selectedCategory?.colour
                        || selectedCategory?.color
                        || DEFAULT_CATEGORY_COLOR,
                    }}
                    aria-hidden
                  />
                  <select
                    id="expense-category"
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    disabled={categories.length === 0}
                    className="modal-field"
                  >
                    {categories.length === 0 ? (
                      <option value="">No categories yet — create one below</option>
                    ) : (
                      categories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {showNewCategory && (
                  <div className="mt-3 space-y-3 rounded-lg border border-primary-dark/10 bg-cream/50 px-3 py-3">
                    <div>
                      <label htmlFor="new-expense-category" className="modal-label">
                        Name
                      </label>
                      <input
                        id="new-expense-category"
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g. Groceries"
                        className="modal-field"
                        autoFocus
                      />
                    </div>
                    <div>
                      <p className="modal-label">Colour</p>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORY_COLOR_PRESETS.map((swatch) => {
                          const selected = newCategoryColor === swatch;
                          return (
                            <button
                              key={swatch}
                              type="button"
                              onClick={() => setNewCategoryColor(swatch)}
                              aria-label={`Choose colour ${swatch}`}
                              className={`h-7 w-7 rounded-full border-2 transition-transform ${
                                selected
                                  ? 'scale-110 border-primary-dark'
                                  : 'border-transparent hover:scale-105'
                              }`}
                              style={{ backgroundColor: swatch }}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={creatingCategory}
                      className="btn-ghost min-h-[40px] w-full text-xs disabled:opacity-60"
                    >
                      {creatingCategory ? 'Adding…' : 'Add category'}
                    </button>
                  </div>
                )}
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
                  autoFocus={!showNewCategory}
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
                disabled={loading || creatingCategory || categories.length === 0}
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
