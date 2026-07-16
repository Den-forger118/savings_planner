import { useState, useEffect } from 'react';
import api from '../services/api';

const parseAmount = (value) => parseFloat(value) || 0;

function LastTransactionSnippet({ goalId, refreshKey = 0, onViewActivity }) {
  const [latest, setLatest] = useState(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatest();
  }, [goalId, refreshKey]);

  const fetchLatest = async () => {
    setLoading(true);

    try {
      const response = await api.get(`/transactions?goalId=${goalId}&page=1&limit=1`);
      const transactions = response.data.transactions || [];
      setCount(response.data.pagination?.total_count || transactions.length);
      setLatest(transactions[0] || null);
    } catch (err) {
      console.error('Error fetching latest transaction:', err);
      setLatest(null);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <p className="font-sans text-xs text-taupe">Loading activity...</p>
    );
  }

  if (!latest) {
    return (
      <p className="font-sans text-xs italic text-taupe">
        No transactions yet. Record your first deposit!
      </p>
    );
  }

  const amount = parseAmount(latest.amount);
  const isDeposit = latest.type === 'deposit';

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
      <p className="font-sans text-xs text-taupe">
        Latest:{' '}
        <span className={`font-semibold ${isDeposit ? 'text-primary-dark' : 'text-red-700'}`}>
          {isDeposit ? '+' : '−'}${amount.toFixed(2)} {latest.type}
        </span>
        {' · '}
        {new Date(latest.created_at).toLocaleDateString()}
      </p>
      {count > 1 && onViewActivity && (
        <button
          type="button"
          onClick={() => onViewActivity(goalId)}
          className="font-sans text-xs font-semibold text-gold hover:underline"
        >
          {count} transactions →
        </button>
      )}
    </div>
  );
}

export default LastTransactionSnippet;
