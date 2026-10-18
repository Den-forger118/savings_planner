const express = require('express');
const { buildCoachContext, buildSystemPrompt } = require('../services/aiContext');
const { chatCompletion, getAiStatus, isAiConfigured } = require('../utils/aiProvider');

const router = express.Router();

const MAX_HISTORY = 12;
const MAX_MESSAGE_CHARS = 2000;

function normalizeMessages(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant'))
    .map((item) => ({
      role: item.role,
      content: String(item.content || '').trim().slice(0, MAX_MESSAGE_CHARS),
    }))
    .filter((item) => item.content)
    .slice(-MAX_HISTORY);
}

function extractGoalDraft(text) {
  const match = String(text).match(/GOAL_DRAFT:\s*(\{[\s\S]*?\})/i);
  if (!match) return null;
  try {
    const draft = JSON.parse(match[1]);
    if (!draft || typeof draft !== 'object') return null;
    return {
      name: draft.name ? String(draft.name).trim() : null,
      target_amount: Number.isFinite(Number.parseFloat(draft.target_amount))
        ? Number.parseFloat(draft.target_amount)
        : null,
      deadline: draft.deadline ? String(draft.deadline).slice(0, 10) : null,
    };
  } catch {
    return null;
  }
}

router.get('/status', (req, res) => {
  res.json(getAiStatus());
});

/**
 * POST /api/ai/coach
 * Body: { message?: string, messages?: [{ role, content }] }
 */
router.post('/coach', async (req, res) => {
  try {
    if (!isAiConfigured()) {
      return res.status(503).json({
        error: 'AI coach is not configured. Add HF_TOKEN to the backend environment.',
        code: 'AI_NOT_CONFIGURED',
      });
    }

    const userId = req.user.userId;
    let history = normalizeMessages(req.body?.messages);

    const single = String(req.body?.message || '').trim();
    if (single) {
      history = [...history, { role: 'user', content: single.slice(0, MAX_MESSAGE_CHARS) }];
    }

    if (history.length === 0 || history[history.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'Send a user message to the coach.' });
    }

    const context = await buildCoachContext(userId);
    const system = buildSystemPrompt(context);

    const result = await chatCompletion({
      messages: [{ role: 'system', content: system }, ...history],
      maxTokens: 700,
      temperature: 0.4,
    });

    const goalDraft = extractGoalDraft(result.content);

    return res.json({
      reply: result.content,
      model: result.model,
      goal_draft: goalDraft,
      context_stats: context.stats,
    });
  } catch (err) {
    console.error('[ai] Coach failed:', err.message);
    return res.status(err.statusCode || 500).json({
      error: err.message || 'Coach is unavailable right now.',
      code: err.code || 'AI_ERROR',
    });
  }
});

module.exports = router;
