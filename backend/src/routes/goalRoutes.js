const express = require('express');

const router = express.Router();

const goalModel = require('../models/goalModel');

const calculationModel = require('../models/calculationModel');

const { getUserBudgetContext, buildGoalResponse } = require('../utils/budgetContext');

const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const { sortGoalsDisplayOrder } = require('../utils/goalOrder');



const sendError = (res, err) => {

  res.status(err.statusCode || 500).json({ error: err.message });

};



const handleUserGoalsRequest = async (userId, res, query = {}) => {

  const budgetContext = await getUserBudgetContext(userId);

  const goals = await goalModel.getGoalsByUserId(userId);

  const allocatedGoals = budgetContext.mode === 'earner'

    ? calculationModel.calculateAutoAllocations(goals, budgetContext.allocationBudget)

    : [];

  const goalsWithCalculations = sortGoalsDisplayOrder(

    goals.map((goal) => buildGoalResponse(goal, allocatedGoals, budgetContext.mode))

  );



  const usePagination = query.page !== undefined || query.limit !== undefined;

  let goalsResponse = goalsWithCalculations;

  let pagination = null;



  if (usePagination) {

    const { page, limit, offset } = parsePagination(query);

    pagination = buildPaginationMeta(goalsWithCalculations.length, page, limit);

    goalsResponse = goalsWithCalculations.slice(offset, offset + limit);

  }



  res.json({

    user_id: Number.parseInt(userId, 10),

    monthly_budget: budgetContext.monthlyBudget,

    mode: budgetContext.mode,

    is_earner: budgetContext.isEarner,

    count: goalsWithCalculations.length,

    goals: goalsResponse,

    pagination,

  });

};



// GET /api/goals?userId=1 - fetch all goals with automatic allocations

router.get('/', async (req, res) => {

  try {

    const { userId } = req.query;



    if (!userId) {

      return res.status(400).json({ error: 'userId query parameter is required' });

    }



    await handleUserGoalsRequest(userId, res, req.query);

  } catch (err) {

    sendError(res, err);

  }

});



// GET /api/goals/user/:userId - alias for fetching all goals by user id

router.get('/user/:userId', async (req, res) => {

  try {

    await handleUserGoalsRequest(req.params.userId, res, req.query);

  } catch (err) {

    sendError(res, err);

  }

});

// GET /api/goals/trash?userId=1 - list soft-deleted goals
router.get('/trash', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const goals = await goalModel.getDeletedGoalsByUserId(userId);

    res.json({
      user_id: Number.parseInt(userId, 10),
      count: goals.length,
      goals,
    });
  } catch (err) {
    sendError(res, err);
  }
});

// DELETE /api/goals/trash?userId=1 - empty trash
router.delete('/trash', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const removed = await goalModel.emptyTrash(userId);

    res.json({
      message: 'Trash emptied',
      deleted_count: removed.length,
      trash: [],
    });
  } catch (err) {
    sendError(res, err);
  }
});

// POST /api/goals - create a new goal and return its allocation

router.post('/', async (req, res) => {

  try {

    const { userId, name, targetAmount, deadline } = req.body;



    if (!userId || !name || targetAmount === undefined || !deadline) {

      return res.status(400).json({

        error: 'Please provide userId, name, targetAmount, and deadline',

      });

    }



    const budgetContext = await getUserBudgetContext(userId);

    const goal = await goalModel.createGoal(userId, name, targetAmount, deadline);

    const userGoals = await goalModel.getGoalsByUserId(userId);

    const allocatedGoals = budgetContext.mode === 'earner'

      ? calculationModel.calculateAutoAllocations(userGoals, budgetContext.allocationBudget)

      : [];

    const goalWithCalculations = buildGoalResponse(goal, allocatedGoals, budgetContext.mode);



    res.status(201).json({

      message: 'Goal created successfully',

      goal: goalWithCalculations,

    });

  } catch (err) {

    sendError(res, err);

  }

});



// PATCH /api/goals/reorder - persist manual display order within one status group
router.patch('/reorder', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const orderedIds = req.body?.ordered_ids;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'ordered_ids must be a non-empty array' });
    }

    const parsedIds = orderedIds.map((id) => Number(id));
    const uniqueIds = [...new Set(parsedIds)];
    if (uniqueIds.length !== parsedIds.length || parsedIds.some((id) => !Number.isInteger(id) || id < 1)) {
      return res.status(400).json({ error: 'ordered_ids must be unique positive integers' });
    }

    await goalModel.replaceGoalPriorities(userId, parsedIds);

    const budgetContext = await getUserBudgetContext(userId);
    const userGoals = await goalModel.getGoalsByUserId(userId);
    const allocatedGoals = budgetContext.mode === 'earner'
      ? calculationModel.calculateAutoAllocations(userGoals, budgetContext.allocationBudget)
      : [];
    const goalsWithCalculations = sortGoalsDisplayOrder(
      userGoals.map((userGoal) => buildGoalResponse(userGoal, allocatedGoals, budgetContext.mode))
    );

    res.json({
      message: 'Goal order updated',
      goals: goalsWithCalculations,
    });
  } catch (err) {
    sendError(res, err);
  }
});

// PATCH /api/goals/:id/pause - pause or resume a goal and recalculate allocations

router.patch('/:id/pause', async (req, res) => {

  try {

    const { id } = req.params;

    const { is_paused: isPaused, paused_at: pausedAt = null } = req.body;

    if (typeof isPaused !== 'boolean') {
      return res.status(400).json({ error: 'is_paused must be a boolean' });
    }

    const existingGoal = await goalModel.getGoalById(id);

    if (!existingGoal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const goal = await goalModel.setGoalPaused(id, isPaused, pausedAt);

    const budgetContext = await getUserBudgetContext(existingGoal.user_id);

    const userGoals = await goalModel.getGoalsByUserId(existingGoal.user_id);

    const allocatedGoals = budgetContext.mode === 'earner'

      ? calculationModel.calculateAutoAllocations(userGoals, budgetContext.allocationBudget)

      : [];

    const goalWithCalculations = buildGoalResponse(goal, allocatedGoals, budgetContext.mode);

    const goalsWithCalculations = sortGoalsDisplayOrder(

      userGoals.map((userGoal) => buildGoalResponse(userGoal, allocatedGoals, budgetContext.mode))

    );



    res.json({

      message: isPaused ? 'Goal placed on hold' : 'Goal resumed',

      goal: goalWithCalculations,

      goals: goalsWithCalculations,

    });

  } catch (err) {

    sendError(res, err);

  }

});



// GET /api/goals/:id - fetch a single goal with automatic allocation

router.get('/:id', async (req, res) => {

  try {

    const { id } = req.params;

    const goal = await goalModel.getGoalById(id);



    if (!goal) {

      return res.status(404).json({ error: 'Goal not found' });

    }



    const budgetContext = await getUserBudgetContext(goal.user_id);

    const userGoals = await goalModel.getGoalsByUserId(goal.user_id);

    const allocatedGoals = budgetContext.mode === 'earner'

      ? calculationModel.calculateAutoAllocations(userGoals, budgetContext.allocationBudget)

      : [];

    const goalWithCalculations = buildGoalResponse(goal, allocatedGoals, budgetContext.mode);



    res.json({ goal: goalWithCalculations });

  } catch (err) {

    sendError(res, err);

  }

});



// PUT /api/goals/:id - update a goal

router.put('/:id', async (req, res) => {

  try {

    const { id } = req.params;

    const { name, targetAmount, deadline, priority } = req.body;



    if (!name || targetAmount === undefined || !deadline) {

      return res.status(400).json({

        error: 'Please provide name, targetAmount, and deadline',

      });

    }



    const existingGoal = await goalModel.getGoalById(id);



    if (!existingGoal) {

      return res.status(404).json({ error: 'Goal not found' });

    }



    const budgetContext = await getUserBudgetContext(existingGoal.user_id);

    const goal = await goalModel.updateGoal(id, name, targetAmount, deadline, priority);

    const userGoals = await goalModel.getGoalsByUserId(existingGoal.user_id);

    const allocatedGoals = budgetContext.mode === 'earner'

      ? calculationModel.calculateAutoAllocations(userGoals, budgetContext.allocationBudget)

      : [];

    const goalWithCalculations = buildGoalResponse(goal, allocatedGoals, budgetContext.mode);

    const goalsWithCalculations = sortGoalsDisplayOrder(

      userGoals.map((userGoal) => buildGoalResponse(userGoal, allocatedGoals, budgetContext.mode))

    );



    res.json({

      message: 'Goal updated successfully',

      goal: goalWithCalculations,

      goals: goalsWithCalculations,

    });

  } catch (err) {

    sendError(res, err);

  }

});



// DELETE /api/goals/:id - soft-delete a goal (move to trash)

router.delete('/:id', async (req, res) => {

  try {

    const { id } = req.params;

    const existingGoal = await goalModel.getGoalById(id);



    if (!existingGoal) {

      return res.status(404).json({ error: 'Goal not found' });

    }



    const deletedGoal = await goalModel.deleteGoal(id);

    const budgetContext = await getUserBudgetContext(existingGoal.user_id);

    const userGoals = await goalModel.getGoalsByUserId(existingGoal.user_id);

    const allocatedGoals = budgetContext.mode === 'earner'

      ? calculationModel.calculateAutoAllocations(userGoals, budgetContext.allocationBudget)

      : [];

    const goalsWithCalculations = sortGoalsDisplayOrder(

      userGoals.map((userGoal) => buildGoalResponse(userGoal, allocatedGoals, budgetContext.mode))

    );



    res.json({

      message: 'Goal moved to trash',

      goal_id: deletedGoal.goal_id,

      goals: goalsWithCalculations,

    });

  } catch (err) {

    sendError(res, err);

  }

});



// POST /api/goals/:id/restore - restore a goal from trash

router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const restored = await goalModel.restoreGoal(id, userId);

    if (!restored) {
      return res.status(404).json({ error: 'Deleted goal not found' });
    }

    const budgetContext = await getUserBudgetContext(userId);
    const userGoals = await goalModel.getGoalsByUserId(userId);
    const allocatedGoals = budgetContext.mode === 'earner'
      ? calculationModel.calculateAutoAllocations(userGoals, budgetContext.allocationBudget)
      : [];
    const goalsWithCalculations = sortGoalsDisplayOrder(
      userGoals.map((userGoal) => buildGoalResponse(userGoal, allocatedGoals, budgetContext.mode))
    );
    const trash = await goalModel.getDeletedGoalsByUserId(userId);

    res.json({
      message: 'Goal restored successfully',
      goal: buildGoalResponse(restored, allocatedGoals, budgetContext.mode),
      goals: goalsWithCalculations,
      trash,
    });
  } catch (err) {
    sendError(res, err);
  }
});

// DELETE /api/goals/:id/permanent - permanently delete a trashed goal

router.delete('/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId || req.body?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const deleted = await goalModel.permanentlyDeleteGoal(id, userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Deleted goal not found in trash' });
    }

    const trash = await goalModel.getDeletedGoalsByUserId(userId);

    res.json({
      message: 'Goal permanently deleted',
      goal_id: deleted.goal_id,
      trash,
    });
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;

