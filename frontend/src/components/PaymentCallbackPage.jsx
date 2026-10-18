import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { formatMoney } from '../utils/currency';
import { PATHS } from '../utils/paths';
import { getFriendlyError } from '../utils/friendlyError';

function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('reference') || searchParams.get('trxref') || '';

  const [status, setStatus] = useState('loading');
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!reference) {
      setStatus('error');
      setError('Missing payment reference.');
      return undefined;
    }

    let cancelled = false;
    let attempts = 0;

    const verify = async () => {
      try {
        const response = await api.get(`/payments/verify/${encodeURIComponent(reference)}`);
        if (cancelled) return;

        const payload = response.data;
        if (payload.status === 'success') {
          setDetail(payload);
          setStatus('success');
          return;
        }

        attempts += 1;
        if (attempts < 6 && (payload.status === 'pending' || payload.status === 'ongoing')) {
          window.setTimeout(verify, 1500);
          return;
        }

        setDetail(payload);
        setStatus(payload.status === 'failed' || payload.status === 'abandoned' ? 'failed' : 'pending');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setError(getFriendlyError(err, 'We couldn’t confirm that payment. Check Activity shortly.'));
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  const moneyLabel = detail
    ? formatMoney(detail.amount, detail.currency || 'GHS')
    : null;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-16">
      <p className="font-sans text-xs font-normal uppercase tracking-[0.14em] text-taupe">
        Paystack deposit
      </p>

      {status === 'loading' && (
        <>
          <h1 className="mt-3 font-serif text-3xl font-light tracking-[-0.02em] text-primary-dark">
            Confirming payment…
          </h1>
          <p className="mt-3 font-sans text-sm text-taupe">
            Hold on while QUANT matches your Paystack payment to the goal.
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <h1 className="mt-3 font-serif text-3xl font-light tracking-[-0.02em] text-primary-dark">
            Deposit recorded
          </h1>
          <p className="mt-3 font-sans text-sm leading-relaxed text-taupe">
            {moneyLabel} was added to{' '}
            <span className="text-primary-dark">{detail?.goal_name || 'your goal'}</span>
            {detail?.goal_completed ? ' — and the goal is now fully funded.' : '.'}
          </p>
        </>
      )}

      {status === 'pending' && (
        <>
          <h1 className="mt-3 font-serif text-3xl font-light tracking-[-0.02em] text-primary-dark">
            Still confirming
          </h1>
          <p className="mt-3 font-sans text-sm text-taupe">
            Paystack has not marked this payment successful yet. Check Activity in a minute, or try again.
          </p>
        </>
      )}

      {(status === 'failed' || status === 'error') && (
        <>
          <h1 className="mt-3 font-serif text-3xl font-light tracking-[-0.02em] text-primary-dark">
            Payment not completed
          </h1>
          <p className="mt-3 font-sans text-sm text-taupe">
            {error || 'The payment did not go through. No goal balance was changed.'}
          </p>
        </>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-navy min-h-[44px]"
          onClick={() => navigate(PATHS.savings)}
        >
          Back to goals
        </button>
        <Link to={PATHS.activity} className="btn-ghost inline-flex min-h-[44px] items-center px-4">
          View activity
        </Link>
      </div>
    </div>
  );
}

export default PaymentCallbackPage;
