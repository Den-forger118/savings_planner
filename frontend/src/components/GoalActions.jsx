import { useState } from 'react';
import axios from 'axios';

function GoalActions({ goalId, onGoalUpdated, onGoalDeleted }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this goal? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await axios.delete(`http://localhost:5001/api/goals/${goalId}`);
      onGoalDeleted(goalId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 pt-4 border-t border-gray-200">
      <button
        onClick={() => setIsEditing(!isEditing)}
        className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-primary-dark rounded-lg font-sans text-sm font-semibold transition-colors"
      >
        {isEditing ? 'Cancel' : 'Edit'}
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="flex-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-sans text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {loading ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}

export default GoalActions;