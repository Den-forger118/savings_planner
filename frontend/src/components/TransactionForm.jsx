import { useState } from 'react';
import api from '../services/api';

function TransactionForm({ goalId, userId, goalName, onTransactionAdded }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('deposit');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/transactions', {
        userId,
        goalId,
        amount: parseFloat(amount),
        type,
        note
      });

      setSuccess(true);
      onTransactionAdded(response.data.updated_goal, response.data);
      
      // Reset form
      setAmount('');
      setType('deposit');
      setNote('');
      
      // Clear success message after 2 seconds
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-cream rounded-lg p-4 border-2 border-gold-light">
      <h4 className="font-serif text-lg font-bold text-primary-dark mb-4">
        Record a {type === 'deposit' ? 'Deposit' : 'Withdrawal'}
      </h4>

      <form onSubmit={handleSubmit} className="space-y-3">
        
        {/* Type Selector */}
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="deposit"
              checked={type === 'deposit'}
              onChange={(e) => setType(e.target.value)}
              className="w-4 h-4"
            />
            <span className="font-sans text-sm text-primary-dark">Deposit (Save)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="withdrawal"
              checked={type === 'withdrawal'}
              onChange={(e) => setType(e.target.value)}
              className="w-4 h-4"
            />
            <span className="font-sans text-sm text-primary-dark">Withdrawal</span>
          </label>
        </div>

        {/* Amount Input */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-money text-gold">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100.00"
            step="0.01"
            min="0"
            className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg font-sans text-sm focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        {/* Note Input */}
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note (e.g., 'Monthly savings')"
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg font-sans text-sm focus:outline-none focus:border-gold transition-colors"
        />

        {/* Error Message */}
        {error && (
          <p className="text-red-600 font-sans text-xs">{error}</p>
        )}

        {/* Success Message */}
        {success && (
          <p className="text-green-600 font-sans text-xs">✓ Recorded successfully!</p>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold hover:bg-gold-light text-primary-dark px-3 py-2 rounded-lg font-sans font-semibold text-sm transition-colors disabled:opacity-50"
        >
          {loading ? 'Recording...' : 'Record Transaction'}
        </button>
      </form>
    </div>
  );
}

export default TransactionForm;
