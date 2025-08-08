import { OpenAPIHono } from '@hono/zod-openapi';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../app/api/auth/[...nextauth]/route';
import {
  LoginSchema,
  RegisterSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
  AuthResponseSchema,
  SessionSchema,
  CreateApiTokenSchema,
  ApiTokenResponseSchema,
  ApiTokenSchema,
} from '../schemas';
import { ApiError } from '../lib/api/errors';
import { ApiResponse } from '../lib/api/responses';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

// Create Hono app with OpenAPI
export const authApp = new OpenAPIHono();

/**
 * Authentication middleware
 */
const authMiddleware = async (c: any, next: any) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw ApiError.unauthorized();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      emailVerified: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User not found or inactive');
  }

  c.set('user', user);
  await next();
};

/**
 * AUTH ROUTES
 */

// GET /auth/session - Get current session info
authApp.openapi({
  method: 'get',
  path: '/auth/session',
  summary: 'Get current session',
  description: 'Retrieve information about the current authenticated session',
  tags: ['Authentication'],
  security: [{ Bearer: [] }],
  responses: {
    200: { description: 'Current session information' },
  },
}, authMiddleware, async (c) => {
  const user = c.get('user');
  const session = await getServerSession(authOptions);
  
  return c.json(ApiResponse.success({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: null, // Add image field if needed
      isAdmin: user.isAdmin,
    },
    expires: session?.expires || null,
  }));
});

// POST /auth/register - Register new user
authApp.openapi({
  method: 'post',
  path: '/auth/register',
  summary: 'Register new user',
  description: 'Create a new user account',
  tags: ['Authentication'],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: RegisterSchema,
      },
    },
  },
  responses: {
    201: { description: 'User registered successfully' },
  },
}, async (c) => {
  const body = await c.req.json();
  const { name, email, password } = body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw ApiError.duplicate('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcryptjs.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  return c.json(ApiResponse.created({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      emailVerified: user.emailVerified?.toISOString() || null,
    },
  }), 201);
});

// POST /auth/forgot-password - Request password reset
authApp.openapi({
  method: 'post',
  path: '/auth/forgot-password',
  summary: 'Request password reset',
  description: 'Send password reset email to user',
  tags: ['Authentication'],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: ForgotPasswordSchema,
      },
    },
  },
  responses: {
    200: { description: 'Password reset email sent' },
  },
}, async (c) => {
  const { email } = await c.req.json();

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Don't reveal if user exists or not for security
    return c.json(ApiResponse.success({
      message: 'If an account with that email exists, we sent you a password reset link',
    }));
  }

  // TODO: Generate reset token and send email
  // For now, just return success
  return c.json(ApiResponse.success({
    message: 'Password reset email sent',
  }));
});

// POST /auth/reset-password - Reset password with token
authApp.openapi({
  method: 'post',
  path: '/auth/reset-password',
  summary: 'Reset password',
  description: 'Reset user password using reset token',
  tags: ['Authentication'],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: ResetPasswordSchema,
      },
    },
  },
  responses: {
    200: { description: 'Password reset successfully' },
  },
}, async (c) => {
  const { token, password } = await c.req.json();

  // TODO: Validate reset token and update password
  // For now, just return success
  return c.json(ApiResponse.success({
    message: 'Password reset successfully',
  }));
});

// POST /auth/verify-email - Verify email address
authApp.openapi({
  method: 'post',
  path: '/auth/verify-email',
  summary: 'Verify email',
  description: 'Verify user email address using verification token',
  tags: ['Authentication'],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: VerifyEmailSchema,
      },
    },
  },
  responses: {
    200: { description: 'Email verified successfully' },
  },
}, async (c) => {
  const { token } = await c.req.json();

  // TODO: Validate verification token and mark email as verified
  // For now, just return success
  return c.json(ApiResponse.success({
    message: 'Email verified successfully',
  }));
});

// POST /auth/resend-verification - Resend verification email
authApp.openapi({
  method: 'post',
  path: '/auth/resend-verification',
  summary: 'Resend verification email',
  description: 'Send verification email to user',
  tags: ['Authentication'],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: ResendVerificationSchema,
      },
    },
  },
  responses: {
    200: { description: 'Verification email sent' },
  },
}, async (c) => {
  const { email } = await c.req.json();

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.emailVerified) {
    throw ApiError.validation('Email already verified');
  }

  // TODO: Generate verification token and send email
  // For now, just return success
  return c.json(ApiResponse.success({
    message: 'Verification email sent',
  }));
});

// GET /auth/tokens - List user's API tokens
authApp.openapi({
  method: 'get',
  path: '/auth/tokens',
  summary: 'List API tokens',
  description: 'Get list of user API tokens',
  tags: ['Authentication'],
  security: [{ Bearer: [] }],
  responses: {
    200: { description: 'List of API tokens' },
  },
}, authMiddleware, async (c) => {
  // TODO: Implement API token management
  // For now, return empty array
  return c.json(ApiResponse.success([]));
});

// POST /auth/tokens - Create new API token
authApp.openapi({
  method: 'post',
  path: '/auth/tokens',
  summary: 'Create API token',
  description: 'Create a new API token for programmatic access',
  tags: ['Authentication'],
  security: [{ Bearer: [] }],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: CreateApiTokenSchema,
      },
    },
  },
  responses: {
    201: { description: 'API token created successfully' },
  },
}, authMiddleware, async (c) => {
  const body = await c.req.json();
  const user = c.get('user');

  // TODO: Implement API token creation
  // For now, return mock token
  return c.json(ApiResponse.created({
    token: {
      id: 'token_' + Date.now(),
      name: body.name,
      scopes: body.scopes,
      lastUsed: null,
      expiresAt: body.expiresIn === 'never' ? null : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    },
    accessToken: 'hyperformant_' + Math.random().toString(36).substring(2),
  }), 201);
});