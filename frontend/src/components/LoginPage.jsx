import { useState } from 'react';
import api from '../services/api';
import { getFriendlyError } from '../utils/friendlyError';
import ErrorBanner from './ErrorBanner';

function LoginPage({ onLogin }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/login', formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLogin(response.data.user, response.data.token);
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t sign you in. Please check your details and try again.'));
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
          <p className="mt-3 font-sans text-[10px] font-normal uppercase tracking-[0.18em] text-gold">
            Private Savings Intelligence
          </p>
        </div>

        <div className="surface overflow-hidden">
          <div className="border-b border-primary-dark/[0.06] bg-navy-sheen px-7 py-5 text-cream">
            <p className="font-sans text-[10px] font-normal uppercase tracking-[0.14em] text-gold">
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
                />
              </div>

              {error && <ErrorBanner message={error} />}

              <button type="submit" disabled={loading} className="btn-accent mt-2 w-full py-3">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="mt-6 text-center font-sans text-sm text-taupe">
              Don&apos;t have an account?{' '}
              <button
                onClick={() => onLogin(null, null, 'register')}
                className="font-normal text-primary-dark underline decoration-gold/50 underline-offset-4 transition-colors hover:text-gold"
              >
                Create one
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
