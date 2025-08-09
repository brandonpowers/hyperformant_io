import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { 
  isPublicRoute, 
  isProtectedRoute, 
  isUnverifiedAllowed,
  ROUTE_CONFIG 
} from './config/routes.config';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Skip ALL authentication checks for public routes
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }

    // If no token, the authorized callback will handle redirect
    if (!token) {
      return NextResponse.next();
    }

    // Check if user's email is verified
    const isEmailVerified = token.emailVerified !== null && token.emailVerified !== undefined;

    // If email is not verified and route requires verification
    if (!isEmailVerified && !isUnverifiedAllowed(pathname)) {
      const verificationUrl = new URL(ROUTE_CONFIG.redirects.requiresVerification, req.url);
      verificationUrl.searchParams.set('email', token.email || '');
      verificationUrl.searchParams.set('message', 'Please verify your email to continue.');
      return NextResponse.redirect(verificationUrl);
    }

    // All checks passed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Public routes are always accessible
        if (isPublicRoute(pathname)) {
          return true;
        }
        
        // Protected routes require authentication
        if (isProtectedRoute(pathname)) {
          return !!token;
        }
        
        // Default to public for any unconfigured routes (safety fallback)
        console.warn(`Route ${pathname} is not configured in routes.config.ts`);
        return true;
      },
    },
    pages: {
      signIn: '/sign-in', // Use the new clean URL
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - images (image assets)
     * - fonts (font files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public|images|fonts).*)',
  ],
};