/**
 * Route Security Configuration
 * Single source of truth for route authentication requirements
 */

export const ROUTE_CONFIG = {
  /**
   * Public routes - no authentication required
   * These routes are accessible to everyone
   */
  public: [
    '/',
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password',
    '/privacy',
    '/terms',
  ],

  /**
   * Protected route prefixes - require authentication
   * Any route starting with these prefixes requires a valid session
   */
  protected: [
    '/dashboard',
    '/account',
    '/admin',
    '/onboarding',
    '/auth', // All /auth/* routes now require session (verification, lock, etc.)
  ],

  /**
   * Routes accessible without email verification
   * These routes can be accessed with a session but unverified email
   */
  unverifiedAllowed: ['/auth/verification', '/onboarding'],

  /**
   * Redirect destinations
   */
  redirects: {
    afterSignIn: '/dashboard',
    afterSignOut: '/sign-in',
    afterSignUp: '/auth/verification',
    requiresVerification: '/auth/verification',
  },
} as const;

// Type-safe route helpers
export type PublicRoute = (typeof ROUTE_CONFIG.public)[number];
export type ProtectedPrefix = (typeof ROUTE_CONFIG.protected)[number];

/**
 * Check if a pathname is a public route
 */
export function isPublicRoute(pathname: string): boolean {
  return ROUTE_CONFIG.public.includes(pathname);
}

/**
 * Check if a pathname is a protected route (by prefix)
 */
export function isProtectedRoute(pathname: string): boolean {
  return ROUTE_CONFIG.protected.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}

/**
 * Check if a pathname allows unverified users
 */
export function isUnverifiedAllowed(pathname: string): boolean {
  return ROUTE_CONFIG.unverifiedAllowed.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  );
}
