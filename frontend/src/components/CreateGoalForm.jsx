import { useState } from 'react';
import api from '../services/api';

function CreateGoalForm({ userId, onGoalCreated }) {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
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
      const response = await api.post(
        '/goals',
        {
          userId,
          name: formData.name,
          targetAmount: parseFloat(formData.targetAmount),
          deadline: formData.deadline,
        }
      );

      // Success
      setSuccess(true);
      onGoalCreated(response.data.goal);
      
      // Reset form
      setFormData({ name: '', targetAmount: '', deadline: '' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 mb-8 border-l-4 border-gold">
      <h2 className="font-serif text-2xl font-bold text-primary-dark mb-2">
        Create a New Goal
      </h2>
      <p className="font-sans text-taupe mb-6">
        Add a savings goal and the system will automatically allocate your budget based on deadline and target amount.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Goal Name */}
        <div>
          <label className="block font-sans text-sm font-semibold text-primary-dark mb-2">
            Goal Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Summer Vacation, Car Down Payment"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-sans text-base focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        {/* Target Amount */}
        <div>
          <label className="block font-sans text-sm font-semibold text-primary-dark mb-2">
            Target Amount ($)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-serif text-gold">$</span>
            <input
              type="number"
              name="targetAmount"
              value={formData.targetAmount}
              onChange={handleChange}
              placeholder="5000.00"
              step="0.01"
              min="0"
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-sans text-base focus:outline-none focus:border-gold transition-colors"
            />
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label className="block font-sans text-sm font-semibold text-primary-dark mb-2">
            Target Deadline
          </label>
          <input
            type="date"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-sans text-base focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="font-sans text-red-700">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <p className="font-sans text-green-700">✓ Goal created successfully!</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold hover:bg-gold-light text-primary-dark px-6 py-3 rounded-lg font-sans font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating Goal...' : 'Create Goal'}
        </button>
      </form>
    </div>
  );
}

export default CreateGoalForm;