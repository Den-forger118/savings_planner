import axios from 'axios';

/** Ensure production API URLs are absolute (missing https:// makes the browser call Vercel + path). */
const resolveApiBaseUrl = () => {
  const raw = (process.env.REACT_APP_API_URL || 'http://localhost:5001/api').trim();
  if (!raw) return 'http://localhost:5001/api';
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '');
  // Host-only values from bad Vercel env entries, e.g. myapi.up.railway.app/api
  return `https://${raw.replace(/^\/+/, '').replace(/\/$/, '')}`;
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const message = error.response?.data?.error || '';
      const isAuthAttempt = /\/auth\/(login|register)/.test(error.config?.url || '');

      if (message.includes('Admin access') || isAuthAttempt) {
        return Promise.reject(error);
      }

      if (localStorage.getItem('token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;