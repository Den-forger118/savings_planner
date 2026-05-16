import {useState} from 'react';
import axios from 'axios';

function BudgetSetup({userId, currentBudget, onBudgetSet}) { 
    // State to hold the new budget input
    const [monthlyBudget, setMonthlyBudget] = useState(currentBudget || '');
    const [isEditing, setIsEditing] = useState(!currentBudget);
    const [loading , setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Function to handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!monthlyBudget || monthlyBudget <= 0) {
            setError('Please enter a valid monthly budget greater than 0.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            //update the user's monthly budget via API
            await axios.put(
                `http://localhost:5001/api/users/${userId}/budget`,
                { monthly_budget: parseFloat(monthlyBudget) }
            );

            //call the parent callback to update the budget in the app state
            onBudgetSet(parseFloat(monthlyBudget));
            setIsEditing(false);
           } catch (err) {
            setError('Failed to update budget. Please try again.');
        } finally {
            setLoading(false);  

        }

 //display mode when budget is set
        if (!isEditing && currentBudget) {
    return (
      <div className="bg-gradient-to-r from-primary-dark to-primary-dark-alt rounded-lg shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-sans text-cream text-sm uppercase tracking-wide mb-2">Monthly Budget</p>
            <p className="font-serif text-4xl font-bold text-gold">${parseFloat(currentBudget).toFixed(2)}</p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-gold hover:bg-gold-light text-primary-dark px-4 py-2 rounded-lg font-sans font-semibold transition-colors"
          >
            Edit Budget
          </button>
        </div>
      </div>
    );   
  
    }};

      return (
        <div className="bg-white rounded-lg p-8 mb-8 boarder-1-4 boarder-gold">
            <h2 className="font-serif text-2x1 font-bold text primary-dark mb-2">
                Set Your Monthly Budget
            </h2>
            <p className='font-sans text-taupe mb-6'>
              How much can you realistically spend each month? This budget will automaatically distributed across your spending categories, helping you stay on track with your financial goals.
            </p>
        
        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Input field for monthly budget */}
          <div>
            <label className='block font-sans text-sm font-semibold text-primary-dark mb-2'>
              Monthly Budget
            </label>
            <div className='flex items-center gap-2'>
              <span className='text-2xl font-serif text-gold'>$</span>
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="500.00"
                step="0.01"
                min="0"
                className='flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-sans text-lg focus:outline-none focus:border-gold transition-colors'
              />
            </div>
             <p className="font-sans text-xs text-taupe mt-2">
            This is the total amount you can save per month across all your goals.
          </p>
          </div>
           {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="font-sans text-red-700">{error}</p>
          </div>
        )}

         {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gold hover:bg-gold-light text-primary-dark px-6 py-3 rounded-lg font-sans font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Set Budget'}
          </button>
          {currentBudget && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-3 border-2 border-taupe text-taupe rounded-lg font-sans font-semibold hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
        </form>
        </div>
           );
  
  }

  //Edit mode(form)

  

export default BudgetSetup;
