const express = require('express');
const router = express.Router();
const goalModel = require('../models/goalModel');
const userModel = require('../models/userModel');
const expenseModel = require('../models/expenseModel');
const transactionModel = require('../models/transactionModel');
const calculationModel = require('../models/calculationModel');
const { getUserBudgetContext } = require('../utils/budgetContext');

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildGoalBreakdowns = async (userId) => {
  const budgetContext = await getUserBudgetContext(userId);
  const goals = await goalModel.getGoalsByUserId(userId);
  const monthlyBudget = budgetContext.mode === 'earner'
    ? (budgetContext.monthlyBudget ?? 0)
    : 0;
  const allocatedGoals = budgetContext.mode === 'earner'
    ? calculationModel.calculateAutoAllocations(goals, monthlyBudget)
    : [];

  const breakdowns = goals.map((goal) => {
    const allocation = allocatedGoals.find((item) => item.goal_id === goal.goal_id);
    const breakdown = calculationModel.getGoalBreakdown(
      goal,
      budgetContext.mode === 'earner' ? allocation?.allocated_monthly_amount ?? 0 : 0
    );

    return {
      ...breakdown,
      allocation_percentage: budgetContext.mode === 'earner' ? allocation?.allocation_percentage ?? 0 : null,
      weight_magnitude: budgetContext.mode === 'earner' ? allocation?.weight_magnitude ?? 0 : null,
      weight_urgency: budgetContext.mode === 'earner' ? allocation?.weight_urgency ?? 0 : null,
      score: budgetContext.mode === 'earner' ? allocation?.score ?? 0 : null,
    };
  });

  return { budgetContext, monthlyBudget, goals, breakdowns };
};

const buildOnTrackExample = (goal) => {
  const daysTotal = calculationModel.getDaysBetween(goal.created_at, goal.deadline);
  const daysRemaining = goal.days_remaining;
  const target = goal.target_amount;
  const saved = goal.saved_amount;
  const progressRequired = (daysTotal - daysRemaining) / Math.max(daysTotal, 1);
  const expectedSaved = calculationModel.roundToTwo(progressRequired * target);
  const paceRatio = expectedSaved > 0
    ? calculationModel.roundToTwo((saved / expectedSaved) * 100)
    : 100;

  return {
    expected_saved: expectedSaved,
    actual_saved: saved,
    pace_ratio: paceRatio,
    on_track: goal.on_track,
    status_label: goal.on_track ? 'ON TRACK' : 'BEHIND',
  };
};

const buildFormulasResponse = (monthlyBudget, breakdowns, mode = 'earner') => {
  const primary = breakdowns[0] ?? null;

  const totalMonthlyNeeded = calculationModel.roundToTwo(
    breakdowns.reduce((sum, goal) => sum + goal.savings_needed.monthly, 0)
  );
  const totalAllocated = calculationModel.roundToTwo(
    breakdowns.reduce((sum, goal) => sum + goal.allocated_monthly_amount, 0)
  );
  const feasibleCount = breakdowns.filter((goal) => goal.is_feasible).length;
  const budgetUtilization = monthlyBudget > 0
    ? calculationModel.roundToTwo((totalAllocated / monthlyBudget) * 100)
    : 0;

  const sortedByPriority = [...breakdowns].sort((a, b) => b.score - a.score);

  const formulas = [];

  if (primary) {
    formulas.push(
      {
        id: 'daily_savings_needed',
        name: 'Daily Savings Target',
        icon: 'calendar_month',
        formula: 'Daily = (Goal Amount − Current Saved) ÷ Days Remaining',
        description: 'The linear daily contribution needed to reach your target by the deadline, assuming no interest or compounding.',
        example: {
          goal_name: primary.name,
          inputs: {
            target_amount: primary.target_amount,
            saved_amount: primary.saved_amount,
            days_remaining: primary.days_remaining,
          },
          result: {
            value: primary.savings_needed.daily,
            label: `$${primary.savings_needed.daily.toFixed(2)} / day`,
          },
        },
      },
      {
        id: 'weekly_savings_needed',
        name: 'Weekly Savings Needed',
        icon: 'date_range',
        formula: 'Weekly = (Goal Amount − Current Saved) ÷ Weeks Remaining',
        description: 'The weekly savings rate required to stay on pace for your deadline.',
        example: {
          goal_name: primary.name,
          inputs: {
            remaining_amount: primary.remaining_amount,
            days_remaining: primary.days_remaining,
          },
          result: {
            value: primary.savings_needed.weekly,
            label: `$${primary.savings_needed.weekly.toFixed(2)} / week`,
          },
        },
      },
      {
        id: 'monthly_savings_needed',
        name: 'Monthly Savings Needed',
        icon: 'calendar_month',
        formula: 'Monthly = (Goal Amount − Current Saved) ÷ Months Remaining',
        description: 'The monthly savings rate required using an average of 30.44 days per month.',
        example: {
          goal_name: primary.name,
          inputs: {
            remaining_amount: primary.remaining_amount,
            days_remaining: primary.days_remaining,
          },
          result: {
            value: primary.savings_needed.monthly,
            label: `$${primary.savings_needed.monthly.toFixed(2)} / month`,
          },
        },
      },
      {
        id: 'yearly_savings_needed',
        name: 'Yearly Savings Needed',
        icon: 'event',
        formula: 'Yearly = (Goal Amount − Current Saved) ÷ Years Remaining',
        description: 'The annual savings rate required using 365.25 days per year.',
        example: {
          goal_name: primary.name,
          inputs: {
            remaining_amount: primary.remaining_amount,
            days_remaining: primary.days_remaining,
          },
          result: {
            value: primary.savings_needed.annual,
            label: `$${primary.savings_needed.annual.toFixed(2)} / year`,
          },
        },
      },
      {
        id: 'on_track_detection',
        name: 'On-Track Detection',
        icon: 'check_circle',
        formula: 'On Track when Actual Progress ≥ Required Progress × 0.9',
        description: 'Required progress is the share of time elapsed toward your deadline. You are on track when saved balance is at least 90% of expected progress.',
        example: {
          goal_name: primary.name,
          ...buildOnTrackExample(primary),
        },
      },
      {
        id: 'progress_percentage',
        name: 'Progress Percentage',
        icon: 'bar_chart',
        formula: 'Progress = (Current Saved ÷ Goal Amount) × 100',
        description: 'The absolute completion metric representing the portion of your target you have already saved.',
        example: {
          goal_name: primary.name,
          inputs: {
            saved_amount: primary.saved_amount,
            target_amount: primary.target_amount,
          },
          result: {
            value: primary.percentage_complete,
            label: `${primary.percentage_complete.toFixed(2)}%`,
          },
        },
      }
    );
  }

  if (mode === 'earner') {
    formulas.push(
      {
        id: 'budget_allocation_weighting',
        name: 'Budget Allocation Weighting',
        subtitle: 'Magnitude + Urgency',
        icon: 'hourglass_top',
        formula: 'Score = (Magnitude × 0.5) + (Urgency × 0.5)',
        description: 'Priority balances goal size against deadline proximity. Higher scores receive a larger share of your monthly budget.',
        example: {
          monthly_budget: monthlyBudget,
          goals_by_priority: sortedByPriority.map((goal) => ({
            goal_id: goal.goal_id,
            goal_name: goal.name,
            score: goal.score,
            weight_magnitude: goal.weight_magnitude,
            weight_urgency: goal.weight_urgency,
            allocated_monthly_amount: goal.allocated_monthly_amount,
          })),
        },
      },
      {
        id: 'feasibility_check',
        name: 'Feasibility Check',
        icon: 'verified_user',
        formula: 'Feasible when Allocated Monthly ≥ Monthly Savings Needed',
        description: 'Each goal is feasible when its allocated monthly share meets or exceeds the monthly savings rate required to hit the deadline.',
        example: {
          total_monthly_needed: totalMonthlyNeeded,
          total_monthly_allocated: totalAllocated,
          feasible_goals: feasibleCount,
          total_goals: breakdowns.length,
          all_feasible: breakdowns.length > 0 && feasibleCount === breakdowns.length,
          budget_utilization: budgetUtilization,
          status_label: breakdowns.length > 0 && feasibleCount === breakdowns.length
            ? 'HEALTHY'
            : 'ATTENTION',
        },
      }
    );
  }

  return formulas;
};

const GOAL_CHART_COLORS = [
  '#D4A574',
  '#1A2340',
  '#243054',
  '#E8C77A',
  '#C17B5C',
  '#4E4B46',
  '#8B9A6B',
  '#6B7F9E',
];

const buildCumulativePoints = (transactions, targetAmount = 0) => {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  let cumulative = 0;
  const target = toNumber(targetAmount);
  const dataPoints = sorted.map((tx) => {
    const amount = toNumber(tx.amount);

    if (tx.type === 'deposit') {
      cumulative += amount;
    } else {
      cumulative -= amount;
    }

    const roundedCumulative = calculationModel.roundToTwo(cumulative);

    return {
      transaction_id: tx.transaction_id,
      date: tx.created_at,
      amount,
      type: tx.type,
      note: tx.note || '',
      cumulative: roundedCumulative,
      percentage_complete: target > 0
        ? calculationModel.roundToTwo((roundedCumulative / target) * 100)
        : 0,
    };
  });

  let growthPercent = null;

  if (dataPoints.length >= 2) {
    const startBalance = dataPoints[0].cumulative;
    const endBalance = dataPoints[dataPoints.length - 1].cumulative;
    growthPercent = startBalance > 0
      ? calculationModel.roundToTwo(((endBalance - startBalance) / startBalance) * 100)
      : endBalance > 0 ? 100 : 0;
  }

  return { dataPoints, growthPercent };
};

// GET /api/reports/formulas?userId=1
router.get('/formulas', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const { budgetContext, monthlyBudget, breakdowns } = await buildGoalBreakdowns(userId);
    const formulas = buildFormulasResponse(monthlyBudget, breakdowns, budgetContext.mode);

    res.json({
      user_id: Number.parseInt(userId, 10),
      mode: budgetContext.mode,
      is_earner: budgetContext.isEarner,
      monthly_budget: budgetContext.mode === 'earner' ? monthlyBudget : null,
      goal_count: breakdowns.length,
      primary_goal_name: breakdowns[0]?.name ?? null,
      formulas,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// GET /api/reports/expense-chart?userId=1&month=5&year=2026
router.get('/expense-chart', async (req, res) => {
  try {
    const { userId, month, year } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const currentDate = new Date();
    const targetMonth = Number.parseInt(month, 10) || currentDate.getMonth() + 1;
    const targetYear = Number.parseInt(year, 10) || currentDate.getFullYear();

    const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
    const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;

    const [expenses, summary, prevExpenses] = await Promise.all([
      expenseModel.getExpensesByMonth(userId, targetMonth, targetYear),
      expenseModel.getMonthlySummary(userId, targetMonth, targetYear),
      expenseModel.getExpensesByMonth(userId, prevMonth, prevYear),
    ]);

    const totalSpent = calculationModel.roundToTwo(
      expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0)
    );
    const previousMonthTotal = calculationModel.roundToTwo(
      prevExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0)
    );

    const monthOverMonthChange = previousMonthTotal > 0
      ? calculationModel.roundToTwo(((totalSpent - previousMonthTotal) / previousMonthTotal) * 100)
      : totalSpent > 0 ? 100 : 0;

    const categories = summary.map((cat) => ({
      category_name: cat.category_name || 'Uncategorized',
      category_colour: cat.category_colour,
      total_spent: calculationModel.roundToTwo(toNumber(cat.total_spent)),
      transaction_count: Number.parseInt(cat.transaction_count, 10) || 0,
    }));

    const topCategory = categories.length > 0
      ? categories.reduce((top, cat) => (cat.total_spent > top.total_spent ? cat : top), categories[0])
      : null;

    const user = await userModel.getUserMonthlyBudgetById(userId);
    const monthlyBudget = user?.monthly_budget !== null && user?.monthly_budget !== undefined
      ? calculationModel.roundToTwo(user.monthly_budget)
      : null;

    res.json({
      user_id: Number.parseInt(userId, 10),
      month: targetMonth,
      year: targetYear,
      total_spent: totalSpent,
      expense_count: expenses.length,
      monthly_budget: monthlyBudget,
      budget_utilization: monthlyBudget
        ? calculationModel.roundToTwo((totalSpent / monthlyBudget) * 100)
        : null,
      budget_remaining: monthlyBudget
        ? calculationModel.roundToTwo(Math.max(0, monthlyBudget - totalSpent))
        : null,
      previous_month_total: previousMonthTotal,
      month_over_month_change_percent: monthOverMonthChange,
      categories,
      top_category: topCategory,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

const buildGoalChartPayload = async (goal, color) => {
  const transactions = await transactionModel.getTransactionsByGoalId(goal.goal_id);
  const breakdown = calculationModel.getGoalBreakdown(goal);
  const { dataPoints, growthPercent } = buildCumulativePoints(
    transactions,
    breakdown.target_amount
  );

  return {
    goal_id: goal.goal_id,
    goal_name: goal.name,
    color,
    target_amount: breakdown.target_amount,
    current_balance: breakdown.saved_amount,
    percentage_complete: breakdown.percentage_complete,
    transaction_count: transactions.length,
    has_activity: transactions.length > 0,
    growth_percent: growthPercent,
    data_points: dataPoints,
  };
};

// GET /api/reports/goal-chart?userId=1 — all goals for combined dashboard chart
router.get('/goal-chart', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const goals = await goalModel.getGoalsByUserId(userId);
    const goalCharts = await Promise.all(
      goals.map((goal, index) => buildGoalChartPayload(
        goal,
        GOAL_CHART_COLORS[index % GOAL_CHART_COLORS.length]
      ))
    );

    const activeGoals = goalCharts.filter((goal) => goal.has_activity).length;

    res.json({
      user_id: Number.parseInt(userId, 10),
      goal_count: goalCharts.length,
      active_goal_count: activeGoals,
      goals: goalCharts,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// GET /api/reports/goal-chart/:id?userId=1
router.get('/goal-chart/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const goal = await goalModel.getGoalById(id);

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (Number.parseInt(goal.user_id, 10) !== Number.parseInt(userId, 10)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const goals = await goalModel.getGoalsByUserId(userId);
    const colorIndex = goals.findIndex((item) => item.goal_id === goal.goal_id);
    const color = GOAL_CHART_COLORS[Math.max(colorIndex, 0) % GOAL_CHART_COLORS.length];
    const payload = await buildGoalChartPayload(goal, color);

    res.json(payload);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

module.exports = router;
