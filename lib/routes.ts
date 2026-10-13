export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  dashboard: "/dashboard",
  setups: "/setups",
  favorites: "/favorites",
  analytics: "/analytics",
  profile: "/profile",
  settings: "/settings",
} as const;

/** Routes that require an authenticated session. */
export const PROTECTED_PREFIXES = [
  ROUTES.dashboard,
  ROUTES.setups,
  ROUTES.favorites,
  ROUTES.analytics,
  ROUTES.profile,
  ROUTES.settings,
];

/**
 * Routes an already-signed-in user should never see.
 * `/reset-password` is deliberately absent: the recovery link signs the user in
 * before they choose a new password.
 */
export const AUTH_ONLY_PREFIXES = [
  ROUTES.login,
  ROUTES.signup,
  ROUTES.forgotPassword,
];

export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthOnlyPath(pathname: string) {
  return AUTH_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Only allow same-origin relative paths as post-login redirect targets. */
export function safeRedirectTarget(value: string | null | undefined) {
  if (!value) return ROUTES.dashboard;
  if (!value.startsWith("/") || value.startsWith("//")) return ROUTES.dashboard;
  return value;
}
