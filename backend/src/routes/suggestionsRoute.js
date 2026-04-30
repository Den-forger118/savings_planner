const express = require('express');
const router = express.Router();
const goalModel = require('../models/goalModel');
const calculationModel = require('../models/calculationModel');

// GET /api/suggestions?userId=1 — get smart suggestions for all goals
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }
    
    const goals = await goalModel.getGoalsByUserId(userId);
    
    const suggestions = goals.map(goal => {
      const breakdown = calculationModel.getGoalBreakdown(goal);
      
      // Generate suggestions based on feasibility
      const suggestion = {
        goal_id: goal.goal_id,
        goal_name: goal.name,
        issues: [],
        recommendations: []
      };
      
      // Check if feasible
      if (!breakdown.is_feasible && breakdown.user_monthly_contribution) {
        const shortfall = breakdown.savings_needed.monthly - breakdown.user_monthly_contribution;
        suggestion.issues.push(
          `You need $${breakdown.savings_needed.monthly.toFixed(2)}/month but can only save $${breakdown.user_monthly_contribution.toFixed(2)}/month. Shortfall: $${shortfall.toFixed(2)}`
        );
        
        suggestion.recommendations.push(
          `Option 1: Increase monthly contribution to $${breakdown.savings_needed.monthly.toFixed(2)}`
        );
        suggestion.recommendations.push(
          `Option 2: Extend deadline by ${Math.ceil(shortfall / breakdown.user_monthly_contribution)} months`
        );
        suggestion.recommendations.push(
          `Option 3: Reduce goal amount by $${(shortfall * breakdown.days_remaining / 30.44).toFixed(2)}`
        );
      } else if (breakdown.is_feasible && breakdown.user_monthly_contribution) {
        const surplus = breakdown.user_monthly_contribution - breakdown.savings_needed.monthly;
        suggestion.recommendations.push(
          `Your goal is achievable! You'll have $${surplus.toFixed(2)}/month extra.`
        );
      }
      
      // Check if on track
      if (!breakdown.on_track) {
        suggestion.issues.push(
          `You're behind schedule. You need to save $${breakdown.savings_needed.daily.toFixed(2)}/day to catch up.`
        );
      }
      
      // Days remaining warning
      if (breakdown.days_remaining < 30) {
        suggestion.issues.push(
          `Less than a month remaining! Consider prioritizing this goal.`
        );
      }
      
      return suggestion;
    });
    
    res.json({ 
      user_id: userId,
      goal_count: goals.length,
      suggestions 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;