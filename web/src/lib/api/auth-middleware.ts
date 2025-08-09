import { PrismaClient } from '@prisma/client';
import { ApiError } from './errors';
import { getToken } from 'next-auth/jwt';
import type { Context, Next } from 'hono';

const prisma = new PrismaClient();

/**
 * Shared authentication middleware for Hono routes
 * Extracts and validates NextAuth JWT session from cookies
 */
export const createAuthMiddleware = () => {
  return async (c: Context, next: Next) => {
    try {
      // Try to get the original request if it was attached
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
  };
};

/**
 * Admin-only middleware - must be used after authMiddleware
 */
export const createAdminMiddleware = () => {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      throw ApiError.unauthorized('Authentication required');
    }

    if (!user.isAdmin) {
      throw ApiError.forbidden('Admin access required');
    }

    await next();
  };
};
