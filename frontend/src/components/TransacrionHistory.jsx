import { useState, useEffect } from 'react';
import axios from 'axios';

function TransactionHistory({ goalId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [goalId]);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5001/api/transactions?goalId=${goalId}`
      );
      setTransactions(response.data.transactions);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="font-sans text-sm text-taupe">Loading transactions...</p>;
  }

  if (transactions.length === 0) {
    return (
      <p className="font-sans text-sm text-taupe italic">
        No transactions yet. Record your first deposit!
      </p>
    );
  }

  return (
    <div>
      <h4 className="font-serif text-lg font-bold text-primary-dark mb-3">
        Transaction History
      </h4>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {transactions.map(tx => (
          <div 
            key={tx.transaction_id}
            className="flex justify-between items-center p-3 bg-white rounded-lg border-l-4"
            style={{
              borderColor: tx.type === 'deposit' ? '#D4A574' : '#E8C77A'
            }}
          >
            <div className="flex-1">
              <p className="font-sans font-semibold text-primary-dark">
                {tx.type === 'deposit' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
              </p>
              {tx.note && (
                <p className="font-sans text-xs text-taupe">{tx.note}</p>
              )}
            </div>
            <p className="font-sans text-xs text-taupe">
              {new Date(tx.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TransactionHistory;