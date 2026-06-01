import { useState } from 'react';
import api from '../services/api';

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

    // Frontend validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          password: formData.password
        }
      );

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      onRegister(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl font-bold text-primary-dark mb-2">
            Savings Planner
          </h1>
          <p className="font-sans text-taupe">Create your account</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 border-t-4 border-gold">
          <h2 className="font-serif text-2xl font-bold text-primary-dark mb-6">
            Get Started
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-sans text-sm font-semibold text-primary-dark mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="John"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-sans focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block font-sans text-sm font-semibold text-primary-dark mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Doe"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-sans focus:outline-none focus:border-gold transition-colors"
                />
              </div>
            </div>

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
                placeholder="Minimum 8 characters"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-sans focus:outline-none focus:border-gold transition-colors"
              />
            </div>

            <div>
              <label className="block font-sans text-sm font-semibold text-primary-dark mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat your password"
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
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="font-sans text-center text-taupe text-sm mt-6">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-gold font-semibold hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;