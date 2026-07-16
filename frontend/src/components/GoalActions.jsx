import { useState, useImperativeHandle, forwardRef } from 'react';
import api from '../services/api';

const getTodayInputValue = () => new Date().toISOString().slice(0, 10);

const formatDateInputValue = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

const GoalActions = forwardRef(function GoalActions(
  { goal, onGoalUpdated, onGoalDeleted, hideActionButtons = false, isEditing: controlledEditing, onEditingChange, currencySymbol = '$' },
  ref
) {
  const goalId = goal.goal_id;
  const [internalEditing, setInternalEditing] = useState(false);
  const isEditing = controlledEditing !== undefined ? controlledEditing : internalEditing;

  const setIsEditing = (value) => {
    if (onEditingChange) {
      onEditingChange(typeof value === 'function' ? value(isEditing) : value);
    } else {
      setInternalEditing(value);
    }
  };
  const [formData, setFormData] = useState({
    name: goal.name || '',
    targetAmount: goal.target_amount || '',
    deadline: formatDateInputValue(goal.deadline),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resetForm = () => {
    setFormData({
      name: goal.name || '',
      targetAmount: goal.target_amount || '',
      deadline: formatDateInputValue(goal.deadline),
    });
    setError(null);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      resetForm();
    }

    setIsEditing(open => !open);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.targetAmount || !formData.deadline) {
      setError('Please fill in all fields');
      return;
    }

    if (parseFloat(formData.targetAmount) <= 0) {
      setError('Target amount must be greater than 0');
      return;
    }

    if (!goal.is_complete && formData.deadline < getTodayInputValue()) {
      setError('Deadline cannot be in the past');
      return;
    }

    setLoading(true);

    try {
      const response = await api.put(`/goals/${goalId}`, {
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        deadline: formData.deadline,
      });

      onGoalUpdated(response.data.goals || [response.data.goal]);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update goal');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Move this goal to Trash? You can restore it later from Settings → Trash.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.delete(`/goals/${goalId}`);
      onGoalDeleted(response.data.goals);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete goal');
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    startEdit: () => setIsEditing(true),
    cancelEdit: () => {
      resetForm();
      setIsEditing(false);
    },
    deleteGoal: handleDelete,
  }));

  if (hideActionButtons && !isEditing && !error) {
    return null;
  }

  return (
    <div className={`space-y-4 ${hideActionButtons ? '' : 'border-t border-gray-200 pt-4'}`}>
      {isEditing && (
        <form onSubmit={handleUpdate} className="space-y-4 rounded-lg bg-cream/70 p-4">
          <div>
            <label className="mb-2 block font-sans text-xs font-bold uppercase tracking-widest text-taupe">
              Goal Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 font-sans text-sm transition-colors focus:border-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block font-sans text-xs font-bold uppercase tracking-widest text-taupe">
              Target Amount ({currencySymbol})
            </label>
            <input
              type="number"
              name="targetAmount"
              value={formData.targetAmount}
              onChange={handleChange}
              min="0.01"
              step="0.01"
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 font-sans text-sm transition-colors focus:border-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block font-sans text-xs font-bold uppercase tracking-widest text-taupe">
              Deadline
            </label>
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              min={getTodayInputValue()}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 font-sans text-sm transition-colors focus:border-gold focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded border-l-4 border-red-500 bg-red-50 p-3">
              <p className="font-sans text-sm text-red-700">{error}</p>
            </div>
          )}

          {hideActionButtons ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleEditToggle}
                className="flex-1 rounded-lg bg-gray-100 px-4 py-3 font-sans text-xs font-bold uppercase tracking-widest text-primary-dark transition-colors hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-gold px-4 py-3 font-sans text-xs font-bold uppercase tracking-widest text-primary-dark transition-colors hover:bg-gold-light disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gold px-4 py-3 font-sans text-xs font-bold uppercase tracking-widest text-primary-dark transition-colors hover:bg-gold-light disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </form>
      )}

      {!isEditing && error && (
        <div className="rounded border-l-4 border-red-500 bg-red-50 p-3">
          <p className="font-sans text-sm text-red-700">{error}</p>
        </div>
      )}

      {!hideActionButtons && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleEditToggle}
            className="flex-1 rounded-lg bg-gray-100 px-3 py-2 font-sans text-sm font-semibold text-primary-dark transition-colors hover:bg-gray-200"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-100 px-3 py-2 font-sans text-sm font-semibold text-red-800 transition-colors hover:bg-red-200 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
});

export default GoalActions;
