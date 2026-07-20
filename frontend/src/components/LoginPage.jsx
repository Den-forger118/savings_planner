import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getFriendlyError, getLoginThrottleInfo } from '../utils/friendlyError';
import { PATHS } from '../utils/paths';

const LOCK_STORAGE_KEY = 'quant_login_lock';

function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function readStoredLock(email) {
  try {
    const raw = sessionStorage.getItem(LOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.lockedUntil) return null;
    if (email && parsed.email && parsed.email !== email.trim().toLowerCase()) {
      return null;
    }
    if (new Date(parsed.lockedUntil).getTime() <= Date.now()) {
      sessionStorage.removeItem(LOCK_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function storeLock(email, lockedUntil) {
  sessionStorage.setItem(
    LOCK_STORAGE_KEY,
    JSON.stringify({
      email: String(email || '').trim().toLowerCase(),
      lockedUntil,
    })
  );
}

function clearStoredLock() {
  sessionStorage.removeItem(LOCK_STORAGE_KEY);
}

function LoginNotice({ message, countdown, locked, tone = 'error' }) {
  if (!message && !countdown) return null;

  const isError = tone === 'error' || locked;

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
      className={`rounded-lg border px-3.5 py-3 text-left ${
        isError
          ? 'border-red-200/70 bg-red-50/60'
          : 'border-primary-dark/10 bg-primary-dark/[0.03]'
      }`}
    >
      {message ? (
        <p
          className={`font-sans text-sm font-light leading-relaxed ${
            isError ? 'text-red-900/75' : 'text-primary-dark/85'
          }`}
        >
          {message}
        </p>
      ) : null}
      {countdown ? (
        <p className="mt-2 font-sans text-xs font-normal uppercase tracking-[0.12em] text-red-800/55">
          Try again in{' '}
          <span className="font-money text-sm tracking-[0.04em] text-red-900/80">
            {countdown}
          </span>
        </p>
      ) : null}
    </div>
  );
}

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const stored = readStoredLock();
    if (stored?.lockedUntil) {
      setLockedUntil(stored.lockedUntil);
      if (stored.email) {
        setFormData((prev) => ({ ...prev, email: stored.email }));
      }
      setNotice({
        locked: true,
        message: 'For your security, sign-in is paused. You can try again when the timer ends.',
      });
    }
  }, []);

  useEffect(() => {
    if (!lockedUntil) return undefined;

    const tick = () => {
      const remaining = new Date(lockedUntil).getTime() - Date.now();
      if (remaining <= 0) {
        setLockedUntil(null);
        clearStoredLock();
        setNotice({
          locked: false,
          tone: 'calm',
          message: 'You can try signing in again now.',
        });
        setNowMs(Date.now());
        return;
      }
      setNowMs(Date.now());
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [lockedUntil]);

  const remainingSeconds = useMemo(() => {
    if (!lockedUntil) return 0;
    return Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - nowMs) / 1000));
  }, [lockedUntil, nowMs]);

  const isLocked = remainingSeconds > 0;
  const countdownLabel = isLocked ? formatCountdown(remainingSeconds) : null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const applyLock = (until, message) => {
    if (!until) return;
    setLockedUntil(until);
    storeLock(formData.email, until);
    setNotice({
      locked: true,
      message:
        message ||
        'For your security, sign-in is paused. You can try again when the timer ends.',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) return;

    setNotice(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/login', formData);
      clearStoredLock();
      setLockedUntil(null);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLogin(response.data.user, response.data.token);
      const next =
        response.data.user.onboarding_complete === false
          ? PATHS.onboarding
          : PATHS.dashboard;
      navigate(next, { replace: true });
    } catch (err) {
      const throttle = getLoginThrottleInfo(err);

      if (throttle?.kind === 'locked') {
        applyLock(throttle.lockedUntil, throttle.message);
        return;
      }

      if (throttle?.kind === 'attempts') {
        const left = throttle.attemptsRemaining;
        const attemptCopy =
          left === 1
            ? 'That email or password doesn’t look right. You have 1 attempt left before a short pause.'
            : `That email or password doesn’t look right. You have ${left} attempts left before a short pause.`;
        setNotice({ locked: false, message: attemptCopy });
        return;
      }

      setNotice({
        locked: false,
        message: getFriendlyError(
          err,
          'We couldn’t sign you in. Please check your details and try again.'
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-canvas flex min-h-screen items-center justify-center px-4 py-12">
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-10 text-center">
          <h1 className="font-engraved text-5xl text-primary-dark md:text-6xl">
            QUANT
          </h1>
          <p className="mt-3 font-sans text-xs font-normal uppercase tracking-[0.14em] text-gold">
            Private Savings Intelligence
          </p>
        </div>

        <div className="surface overflow-hidden">
          <div className="border-b border-primary-dark/[0.06] bg-navy-sheen px-7 py-5 text-cream">
            <p className="font-sans text-xs font-normal uppercase tracking-[0.12em] text-gold">
              Member Access
            </p>
            <h2 className="mt-1 font-serif text-3xl font-light tracking-[-0.025em]">
              Welcome back
            </h2>
          </div>

          <div className="px-7 py-7">
            <p className="mb-6 font-sans text-sm leading-relaxed text-taupe">
              Sign in to review your goals, budget, and expense analytics.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="field-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="field"
                  disabled={isLocked}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="field-label">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="field"
                  disabled={isLocked}
                  autoComplete="current-password"
                />
              </div>

              <LoginNotice
                message={notice?.message}
                countdown={countdownLabel}
                locked={isLocked || notice?.locked}
                tone={notice?.tone || 'error'}
              />

              <button
                type="submit"
                disabled={loading || isLocked}
                className="btn-navy mt-2 w-full py-3 text-white disabled:opacity-50"
              >
                {isLocked
                  ? 'Sign-in paused'
                  : loading
                    ? 'Signing in...'
                    : 'Sign In'}
              </button>
            </form>

            <p className="mt-6 text-center font-sans text-sm text-taupe">
              Don&apos;t have an account?{' '}
              <Link
                to={PATHS.register}
                className="font-normal text-primary-dark underline decoration-gold/50 underline-offset-4 transition-colors hover:text-gold"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
