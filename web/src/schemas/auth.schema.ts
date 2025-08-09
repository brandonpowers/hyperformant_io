import { z } from 'zod';
import { EmailSchema } from './common.schema';

/**
 * Authentication-related schemas
 */

// Login request
export const LoginSchema = z
  .object({
    email: EmailSchema,
    password: z.string().min(1, 'Password is required'),
    remember: z.boolean().default(false).openapi({
      description: 'Remember login for extended session',
    }),
  })
  .openapi('Login');

// Register request
export const RegisterSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    email: EmailSchema,
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number',
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .openapi('Register');

// Forgot password request
export const ForgotPasswordSchema = z
  .object({
    email: EmailSchema,
  })
  .openapi('ForgotPassword');

// Reset password request
export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number',
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .openapi('ResetPassword');

// Email verification request
export const VerifyEmailSchema = z
  .object({
    token: z.string().min(1, 'Verification token is required'),
  })
  .openapi('VerifyEmail');

// Resend verification request
export const ResendVerificationSchema = z
  .object({
    email: EmailSchema,
  })
  .openapi('ResendVerification');

// Auth responses
export const AuthResponseSchema = z
  .object({
    user: z.object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      isAdmin: z.boolean(),
      emailVerified: z.string().nullable(),
    }),
    session: z
      .object({
        expires: z.string(),
      })
      .optional(),
  })
  .openapi('AuthResponse');

// Session info response
export const SessionSchema = z
  .object({
    user: z.object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      image: z.string().nullable(),
      isAdmin: z.boolean(),
    }),
    expires: z.string(),
  })
  .openapi('Session');

// API token management
export const CreateApiTokenSchema = z
  .object({
    name: z.string().min(1, 'Token name is required').max(100, 'Name too long'),
    scopes: z
      .array(
        z.enum([
          'companies:read',
          'companies:write',
          'reports:read',
          'reports:write',
          'users:read',
          'admin:read',
          'admin:write',
        ]),
      )
      .default(['companies:read']),
    expiresIn: z
      .enum(['30d', '60d', '90d', '1y', 'never'])
      .default('90d')
      .openapi({
        description: 'Token expiration period',
      }),
  })
  .openapi('CreateApiToken');

export const ApiTokenSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    scopes: z.array(z.string()),
    lastUsed: z.string().nullable(),
    expiresAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi('ApiToken');

export const ApiTokenResponseSchema = z
  .object({
    token: ApiTokenSchema,
    accessToken: z.string().openapi({
      description: 'The actual token value (only shown once)',
    }),
  })
  .openapi('ApiTokenResponse');
