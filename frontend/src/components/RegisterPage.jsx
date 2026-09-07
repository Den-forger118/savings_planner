import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getFriendlyError } from '../utils/friendlyError';
import { hasPendingGoal } from '../utils/pendingGoal';
import ErrorBanner from './ErrorBanner';
import AuthStoryPanel from './AuthStoryPanel';
import { PATHS } from '../utils/paths';

function RegisterPage({ onRegister }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

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
      const response = await api.post('/auth/register', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        password: formData.password,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onRegister(response.data.user, response.data.token);
      const next =
        response.data.user.onboarding_complete === false
          ? PATHS.onboarding
          : PATHS.dashboard;
      navigate(next, { replace: true });
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t create your account. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthStoryPanel variant="register">
      <div>
        <p className="font-sans text-[11px] font-normal uppercase tracking-[0.16em] text-taupe/80">
          Open Account
        </p>
        <h2 className="mt-1.5 font-serif text-[1.85rem] font-light tracking-[-0.03em] text-primary-dark sm:text-[2.1rem]">
          Get started
        </h2>
        <p className="mt-2 max-w-sm font-sans text-[14px] font-light leading-snug text-taupe">
          {hasPendingGoal()
            ? 'Your goal is saved — finish setup and you will review it before it goes on the ledger.'
            : 'Create your account to manage savings goals and expense analytics.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            <div>
              <label className="mb-1.5 block font-sans text-[11px] font-normal uppercase tracking-[0.14em] text-taupe">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="John"
                className="auth-field-underline"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-sans text-[11px] font-normal uppercase tracking-[0.14em] text-taupe">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Doe"
                className="auth-field-underline"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-sans text-[11px] font-normal uppercase tracking-[0.14em] text-taupe">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="auth-field-underline"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-sans text-[11px] font-normal uppercase tracking-[0.14em] text-taupe">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              className="auth-field-underline"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-sans text-[11px] font-normal uppercase tracking-[0.14em] text-taupe">
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
            />
          </div>

          {error && <ErrorBanner message={error} />}

          <button
            type="submit"
            disabled={loading}
            className="btn-navy mt-1 w-full rounded-xl py-3 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center font-sans text-sm text-taupe">
          Already have an account?{' '}
          <Link
            to={PATHS.login}
            className="font-normal text-primary-dark transition-colors hover:text-gold"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthStoryPanel>
  );
}

export default RegisterPage;
