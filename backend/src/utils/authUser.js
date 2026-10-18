const formatReminderTime = (value) => {
  if (!value) return '09:00';
  if (typeof value === 'string') {
    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const hour = String(value.getUTCHours()).padStart(2, '0');
    const minute = String(value.getUTCMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
  }
  return '09:00';
};

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
  email_notifications: user.email_notifications !== false,
  push_notifications: user.push_notifications === true,
  reminder_frequency: user.reminder_frequency || 'daily',
  reminder_time: formatReminderTime(user.reminder_time),
  timezone: user.timezone || 'UTC',
});

module.exports = { formatAuthUser };
