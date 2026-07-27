import { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import api from '../services/api';
import { getFriendlyError } from '../utils/friendlyError';
import ConfirmDialog from './ConfirmDialog';
import ErrorBanner from './ErrorBanner';

const PANEL_DURATION_MS = 320;

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
  const [showForm, setShowForm] = useState(false);
  const [formExpanded, setFormExpanded] = useState(false);
  const closeTimerRef = useRef(null);

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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (isEditing) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      setShowForm(true);
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setFormExpanded(true));
      });

      return () => window.cancelAnimationFrame(frame);
    }

    setFormExpanded(false);

    if (showForm) {
      closeTimerRef.current = window.setTimeout(() => {
        setShowForm(false);
        closeTimerRef.current = null;
      }, PANEL_DURATION_MS);
    }

    return undefined;
  }, [isEditing, showForm]);

  const resetForm = () => {
    setFormData({
      name: goal.name || '',
      targetAmount: goal.target_amount || '',
      deadline: formatDateInputValue(goal.deadline),
    });
    setError(null);
  };

  const closeEdit = () => {
    resetForm();
    setIsEditing(false);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      closeEdit();
      return;
    }

    setIsEditing(true);
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
      setError(getFriendlyError(err, 'We couldn’t update that goal. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.delete(`/goals/${goalId}`);
      setDeleteConfirmOpen(false);
      window.requestAnimationFrame(() => {
        onGoalDeleted(response.data.goals);
      });
    } catch (err) {
      setDeleteConfirmOpen(false);
      setError(getFriendlyError(err, 'We couldn’t move that goal to trash. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    startEdit: () => setIsEditing(true),
    cancelEdit: closeEdit,
    deleteGoal: handleDelete,
  }));

  const deleteDialog = (
    <ConfirmDialog
      open={deleteConfirmOpen}
      title={`Move "${goal.name}" to Trash?`}
      message="You can restore it later from Settings → Trash."
      confirmLabel="Move to Trash"
      tone="danger"
      loading={loading && deleteConfirmOpen}
      onConfirm={confirmDelete}
      onCancel={() => {
        if (!loading) setDeleteConfirmOpen(false);
      }}
    />
  );

  if (hideActionButtons && !showForm && !error) {
    return deleteDialog;
  }

  return (
    <div className={`space-y-4 ${hideActionButtons ? '' : 'border-t border-gray-200 pt-4'}`}>
      {showForm && (
        <div className={`goal-edit-panel ${formExpanded ? 'is-open' : ''}`}>
          <div className="goal-edit-panel-inner">
            <form onSubmit={handleUpdate} className="space-y-4 rounded-lg bg-cream/70 p-4">
              <div>
                <label className="mb-2 block font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
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
                <label className="mb-2 block font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
                  Target Amount
                </label>
                <input
                  type="number"
                  name="targetAmount"
                  value={formData.targetAmount}
                  onChange={handleChange}
                  min="0.01"
                  step="0.01"
                  placeholder={`${currencySymbol}0.00`}
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 font-sans text-sm transition-colors focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block font-sans text-xs font-normal uppercase tracking-[0.12em] text-taupe">
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

              {error && <ErrorBanner message={error} />}

              {hideActionButtons ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleEditToggle}
                    className="flex-1 rounded-lg bg-gray-100 px-4 py-3 font-sans text-xs font-normal uppercase tracking-[0.12em] text-primary-dark transition-colors hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-lg bg-gold px-4 py-3 font-sans text-xs font-normal uppercase tracking-[0.12em] text-primary-dark transition-colors hover:bg-gold-light disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-gold px-4 py-3 font-sans text-xs font-normal uppercase tracking-[0.12em] text-primary-dark transition-colors hover:bg-gold-light disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {!isEditing && error && <ErrorBanner message={error} />}

      {!hideActionButtons && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleEditToggle}
            className="flex-1 rounded-lg bg-gray-100 px-3 py-2 font-sans text-sm font-normal text-primary-dark transition-colors hover:bg-gray-200"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-100 px-3 py-2 font-sans text-sm font-normal text-red-800 transition-colors hover:bg-red-200 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}

      {deleteDialog}
    </div>
  );
});

export default GoalActions;
