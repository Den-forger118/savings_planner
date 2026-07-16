const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const userModel = require('../models/userModel');
const goalModel = require('../models/goalModel');
const calculationModel = require('../models/calculationModel');
const transactionModel = require('../models/transactionModel');
const expenseModel = require('../models/expenseModel');
const { getUserBudgetContext } = require('../utils/budgetContext');
const pool = require('../dbcon');
// Get user details by ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await userModel.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



router.get('/:userId/budget-allocation', async (req, res) => {
  try {
    const { userId } = req.params;
    const budgetContext = await getUserBudgetContext(userId);

    if (budgetContext.mode !== 'earner') {
      return res.status(400).json({
        error: 'Budget allocation is only available in Earner mode. Enable Earner mode in Settings.',
      });
    }

    if (budgetContext.monthlyBudget === null) {
      return res.status(400).json({ error: 'Please set your monthly budget first' });
    }

    const monthlyBudget = budgetContext.monthlyBudget;
    const goals = await goalModel.getGoalsByUserId(userId);
    const allocatedGoals = calculationModel.calculateAutoAllocations(goals, monthlyBudget);

    const goalBreakdown = goals.map((goal) => {
      const allocation = allocatedGoals.find((item) => item.goal_id === goal.goal_id);
      const details = calculationModel.getGoalBreakdown(
        goal,
        allocation?.allocated_monthly_amount ?? 0
      );

      return {
        goal_id: goal.goal_id,
        name: goal.name,
        target_amount: details.target_amount,
        deadline: details.deadline,
        days_remaining: details.days_remaining,
        daily_needed: details.savings_needed.daily,
        monthly_needed: details.savings_needed.monthly,
        allocated_monthly: details.allocated_monthly_amount,
        allocation_percentage: allocation?.allocation_percentage ?? 0,
        is_feasible: details.is_feasible,
      };
    });

    const totalAllocationSum = calculationModel.roundToTwo(
      goalBreakdown.reduce((sum, goal) => sum + goal.allocated_monthly, 0)
    );

    res.json({
      user_id: Number.parseInt(userId, 10),
      monthly_budget: monthlyBudget,
      goals: goalBreakdown,
      total_allocation_sum: totalAllocationSum,
      any_goals_underfunded: goalBreakdown.some((goal) => !goal.is_feasible),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user's monthly budget

router.put('/:userId/budget', async (req, res) => {
  try {
    const { userId } = req.params;
    const { monthly_budget } = req.body;
    
    if (!monthly_budget || monthly_budget < 0) {
      return res.status(400).json({ error: 'Please provide a valid monthly_budget' });
    }
    
    const query = 'UPDATE users SET monthly_budget = $2 WHERE user_id = $1 RETURNING user_id, first_name, last_name, email, monthly_budget, is_earner, currency, theme, ui_density, fiscal_start_month, preferences, created_at';
    const result = await pool.query(query, [userId, monthly_budget]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'Budget updated successfully', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:userId/earner-mode', async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_earner: isEarner } = req.body;

    if (typeof isEarner !== 'boolean') {
      return res.status(400).json({ error: 'Please provide is_earner as a boolean' });
    }

    if (isEarner) {
      const user = await userModel.getUserMonthlyBudgetById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const monthlyBudget = calculationModel.roundToTwo(user.monthly_budget);

      if (!monthlyBudget || monthlyBudget <= 0) {
        return res.status(400).json({
          error: 'Set a monthly budget before enabling Earner mode',
        });
      }
    }

    const user = await userModel.updateEarnerMode(userId, isEarner);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: isEarner ? 'Earner mode enabled' : 'Non-earner mode enabled',
      user,
      mode: isEarner ? 'earner' : 'non-earner',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:userId/onboarding', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await userModel.completeOnboarding(userId, req.body);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: req.body.onboarding_complete ? 'Onboarding complete' : 'Preferences updated',
      user: {
        ...user,
        mode: user.is_earner ? 'earner' : 'non-earner',
        onboarding_complete: user.onboarding_complete === true,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:userId/preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await userModel.updatePreferences(userId, req.body);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Preferences updated', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:userId/password', async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const profile = await userModel.getUserById(userId);

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await userModel.getUserByEmail(profile.email);

    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userModel.updatePassword(userId, passwordHash);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:userId/export', async (req, res) => {
  try {
    const { userId } = req.params;
    const { format = 'json' } = req.query;

    const user = await userModel.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const goals = await goalModel.getGoalsByUserId(userId);
    const transactions = await transactionModel.getTransactionsWithGoalByUserId(userId);
    const categories = await expenseModel.getCategoriesByUserId(userId);
    const expenses = await expenseModel.getAllExpensesByUserId(userId);

    const payload = {
      exported_at: new Date().toISOString(),
      member: {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        currency: user.currency || 'USD',
        monthly_budget: user.monthly_budget,
        is_earner: user.is_earner,
      },
      goals,
      transactions,
      categories,
      expenses,
    };

    if (format === 'csv') {
      const lines = [
        'QUANT Financial Statement',
        `Exported,${payload.exported_at}`,
        '',
        'Goals',
        'Name,Target,Saved,Deadline,Complete',
        ...goals.map((g) =>
          [
            g.name,
            g.target_amount,
            g.saved_amount,
            g.deadline,
            g.is_complete ? 'Yes' : 'No',
          ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
        ),
        '',
        'Transactions',
        'Date,Goal,Type,Amount,Note',
        ...transactions.map((tx) =>
          [
            tx.created_at,
            tx.goal_name || '',
            tx.type,
            tx.amount,
            tx.note || '',
          ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
        ),
      ];

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="quant-financial-statement.csv"');
      return res.send(lines.join('\n'));
    }

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
