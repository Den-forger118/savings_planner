import { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from './Pagination';

function TransactionHistory({ goalId }) {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    fetchTransactions();
  }, [goalId, page, limit]);

  const fetchTransactions = async () => {
    setLoading(true);

    try {
      const response = await api.get(
        `/transactions?goalId=${goalId}&page=${page}&limit=${limit}`
      );
      setTransactions(response.data.transactions || []);
      setPagination(response.data.pagination || null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setTransactions([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="font-sans text-sm text-taupe">Loading transactions...</p>;
  }

  if (!pagination?.total_count) {
    return (
      <p className="font-sans text-sm text-taupe italic">
        No transactions yet. Record your first deposit!
      </p>
    );
  }

  return (
    <div>
      <h4 className="mb-3 font-serif text-lg font-bold text-primary-dark">
        Transaction History
      </h4>
      <div className="space-y-2">
        {transactions.map(tx => (
          <div
            key={tx.transaction_id}
            className="flex items-center justify-between rounded-lg border-l-4 bg-white p-3"
            style={{
              borderColor: tx.type === 'deposit' ? '#D4A574' : '#E8C77A',
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
      <Pagination
        pagination={pagination}
        onPageChange={setPage}
        onLimitChange={(nextLimit) => {
          setLimit(nextLimit);
          setPage(1);
        }}
        limitOptions={[10, 25]}
      />
    </div>
  );
}

export default TransactionHistory;
