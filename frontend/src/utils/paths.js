/** App route paths (React Router). */
export const PATHS = {
  home: '/',
  login: '/login',
  register: '/register',
  onboarding: '/onboarding',
  dashboard: '/dashboard',
  savings: '/savings',
  expenses: '/expenses',
  activity: '/activity',
  settings: '/settings',
  admin: '/admin',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
};

/** Map legacy page ids (nav / FeatureGuide) → paths */
export const PAGE_ID_TO_PATH = {
  dashboard: PATHS.dashboard,
  savings: PATHS.savings,
  simulator: `${PATHS.settings}?tab=simulator`,
  expenses: PATHS.expenses,
  activity: PATHS.activity,
  settings: PATHS.settings,
  admin: PATHS.admin,
};

export function pathForPageId(pageId) {
  return PAGE_ID_TO_PATH[pageId] || PATHS.dashboard;
}

/** Stable order for optional directional transitions later */
export const NAV_ORDER = [
  PATHS.dashboard,
  PATHS.savings,
  PATHS.expenses,
  PATHS.activity,
  PATHS.settings,
  PATHS.admin,
];
