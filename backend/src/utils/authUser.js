const formatAuthUser = (user) => ({
  user_id: user.user_id,
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
  monthly_budget: user.monthly_budget,
  monthly_income: user.monthly_income,
  is_earner: user.is_earner,
  mode: user.is_earner ? 'earner' : 'non-earner',
  currency: user.currency || 'USD',
  currency_symbol: user.currency_symbol || '$',
  theme: user.theme || 'classic',
  fiscal_start_month: user.fiscal_start_month || 1,
  onboarding_complete: user.onboarding_complete === true,
  is_admin: user.is_admin === true,
});

module.exports = { formatAuthUser };
