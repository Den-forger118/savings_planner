import { useState } from 'react';
import api from '../services/api';
import { getFriendlyError } from '../utils/friendlyError';
import ErrorBanner from './ErrorBanner';

function RegisterPage({ onRegister, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
        password: formData.password
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onRegister(response.data.user, response.data.token);
    } catch (err) {
      setError(getFriendlyError(err, 'We couldn’t create your account. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-canvas flex min-h-screen items-center justify-center px-4 py-12">
      <div className="relative z-10 w-full max-w-[440px]">
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
              Open Account
            </p>
            <h2 className="mt-1 font-serif text-3xl font-light tracking-[-0.025em]">
              Get started
            </h2>
          </div>

          <div className="px-7 py-7">
            <p className="mb-6 font-sans text-sm leading-relaxed text-taupe">
              Create your account to manage savings goals and expense analytics.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="John"
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Doe"
                    className="field"
                  />
                </div>
              </div>

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
                  placeholder="Minimum 8 characters"
                  className="field"
                />
              </div>

              <div>
                <label className="field-label">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  className="field"
                />
              </div>

              {error && <ErrorBanner message={error} />}

              <button type="submit" disabled={loading} className="btn-accent mt-2 w-full py-3">
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <p className="mt-6 text-center font-sans text-sm text-taupe">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="font-normal text-primary-dark underline decoration-gold/50 underline-offset-4 transition-colors hover:text-gold"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
