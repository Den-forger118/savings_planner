const goalModel = require('../models/goalModel');
const userModel = require('../models/userModel');
const calculationModel = require('../models/calculationModel');
const { getUserBudgetContext, buildGoalResponse } = require('../utils/budgetContext');
const { formatMoney } = require('../utils/moneyFormat');

async function buildCoachContext(userId) {
  const user = await userModel.getUserById(userId);
  if (!user || user.is_active === false) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const budgetContext = await getUserBudgetContext(userId);
  const goals = await goalModel.getGoalsByUserId(userId);
  const allocatedGoals = budgetContext.mode === 'earner'
    ? calculationModel.calculateAutoAllocations(goals, budgetContext.allocationBudget)
    : [];

  const currency = user.currency || 'USD';
  const symbol = user.currency_symbol || null;
  const money = (value) => formatMoney(value, currency, symbol);

  const goalSummaries = goals.map((goal) => {
    const details = buildGoalResponse(goal, allocatedGoals, budgetContext.mode);
    return {
      goal_id: details.goal_id,
      name: details.name,
      status: details.is_complete ? 'complete' : details.is_paused ? 'on_hold' : 'active',
      target: money(details.target_amount),
      saved: money(details.saved_amount),
      remaining: money(details.remaining_amount),
      deadline: details.deadline,
      days_remaining: details.days_remaining,
      on_track: details.on_track,
      daily_needed: money(details.savings_needed?.daily || 0),
      weekly_needed: money(details.savings_needed?.weekly || 0),
      monthly_needed: money(details.savings_needed?.monthly || 0),
      priority: details.priority,
      allocated_monthly:
        details.allocated_monthly_amount != null
          ? money(details.allocated_monthly_amount)
          : null,
      feasible: details.is_feasible,
    };
  });

  const active = goalSummaries.filter((g) => g.status === 'active');
  const behind = active.filter((g) => g.on_track === false);

  return {
    user: {
      first_name: user.first_name,
      currency,
      mode: budgetContext.mode,
      monthly_budget:
        budgetContext.monthlyBudget != null ? money(budgetContext.monthlyBudget) : null,
    },
    stats: {
      total_goals: goals.length,
      active_goals: active.length,
      behind_count: behind.length,
    },
    goals: goalSummaries,
  };
}

function buildSystemPrompt(context) {
  const goalsJson = JSON.stringify(context.goals, null, 2);

  return `You are QUANT Coach — a calm, practical savings coach inside the QUANT app.

Rules:
- Use ONLY the ledger facts in CONTEXT for numbers. Do not invent balances or rates.
- Be concise (usually 2–5 short paragraphs or short bullets).
- Speak in the user's currency (${context.user.currency}).
- Never claim you moved money, recorded a deposit, or changed a goal. QUANT requires the user to confirm actions in the app.
- If suggesting a new goal, end with a clearly labeled draft block like:
  GOAL_DRAFT: {"name":"...","target_amount":0,"deadline":"YYYY-MM-DD"}
  Only include fields you can justify from the conversation; leave out unknowns.
- If the user is on track, say so briefly and give one optional stretch action.
- If behind, give one concrete next step (amount/week or which goal to prioritize).

CONTEXT:
Member: ${context.user.first_name}
Mode: ${context.user.mode}
Monthly budget: ${context.user.monthly_budget ?? 'not set'}
Active goals: ${context.stats.active_goals} (behind: ${context.stats.behind_count})

GOALS_JSON:
${goalsJson}`;
}

module.exports = {
  buildCoachContext,
  buildSystemPrompt,
};
