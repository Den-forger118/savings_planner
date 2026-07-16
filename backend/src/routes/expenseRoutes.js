const express = require('express');
const router = express.Router();
const expenseModel = require('../models/expenseModel');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

// GET /api/expenses?userId=1&month=5&year=2026&page=1&limit=25&sort=expense_date_desc
router.get('/', async (req, res) => {
  try {
    const { userId, month, year, sort, categoryId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const currentDate = new Date();
    const targetMonth = Number.parseInt(month, 10) || currentDate.getMonth() + 1;
    const targetYear = Number.parseInt(year, 10) || currentDate.getFullYear();
    const { page, limit, offset } = parsePagination(req.query);

    const [summary, totalSpent, totalCount, expenses] = await Promise.all([
      expenseModel.getMonthlySummary(userId, targetMonth, targetYear),
      expenseModel.getMonthlyTotalSpent(userId, targetMonth, targetYear),
      expenseModel.countExpensesByMonth(
        userId,
        targetMonth,
        targetYear,
        categoryId || null
      ),
      expenseModel.getPaginatedExpensesByMonth(
        userId,
        targetMonth,
        targetYear,
        {
          limit,
          offset,
          sort: sort || 'expense_date_desc',
          categoryId: categoryId || null,
        }
      ),
    ]);

    res.json({
      month: targetMonth,
      year: targetYear,
      total_spent: totalSpent.toFixed(2),
      expense_count: totalCount,
      summary_by_category: summary,
      expenses,
      pagination: buildPaginationMeta(totalCount, page, limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const { userId, categoryId, amount, note, expenseDate } = req.body;

    if (!userId || !categoryId || !amount) {
      return res.status(400).json({
        error: 'Please provide userId, categoryId, and amount'
      });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than 0'
      });
    }

    const date = expenseDate || new Date().toISOString().split('T')[0];

    const expense = await expenseModel.createExpense(
      userId,
      categoryId,
      parseFloat(amount),
      note || '',
      date
    );

    res.status(201).json({
      message: 'Expense logged successfully',
      expense
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await expenseModel.deleteExpense(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({
      message: 'Expense deleted successfully',
      expense_id: deleted.expense_id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/expenses/categories?userId=1
router.get('/categories', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const categories = await expenseModel.getCategoriesByUserId(userId);
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/expenses/categories
router.post('/categories', async (req, res) => {
  try {
    const { userId, name, color } = req.body;

    if (!userId || !name) {
      return res.status(400).json({
        error: 'Please provide userId and category name'
      });
    }

    const category = await expenseModel.createCategory(
      userId,
      name,
      color || '#4E4B46'
    );

    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/categories/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { userId, name, color } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const category = await expenseModel.updateCategory(
      categoryId,
      userId,
      name,
      color
    );

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category updated', category });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;