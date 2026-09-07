const STORAGE_KEY = 'quant_pending_goal';

const isValidDraft = (draft) => {
  if (!draft || typeof draft !== 'object') return false;
  const name = typeof draft.name === 'string' ? draft.name.trim() : '';
  const targetAmount = Number.parseFloat(draft.targetAmount);
  const deadline = typeof draft.deadline === 'string' ? draft.deadline : '';
  return Boolean(name && Number.isFinite(targetAmount) && targetAmount > 0 && deadline);
};

export const savePendingGoal = (draft) => {
  if (!isValidDraft(draft)) return false;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      name: draft.name.trim(),
      targetAmount: String(draft.targetAmount),
      deadline: draft.deadline,
      savedAt: Date.now(),
    }));
    return true;
  } catch {
    return false;
  }
};

export const getPendingGoal = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const hasPendingGoal = () => Boolean(getPendingGoal());

export const clearPendingGoal = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};
