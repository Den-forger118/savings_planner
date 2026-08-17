/**
 * Turn API / network / technical failures into calm, human messages.
 * Never expose SQL, stack traces, or internal constraint names to users.
 */

const TECHNICAL_PATTERN =
  /constraint|ECONN|ENOTFOUND|EAI_AGAIN|SQL|stack|at Object\.|TypeError|ReferenceError|Error:|violates|relation "|column "|FOR UPDATE|axios|ERR_/i;

const KNOWN_PATTERNS = [
  {
    test: /withdrawal exceeds available balance/i,
    message: 'That withdrawal is larger than what’s currently saved in this goal.',
  },
  {
    test: /passwords? do not match/i,
    message: 'Those passwords don’t match. Please try again.',
  },
  {
    test: /password must be at least/i,
    message: 'Please choose a password with at least 8 characters.',
  },
  {
    test: /invalid email or password|incorrect password|invalid credentials|doesn’t look right|doesn't look right/i,
    message: 'That email or password doesn’t look right. Please try again.',
  },
  {
    test: /sign-in is paused|temporarily paused|too many.*attempt/i,
    message: 'For your security, sign-in is paused for a few minutes.',
  },
  {
    test: /account deactivated|account is deactivated/i,
    message: 'This account is deactivated. Please contact support.',
  },
  {
    test: /email already|already registered|already exists|duplicate/i,
    message: 'An account with that email already exists. Try signing in instead.',
  },
  {
    test: /jwt|token expired|unauthorized|not authenticated/i,
    message: 'Your session has ended. Please sign in again to continue.',
  },
  {
    test: /reset link is invalid|has expired|request a new one/i,
    message: 'This reset link is invalid or has expired. Request a new one.',
  },
  {
    test: /set a monthly budget before enabling earner/i,
    message: 'Set a monthly budget first, then you can switch on Earner mode.',
  },
  {
    test: /budget allocation is only available in earner/i,
    message: 'Budget allocation is available once Earner mode is on.',
  },
  {
    test: /please set your monthly budget first/i,
    message: 'Add a monthly budget before continuing.',
  },
  {
    test: /goal not found/i,
    message: 'We couldn’t find that goal. It may have been moved or removed.',
  },
  {
    test: /user not found/i,
    message: 'We couldn’t find that account.',
  },
  {
    test: /access denied|forbidden/i,
    message: 'You don’t have permission to do that.',
  },
  {
    test: /amount must be greater than 0/i,
    message: 'Please enter an amount greater than zero.',
  },
  {
    test: /please provide|required/i,
    message: 'Please fill in all required fields and try again.',
  },
  {
    test: /network error|failed to fetch|err_network|timeout/i,
    message: 'We couldn’t reach QUANT right now. Check your connection and try again.',
  },
];

function extractRawMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return (
    error.response?.data?.error ||
    error.response?.data?.message ||
    error.message ||
    ''
  );
}

function isTechnical(message) {
  if (!message) return true;
  if (message.length > 180) return true;
  return TECHNICAL_PATTERN.test(message);
}

/**
 * @param {unknown} error - axios error, Error, or string
 * @param {string} [fallback] - context-specific friendly default
 */
export function getFriendlyError(error, fallback = 'Something didn’t go through. Please try again.') {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const raw = extractRawMessage(error);
  const code = data?.code;

  if (!error?.response && (error?.code === 'ERR_NETWORK' || /network|timeout|failed to fetch/i.test(raw))) {
    return 'We couldn’t reach QUANT right now. Check your connection and try again.';
  }

  if (code === 'LOGIN_LOCKED' || status === 429) {
    return data?.error || 'For your security, sign-in is paused for a few minutes.';
  }

  if (status >= 500) {
    return 'Our servers need a moment. Your ledger is safe — please try again shortly.';
  }

  // Prefer known copy before generic session messaging (login uses 401 too)
  for (const rule of KNOWN_PATTERNS) {
    if (rule.test.test(raw)) return rule.message;
  }

  if (code === 'INVALID_CREDENTIALS') {
    return 'That email or password doesn’t look right. Please try again.';
  }

  if (status === 401) {
    return 'Your session has ended. Please sign in again to continue.';
  }

  if (status === 403) {
    return 'You don’t have permission to do that.';
  }

  if (status === 404) {
    return 'We couldn’t find what you were looking for.';
  }

  if (raw && !isTechnical(raw)) {
    return raw;
  }

  return fallback;
}

/** Structured login lock / attempt info from an auth error response. */
export function getLoginThrottleInfo(error) {
  const data = error?.response?.data;
  if (!data) return null;

  if (data.code === 'LOGIN_LOCKED' || error?.response?.status === 429) {
    return {
      kind: 'locked',
      lockedUntil: data.lockedUntil || null,
      retryAfterSeconds: Number(data.retryAfterSeconds) || 0,
      message: data.error || 'For your security, sign-in is paused for a few minutes.',
    };
  }

  if (data.code === 'INVALID_CREDENTIALS' && Number.isFinite(Number(data.attemptsRemaining))) {
    return {
      kind: 'attempts',
      attemptsRemaining: Number(data.attemptsRemaining),
      failedAttempts: Number(data.failedAttempts) || null,
      message: data.error || 'That email or password doesn’t look right.',
    };
  }

  return null;
}

export function isServerUnavailable(error) {
  const status = error?.response?.status;
  if (status >= 500) return true;
  if (!error?.response && (error?.code === 'ERR_NETWORK' || /network|failed to fetch/i.test(error?.message || ''))) {
    return true;
  }
  return false;
}
