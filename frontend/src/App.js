import { useState, useEffect } from 'react';
import api from './services/api';
import BudgetSetup from './components/BudgetSetup';
import CreateGoalForm from './components/CreateGoalForm';
import TransactionForm from './components/TransactionForm';
import TransactionHistory from './components/TransacrionHistory';
import Dashboard from './components/Dashboard';
import GoalActions from './components/GoalActions';
import ExpenseForm from './components/ExpenseForm';
import ExpenseSummary from './components/ExpenseSummary';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authPage, setAuthPage] = useState('login');
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthlyBudget, setMonthlyBudget] = useState(null);
  const [expenseRefresh, setExpenseRefresh] = useState(0);

  // Check for existing session on app load
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch data when user logs in
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const goalsResponse = await api.get(
        `/goals?userId=${user.user_id}`
      );
      setGoals(goalsResponse.data.goals);
      setMonthlyBudget(user.monthly_budget);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogin = (userData, userToken, redirect) => {
    if (redirect === 'register') {
      setAuthPage('register');
      return;
    }
    setUser(userData);
    setToken(userToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setGoals([]);
    setMonthlyBudget(null);
    setAuthPage('login');
  };

  const handleBudgetSet = (budget) => {
    setMonthlyBudget(budget);
    // Update stored user data
    const updatedUser = { ...user, monthly_budget: budget };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    fetchData();
  };

  const handleGoalCreated = (newGoal) => {
    setGoals(prev => [...prev, newGoal]);
  };

  // Show auth pages if not logged in
  if (!user) {
    if (authPage === 'register') {
      return (
        <RegisterPage
          onRegister={handleLogin}
          onSwitchToLogin={() => setAuthPage('login')}
        />
      );
    }
    return <LoginPage onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
          <p className="mt-4 text-primary-dark font-sans text-lg">
            Loading your goals...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-serif text-2xl font-bold mb-2">Error</h2>
          <p className="text-red-700 font-sans">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-primary-dark text-cream shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="font-serif text-4xl font-bold">Savings Planner</h1>
            <p className="font-sans text-gold-light text-sm mt-1">
              Welcome back, {user.first_name}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-transparent border-2 border-gold text-gold hover:bg-gold hover:text-primary-dark px-4 py-2 rounded-lg font-sans font-semibold transition-colors text-sm"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">

        {/* Budget Setup */}
        <BudgetSetup
          userId={user.user_id}
          currentBudget={monthlyBudget}
          onBudgetSet={handleBudgetSet}
        />

        {/* Create Goal Form */}
        <CreateGoalForm
          userId={user.user_id}
          onGoalCreated={handleGoalCreated}
        />

        {/* Dashboard Overview */}
        {goals.length > 0 && monthlyBudget && (
          <Dashboard
            userId={user.user_id}
            monthlyBudget={monthlyBudget}
            goals={goals}
          />
        )}

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gold">
            <p className="font-sans text-taupe text-sm uppercase tracking-wide mb-2">Total Goals</p>
            <p className="font-serif text-4xl font-bold text-primary-dark">{goals.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gold-light">
            <p className="font-sans text-taupe text-sm uppercase tracking-wide mb-2">Total Target</p>
            <p className="font-serif text-4xl font-bold text-primary-dark">
              ${goals.reduce((sum, g) => sum + parseFloat(g.target_amount), 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gold">
            <p className="font-sans text-taupe text-sm uppercase tracking-wide mb-2">Total Saved</p>
            <p className="font-serif text-4xl font-bold text-primary-dark">
              ${goals.reduce((sum, g) => sum + parseFloat(g.saved_amount), 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Goals List */}
        <section>
          <h2 className="font-serif text-3xl font-bold text-primary-dark mb-8">
            Your Goals
          </h2>

          {goals.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="font-sans text-taupe text-lg">
                No goals yet. Create your first goal to get started!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {goals.map(goal => (
                <div
                  key={goal.goal_id}
                  className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 border-t-4 border-gold"
                >
                  <div className="bg-gradient-to-r from-primary-dark to-primary-dark-alt p-6 text-cream">
                    <h3 className="font-serif text-2xl font-bold mb-2">{goal.name}</h3>
                  </div>

                  <div className="p-6">

                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-sans text-sm text-taupe font-semibold">Progress</p>
                        <p className="font-serif text-sm font-bold text-gold">{goal.percentage_complete}%</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-gold to-gold-light h-2 rounded-full transition-all duration-500"
                          style={{ width: `${goal.percentage_complete}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Goal Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
                      <div>
                        <p className="font-sans text-xs text-taupe uppercase tracking-wide mb-1">Target</p>
                        <p className="font-serif text-xl font-bold text-primary-dark">${parseFloat(goal.target_amount).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-sans text-xs text-taupe uppercase tracking-wide mb-1">Saved</p>
                        <p className="font-serif text-xl font-bold text-gold">${parseFloat(goal.saved_amount).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-sans text-xs text-taupe uppercase tracking-wide mb-1">Remaining</p>
                        <p className="font-serif text-xl font-bold text-primary-dark">${parseFloat(goal.remaining_amount).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-sans text-xs text-taupe uppercase tracking-wide mb-1">Days Left</p>
                        <p className="font-serif text-xl font-bold text-primary-dark">{goal.days_remaining}</p>
                      </div>
                    </div>

                    {/* Savings Needed */}
                    <div className="mb-6">
                      <p className="font-sans text-sm text-taupe font-semibold mb-4">What You Need to Save</p>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-cream rounded-lg p-3 border-l-2 border-gold">
                          <p className="font-sans text-xs text-taupe uppercase tracking-wide mb-1">Daily</p>
                          <p className="font-serif text-lg font-bold text-primary-dark">${parseFloat(goal.savings_needed.daily).toFixed(2)}</p>
                        </div>
                        <div className="bg-cream rounded-lg p-3 border-l-2 border-gold-light">
                          <p className="font-sans text-xs text-taupe uppercase tracking-wide mb-1">Weekly</p>
                          <p className="font-serif text-lg font-bold text-primary-dark">${parseFloat(goal.savings_needed.weekly).toFixed(2)}</p>
                        </div>
                        <div className="bg-cream rounded-lg p-3 border-l-2 border-gold">
                          <p className="font-sans text-xs text-taupe uppercase tracking-wide mb-1">Monthly</p>
                          <p className="font-serif text-lg font-bold text-primary-dark">${parseFloat(goal.savings_needed.monthly).toFixed(2)}</p>
                        </div>
                        <div className="bg-cream rounded-lg p-3 border-l-2 border-gold-light">
                          <p className="font-sans text-xs text-taupe uppercase tracking-wide mb-1">Yearly</p>
                          <p className="font-serif text-lg font-bold text-primary-dark">${parseFloat(goal.savings_needed.annual).toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="bg-primary-dark text-cream rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-sans text-sm font-semibold">Monthly Allocation</p>
                          <p className="font-serif text-xl font-bold text-gold">${parseFloat(goal.allocated_monthly_amount).toFixed(2)}</p>
                        </div>
                        <p className="font-sans text-xs">
                          {goal.is_feasible ? (
                            <span className="text-green-300">✓ Achievable with current budget</span>
                          ) : (
                            <span className="text-orange-300">⚠ Shortfall: ${parseFloat(goal.savings_needed.monthly - goal.allocated_monthly_amount).toFixed(2)}/month</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex gap-2 mb-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-sans font-semibold ${goal.on_track ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {goal.on_track ? '✓ On Track' : '⚠ Behind'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-sans font-semibold ${goal.is_feasible ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                        {goal.is_feasible ? 'Achievable' : 'Needs Help'}
                      </span>
                    </div>

                    {/* Transactions */}
                    <div className="space-y-4">
                      <TransactionForm
                        goalId={goal.goal_id}
                        userId={user.user_id}
                        goalName={goal.name}
                        onTransactionAdded={(updatedGoal) => {
                          setGoals(goals.map(g =>
                            g.goal_id === updatedGoal.goal_id ? updatedGoal : g
                          ));
                        }}
                      />
                      <TransactionHistory goalId={goal.goal_id} />
                    </div>

                    {/* Goal Actions */}
                    <GoalActions
                      goalId={goal.goal_id}
                      onGoalDeleted={(deletedId) => {
                        setGoals(goals.filter(g => g.goal_id !== deletedId));
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Expense Tracker */}
        <div className="border-t-2 border-gold my-12"></div>
        <section className="space-y-8">
          <ExpenseForm
            userId={user.user_id}
            onExpenseAdded={() => setExpenseRefresh(prev => prev + 1)}
          />
          <ExpenseSummary
            userId={user.user_id}
            monthlyBudget={monthlyBudget}
            refreshTrigger={expenseRefresh}
          />
        </section>
      </main>
    </div>
  );
}

export default App;