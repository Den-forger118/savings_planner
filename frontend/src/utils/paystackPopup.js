const INLINE_SCRIPT_SRC = 'https://js.paystack.co/v2/inline.js';

function loadPaystackScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Paystack popup is only available in the browser'));
  }

  if (window.PaystackPop) {
    return Promise.resolve(window.PaystackPop);
  }

  const existing = document.querySelector(`script[src="${INLINE_SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(window.PaystackPop));
      existing.addEventListener('error', () => reject(new Error('Failed to load Paystack')));
      if (window.PaystackPop) resolve(window.PaystackPop);
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = INLINE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.PaystackPop) resolve(window.PaystackPop);
      else reject(new Error('Paystack script loaded without PaystackPop'));
    };
    script.onerror = () => reject(new Error('Failed to load Paystack'));
    document.body.appendChild(script);
  });
}

/**
 * Open Paystack Inline checkout for a server-initialized transaction.
 * Uses access_code so amount/metadata stay server-controlled.
 */
export async function openPaystackPopup({ accessCode, onSuccess, onCancel, onError }) {
  if (!accessCode) {
    throw new Error('Missing Paystack access code');
  }

  const PaystackPop = await loadPaystackScript();
  const popup = new PaystackPop();

  popup.resumeTransaction(accessCode, {
    onSuccess: (transaction) => {
      onSuccess?.(transaction);
    },
    onCancel: () => {
      onCancel?.();
    },
    onError: (error) => {
      onError?.(error);
    },
  });
}
