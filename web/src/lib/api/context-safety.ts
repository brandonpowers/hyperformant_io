/**
 * Hono Context Safety Utilities
 * 
 * Systematic solution to prevent context transformation issues in middleware chains.
 * This ensures consistent Hono context behavior across all routers and middleware.
 */

import type { Context, Next } from 'hono';
import { ApiError } from './errors';

/**
 * Validates that the provided object is a proper Hono context
 */
export function isValidHonoContext(obj: any): obj is Context {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.get === 'function' &&
    typeof obj.set === 'function' &&
    typeof obj.json === 'function' &&
    obj.req &&
    typeof obj.req.json === 'function'
  );
}

/**
 * Context safety wrapper that ensures proper Hono context is passed to handlers
 */
export function withContextSafety<T extends Context = Context>(
  handler: (c: T, next: Next) => Promise<Response | void> | Response | void
) {
  return async (c: any, next: Next) => {
    // Validate context before proceeding
    if (!isValidHonoContext(c)) {
      console.error('❌ Invalid Hono context detected:', {
        keys: Object.keys(c),
        type: typeof c,
        constructor: c?.constructor?.name,
        prototype: Object.getPrototypeOf(c)?.constructor?.name
      });
      
      throw ApiError.server('Invalid request context - please contact support');
    }
    
    // Context is valid, proceed with handler
    return handler(c as T, next);
  };
}

/**
 * Enhanced authentication middleware with context safety
 */
export function createSafeAuthMiddleware() {
  return withContextSafety(async (c: Context, next: Next) => {
    try {
      const { getToken } = await import('next-auth/jwt');
      const { PrismaClient } = await import('@prisma/client');
      
      const prisma = new PrismaClient();
      
      // Try to get the original request
      const rawReq = c.req.raw;
      const originalRequest = (rawReq as any).originalRequest || rawReq;

      // NextAuth's getToken expects a request-like object
      let token = await getToken({
        req: originalRequest,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: 'next-auth.session-token',
      });

      if (!token) {
        // Try alternate cookie names for HTTPS
        token = await getToken({
          req: originalRequest,
          secret: process.env.NEXTAUTH_SECRET,
          cookieName: '__Secure-next-auth.session-token',
        });
      }

      if (!token) {
        throw ApiError.unauthorized('No valid session found');
      }

      // Get user ID from the token
      const userId = token.sub || token.id;
      if (!userId) {
        throw ApiError.unauthorized('No user ID in session');
      }

      // Fetch the user from database
      const user = await prisma.user.findUnique({
        where: { id: userId as string },
        select: {
          id: true,
          name: true,
          email: true,
          isAdmin: true,
        },
      });

      if (!user) {
        throw ApiError.unauthorized('User not found');
      }

      // Set the user in the context
      c.set('user', user);

      await next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.unauthorized('Authentication failed');
    }
  });
}

/**
 * Safe handler wrapper for OpenAPI routes
 */
export function createSafeHandler<T extends Context = Context>(
  handler: (c: T) => Promise<Response | void> | Response | void
) {
  return withContextSafety(async (c: T, next: Next) => {
    return handler(c);
  });
}

/**
 * Safe admin middleware that ensures context safety
 */
export function createSafeAdminMiddleware() {
  return withContextSafety(async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      throw ApiError.unauthorized('Authentication required');
    }

    if (!user.isAdmin) {
      throw ApiError.forbidden('Admin access required');
    }

    await next();
  });
}

/**
 * Debug context information (for troubleshooting)
 */
export function debugContext(c: any, label: string = 'Context') {
  const contextInfo = {
    label,
    timestamp: new Date().toISOString(),
    isValid: isValidHonoContext(c),
    keys: Object.keys(c || {}),
    methods: {
      hasGet: typeof c?.get === 'function',
      hasSet: typeof c?.set === 'function', 
      hasJson: typeof c?.json === 'function',
      hasReq: !!c?.req
    },
    type: typeof c,
    constructor: c?.constructor?.name,
    prototype: Object.getPrototypeOf(c)?.constructor?.name
  };
  
  console.log(`🔍 ${label}:`, contextInfo);
  return contextInfo;
}