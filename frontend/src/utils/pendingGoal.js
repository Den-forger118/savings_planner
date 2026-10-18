const STORAGE_KEY = 'quant_pending_goal';

const isValidDraft = (draft) => {
  if (!draft || typeof draft !== 'object') return false;
  const name = typeof draft.name === 'string' ? draft.name.trim() : '';
  const targetAmount = Number.parseFloat(draft.targetAmount);
  const deadline = typeof draft.deadline === 'string' ? draft.deadline : '';
  return Boolean(name && Number.isFinite(targetAmount) && targetAmount > 0 && deadline);
};

export const savePendingGoal = (draft, { allowPartial = false } = {}) => {
  if (!allowPartial && !isValidDraft(draft)) return false;
  if (!draft || typeof draft !== 'object') return false;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      name: typeof draft.name === 'string' ? draft.name.trim() : '',
      targetAmount: draft.targetAmount != null ? String(draft.targetAmount) : '',
      deadline: typeof draft.deadline === 'string' ? draft.deadline : '',
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
    if (!parsed || typeof parsed !== 'object') return null;
    // Full drafts preferred; partial drafts (e.g. from Coach) still open the form.
    if (isValidDraft(parsed)) return parsed;
    const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
    const targetAmount = parsed.targetAmount != null ? String(parsed.targetAmount) : '';
    const deadline = typeof parsed.deadline === 'string' ? parsed.deadline : '';
    if (!name && !targetAmount && !deadline) return null;
    return { name, targetAmount, deadline };
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
