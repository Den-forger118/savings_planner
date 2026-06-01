import { useState, useEffect } from 'react';
import api from '../services/api';

function ExpenseForm({ userId, onExpenseAdded }) {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    note: '',
    expenseDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [userId]);

  const fetchCategories = async () => {
    try {
      const response = await api.get( `/expenses/categories?userId=${userId}`
      );
      setCategories(response.data.categories);

      // Set first category as default
      if (response.data.categories.length > 0) {
        setFormData(prev => ({
          ...prev,
          categoryId: response.data.categories[0].category_id
        }));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/expenses', {
          userId,
          categoryId: parseInt(formData.categoryId),
          amount: parseFloat(formData.amount),
          note: formData.note,
          expenseDate: formData.expenseDate
        }
      );

      setSuccess(true);
      onExpenseAdded(response.data.expense);

      // Reset form
      setFormData(prev => ({
        ...prev,
        amount: '',
        note: ''
      }));

      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-gold mb-8">
      <h2 className="font-serif text-2xl font-bold text-primary-dark mb-2">
        Log an Expense
      </h2>
      <p className="font-sans text-taupe mb-6">
        Track your spending to understand how it affects your savings.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Category Selector */}
        <div>
          <label className="block font-sans text-sm font-semibold text-primary-dark mb-2">
            Category
          </label>
          <select
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-sans text-base focus:outline-none focus:border-gold transition-colors bg-white"
          >
            {categories.map(cat => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block font-sans text-sm font-semibold text-primary-dark mb-2">
            Amount ($)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-serif text-gold">$</span>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-sans text-base focus:outline-none focus:border-gold transition-colors"
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block font-sans text-sm font-semibold text-primary-dark mb-2">
            Date
          </label>
          <input
            type="date"
            name="expenseDate"
            value={formData.expenseDate}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-sans text-base focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block font-sans text-sm font-semibold text-primary-dark mb-2">
            Note (optional)
          </label>
          <input
            type="text"
            name="note"
            value={formData.note}
            onChange={handleChange}
            placeholder="e.g., Lunch at restaurant"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-sans text-base focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        {/* Error & Success */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="font-sans text-red-700 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <p className="font-sans text-green-700 text-sm">✓ Expense logged!</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold hover:bg-gold-light text-primary-dark px-6 py-3 rounded-lg font-sans font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? 'Logging...' : 'Log Expense'}
        </button>
      </form>
    </div>
  );
}

export default ExpenseForm;