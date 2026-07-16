import { useState } from 'react';
import api from '../services/api';

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

      // Store token in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Tell App component login was successful
      onLogin(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-md">

        <div className="mb-8 text-center">
          <h1 className="font-engraved text-6xl font-bold text-primary-dark">
            QUANT
          </h1>
          <p className="mt-2 font-sans text-sm font-semibold uppercase tracking-widest text-gold">
            Savings Intelligence
          </p>
        </div>

        <div className="rounded-lg border-t-4 border-gold bg-white p-8 shadow-lg">
          <h2 className="mb-2 font-serif text-3xl font-bold text-primary-dark">
            Welcome Back
          </h2>
          <p className="mb-6 font-sans text-sm text-taupe">
            Sign in to review your goals, budget, and expense analytics.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="mb-2 block font-sans text-sm font-semibold text-primary-dark">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 font-sans transition-colors focus:border-gold focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block font-sans text-sm font-semibold text-primary-dark">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 font-sans transition-colors focus:border-gold focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded border-l-4 border-red-500 bg-red-50 p-4">
                <p className="font-sans text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gold px-6 py-3 font-sans font-semibold text-primary-dark transition-colors hover:bg-gold-light disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center font-sans text-sm text-taupe">
            Don't have an account?{' '}
            <button
              onClick={() => onLogin(null, null, 'register')}
              className="font-semibold text-gold hover:underline"
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
