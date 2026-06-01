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
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl font-bold text-primary-dark mb-2">
            Savings Planner
          </h1>
          <p className="font-sans text-taupe">Sign in to your account</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 border-t-4 border-gold">
          <h2 className="font-serif text-2xl font-bold text-primary-dark mb-6">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block font-sans text-sm font-semibold text-primary-dark mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-sans focus:outline-none focus:border-gold transition-colors"
              />
            </div>

            <div>
              <label className="block font-sans text-sm font-semibold text-primary-dark mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-sans focus:outline-none focus:border-gold transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="font-sans text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-light text-primary-dark px-6 py-3 rounded-lg font-sans font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="font-sans text-center text-taupe text-sm mt-6">
            Don't have an account?{' '}
            <button
              onClick={() => onLogin(null, null, 'register')}
              className="text-gold font-semibold hover:underline"
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