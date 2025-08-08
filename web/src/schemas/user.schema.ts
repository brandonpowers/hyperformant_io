import { z } from 'zod';
import {
  IdSchema,
  EmailSchema,
  DateTimeSchema,
  PaginationQuerySchema,
  PaginationResponseSchema,
} from './common.schema';

/**
 * User-related schemas
 * Maps to Prisma User model
 */

// Base user schema (public-safe)
export const UserSchema = z
  .object({
    id: IdSchema,
    name: z.string().nullable(),
    email: EmailSchema.nullable(),
    image: z.string().url().nullable().openapi({
      description: 'User avatar image URL',
      example: 'https://example.com/avatar.jpg',
    }),
    isAdmin: z.boolean().default(false),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
  })
  .openapi('User');

// Detailed user schema (includes sensitive info for own profile)
export const UserProfileSchema = UserSchema.extend({
  emailVerified: DateTimeSchema.nullable(),
  isActive: z.boolean().default(true),
  lastLoginAt: DateTimeSchema.nullable(),
  // Add subscription info if needed
  subscription: z
    .object({
      plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']).default('FREE'),
      status: z.enum(['ACTIVE', 'CANCELLED', 'PAST_DUE']).default('ACTIVE'),
      currentPeriodEnd: DateTimeSchema.nullable(),
    })
    .optional(),
}).openapi('UserProfile');

// Update profile request
export const UpdateProfileSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    email: EmailSchema,
    image: z.string().url().optional(),
  })
  .openapi('UpdateProfile');

// Change password request
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .openapi('ChangePassword');

// User query parameters
export const UserQuerySchema = PaginationQuerySchema.extend({
  isAdmin: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .openapi({
      description: 'Filter by admin status',
      example: 'true',
    }),
  isActive: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .openapi({
      description: 'Filter by active status', 
      example: 'true',
    }),
  sortBy: z
    .enum(['name', 'email', 'createdAt', 'lastLoginAt'])
    .default('createdAt')
    .openapi({
      description: 'Field to sort by',
    }),
  sortOrder: z.enum(['asc', 'desc']).default('desc').openapi({
    description: 'Sort direction',
  }),
}).openapi('UserQuery');

// User list response
export const UserListResponseSchema = z
  .object({
    users: z.array(UserSchema),
    pagination: PaginationResponseSchema,
  })
  .openapi('UserListResponse');

// Path parameters
export const UserParamsSchema = z
  .object({
    id: IdSchema,
  })
  .openapi('UserParams');

// Admin actions
export const UpdateUserRoleSchema = z
  .object({
    isAdmin: z.boolean(),
    isActive: z.boolean().optional(),
  })
  .openapi('UpdateUserRole');

// User preferences
export const UserPreferencesSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    notifications: z
      .object({
        email: z.boolean().default(true),
        push: z.boolean().default(false),
        marketing: z.boolean().default(false),
      })
      .default({}),
    dashboard: z
      .object({
        defaultView: z.enum(['grid', 'list']).default('grid'),
        itemsPerPage: z.number().int().min(10).max(100).default(20),
      })
      .default({}),
  })
  .openapi('UserPreferences');