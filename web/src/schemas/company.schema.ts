import { z } from 'zod';
import {
  IdSchema,
  DateTimeSchema,
  PaginationQuerySchema,
  PaginationResponseSchema,
} from './common.schema';
import { UserSchema } from './user.schema';

/**
 * Company-related schemas
 * Maps to Prisma Company model
 */

// Company role enum
export const CompanyRoleSchema = z.enum(['ADMIN', 'EDITOR', 'VIEWER']).openapi({
  description: 'User role within a company',
});

// Base company schema
export const CompanySchema = z
  .object({
    id: IdSchema,
    name: z
      .string()
      .min(1, 'Company name is required')
      .max(100, 'Name too long'),
    domain: z.string().optional(),
    industry: z.string().optional(),
    employees: z.number().int().positive().optional(),
    revenue: z.string().optional(),
    founded: DateTimeSchema.optional(),
    description: z.string().max(1000, 'Description too long').optional(),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,

    // Relations (optional - included when requested)
    createdBy: UserSchema.optional(),
    members: z
      .array(
        z.object({
          id: IdSchema,
          role: CompanyRoleSchema,
          joinedAt: DateTimeSchema,
          user: UserSchema,
        }),
      )
      .optional(),
    _count: z
      .object({
        reports: z.number().int().min(0),
        members: z.number().int().min(0),
      })
      .optional(),
  })
  .openapi('Company');

// Create company request
export const CreateCompanySchema = z
  .object({
    name: z
      .string()
      .min(1, 'Company name is required')
      .max(100, 'Name too long'),
    domain: z.string().optional(),
    industry: z.string().optional(),
    employees: z.number().int().positive().optional(),
    revenue: z.string().optional(),
    founded: DateTimeSchema.optional(),
    description: z.string().max(1000, 'Description too long').optional(),
  })
  .openapi('CreateCompany');

// Update company request
export const UpdateCompanySchema =
  CreateCompanySchema.partial().openapi('UpdateCompany');

// Company query parameters
export const CompanyQuerySchema = PaginationQuerySchema.extend({
  industry: z.string().optional().openapi({
    description: 'Filter by industry',
    example: 'Technology',
  }),
  sortBy: z
    .enum(['name', 'createdAt', 'updatedAt'])
    .default('createdAt')
    .openapi({
      description: 'Field to sort by',
    }),
  sortOrder: z.enum(['asc', 'desc']).default('desc').openapi({
    description: 'Sort direction',
  }),
}).openapi('CompanyQuery');

// Company list response
export const CompanyListResponseSchema = z
  .object({
    companies: z.array(CompanySchema),
    pagination: PaginationResponseSchema,
  })
  .openapi('CompanyListResponse');

// Path parameters
export const CompanyParamsSchema = z
  .object({
    id: IdSchema,
  })
  .openapi('CompanyParams');

// Company member management
export const CompanyMemberSchema = z
  .object({
    id: IdSchema,
    companyId: IdSchema,
    userId: IdSchema,
    role: CompanyRoleSchema,
    joinedAt: DateTimeSchema,
    user: UserSchema,
  })
  .openapi('CompanyMember');

export const InviteMemberSchema = z
  .object({
    email: z.string().email('Valid email required'),
    role: CompanyRoleSchema.default('VIEWER'),
    message: z.string().max(500).optional(),
  })
  .openapi('InviteMember');

export const UpdateMemberRoleSchema = z
  .object({
    role: CompanyRoleSchema,
  })
  .openapi('UpdateMemberRole');

// Company access request
export const CompanyAccessRequestSchema = z
  .object({
    id: IdSchema,
    companyId: IdSchema,
    requesterId: IdSchema,
    requestedRole: CompanyRoleSchema,
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
    message: z.string().max(500).optional(),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,

    // Relations
    company: CompanySchema.pick({ id: true, name: true }).optional(),
    requester: UserSchema.optional(),
  })
  .openapi('CompanyAccessRequest');

export const CreateAccessRequestSchema = z
  .object({
    requestedRole: CompanyRoleSchema.default('VIEWER'),
    message: z.string().max(500).optional(),
  })
  .openapi('CreateAccessRequest');
