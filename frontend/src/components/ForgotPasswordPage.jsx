import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getFriendlyError } from '../utils/friendlyError';
import { PATHS } from '../utils/paths';
import AuthStoryPanel from './AuthStoryPanel';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(
        getFriendlyError(err, 'We couldn’t send a reset email right now. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthStoryPanel variant="forgot">
      <div>
        <p className="font-sans text-xs font-normal uppercase tracking-[0.16em] text-taupe/80">
          Recover Access
        </p>
        <h2 className="mt-2 font-serif text-[2.35rem] font-light tracking-[-0.03em] text-primary-dark sm:text-5xl">
          Forgot password
        </h2>
        <p className="mt-3 font-sans text-[15px] font-light leading-relaxed text-taupe">
          Enter the email on your account. If it matches a ledger, we’ll send a reset link.
        </p>

        {sent ? (
          <div className="mt-10 rounded-lg border border-primary-dark/10 bg-primary-dark/[0.03] px-3.5 py-4">
            <p className="font-sans text-sm font-light leading-relaxed text-primary-dark/85">
              If an account exists for that email, a reset link is on its way. Check your inbox
              and spam folder.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-7">
            <div>
              <label className="mb-2 block font-sans text-xs font-normal uppercase tracking-[0.14em] text-taupe">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="auth-field-underline"
                autoComplete="email"
                required
              />
            </div>

            {error ? (
              <p role="alert" className="font-sans text-sm font-light text-red-900/75">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="btn-navy mt-2 w-full py-3.5 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="mt-8 text-center font-sans text-sm text-taupe">
          Remembered it?{' '}
          <Link
            to={PATHS.login}
            className="font-normal text-primary-dark underline decoration-gold/40 underline-offset-4 transition-colors hover:text-gold"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthStoryPanel>
  );
}

export default ForgotPasswordPage;
