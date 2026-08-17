import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { getFriendlyError } from '../utils/friendlyError';
import { PATHS } from '../utils/paths';
import AuthStoryPanel from './AuthStoryPanel';

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError('This reset link is missing its token. Request a new one.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Those passwords don’t match. Please try again.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Please choose a password with at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        password: formData.password,
      });
      navigate(PATHS.login, { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setError(
        getFriendlyError(
          err,
          'This reset link is invalid or has expired. Request a new one.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthStoryPanel variant="reset">
      <div>
        <p className="font-sans text-xs font-normal uppercase tracking-[0.16em] text-taupe/80">
          New Password
        </p>
        <h2 className="mt-2 font-serif text-[2.35rem] font-light tracking-[-0.03em] text-primary-dark sm:text-5xl">
          Reset password
        </h2>
        <p className="mt-3 font-sans text-[15px] font-light leading-relaxed text-taupe">
          Choose a new password for your QUANT ledger. Minimum 8 characters.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-7">
          <div>
            <label className="mb-2 block font-sans text-xs font-normal uppercase tracking-[0.14em] text-taupe">
              New Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              className="auth-field-underline"
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-sans text-xs font-normal uppercase tracking-[0.14em] text-taupe">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              className="auth-field-underline"
              autoComplete="new-password"
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
            disabled={loading || !token}
            className="btn-navy mt-2 w-full py-3.5 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>

        <p className="mt-8 text-center font-sans text-sm text-taupe">
          Need a new link?{' '}
          <Link
            to={PATHS.forgotPassword}
            className="font-normal text-primary-dark underline decoration-gold/40 underline-offset-4 transition-colors hover:text-gold"
          >
            Request one
          </Link>
        </p>
      </div>
    </AuthStoryPanel>
  );
}

export default ResetPasswordPage;
