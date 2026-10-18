import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import reportWebVitals from './reportWebVitals';
import { registerQuantServiceWorker } from './utils/webPushClient';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

reportWebVitals();

// Register early so push can attach later from Settings (no permission prompt here).
if (process.env.NODE_ENV === 'production' || window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
  registerQuantServiceWorker().catch(() => {
    /* non-fatal */
  });
}
