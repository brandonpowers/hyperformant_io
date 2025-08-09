import { z } from 'zod';
import {
  IdSchema,
  DateTimeSchema,
  PaginationQuerySchema,
  PaginationResponseSchema,
} from './common.schema';
import { UserSchema } from './user.schema';
import { EntityRoleSchema } from './entity.schema';

/**
 * Company-related schemas (now aliases for Entity schemas)
 * Maps to consolidated Entity model with type='COMPANY'
 */

// Re-export as CompanyRoleSchema for backward compatibility
export const CompanyRoleSchema = EntityRoleSchema;

// Base company schema (now based on Entity)
export const CompanySchema = z
  .object({
    id: IdSchema,
    type: z.literal('COMPANY').default('COMPANY'),
    name: z
      .string()
      .min(1, 'Company name is required')
      .max(200, 'Name too long'),
    domain: z.string().optional(),
    ticker: z.string().optional(),
    foundedAt: DateTimeSchema.optional(),
    hqCountry: z.string().optional(),
    hqRegion: z.string().optional(),

    // Company-specific fields
    employees: z.number().int().positive().optional(),
    revenue: z.string().optional(),
    description: z.string().max(1000, 'Description too long').optional(),

    // Competitive intelligence fields
    isUserCompany: z.boolean().default(false),
    externalIds: z.record(z.string(), z.any()).optional(),

    industryId: IdSchema.optional(),
    industry: z
      .object({
        id: IdSchema,
        name: z.string(),
        code: z.string().optional(),
      })
      .optional(),

    marketSegmentId: IdSchema.optional(),
    marketSegment: z
      .object({
        id: IdSchema,
        name: z.string(),
        industryId: IdSchema,
      })
      .optional(),

    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,

    // Relations (optional - included when requested)
    createdBy: UserSchema.optional(),
    members: z
      .array(
        z.object({
          id: IdSchema,
          role: EntityRoleSchema,
          joinedAt: DateTimeSchema,
          user: UserSchema,
        }),
      )
      .optional(),
    _count: z
      .object({
        reports: z.number().int().min(0),
        members: z.number().int().min(0),
        metrics: z.number().int().min(0),
        signals: z.number().int().min(0),
        connections: z.number().int().min(0),
      })
      .optional(),
  })
  .openapi('Company');

// Create company request
export const CreateCompanySchema = z
  .object({
    type: z.literal('COMPANY').default('COMPANY'),
    name: z
      .string()
      .min(1, 'Company name is required')
      .max(200, 'Name too long'),
    domain: z.string().optional(),
    ticker: z.string().optional(),
    foundedAt: DateTimeSchema.optional(),
    hqCountry: z.string().optional(),
    hqRegion: z.string().optional(),
    employees: z.number().int().positive().optional(),
    revenue: z.string().optional(),
    description: z.string().max(1000, 'Description too long').optional(),
    industryId: IdSchema.optional(),
    marketSegmentId: IdSchema.optional(),
    isUserCompany: z.boolean().default(true), // Default true for user-created companies
  })
  .openapi('CreateCompany');

// Update company request
export const UpdateCompanySchema =
  CreateCompanySchema.partial().openapi('UpdateCompany');

// Company query parameters
export const CompanyQuerySchema = PaginationQuerySchema.extend({
  industryId: IdSchema.optional().openapi({
    description: 'Filter by industry ID',
  }),
  marketSegmentId: IdSchema.optional().openapi({
    description: 'Filter by market segment ID',
  }),
  search: z.string().optional().openapi({
    description: 'Search by name or domain',
  }),
  sortBy: z
    .enum(['name', 'createdAt', 'updatedAt', 'foundedAt'])
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

// Company member management (now EntityMember)
export const CompanyMemberSchema = z
  .object({
    id: IdSchema,
    entityId: IdSchema, // Changed from companyId
    userId: IdSchema,
    role: EntityRoleSchema,
    joinedAt: DateTimeSchema,
    user: UserSchema,
  })
  .openapi('CompanyMember');

export const InviteMemberSchema = z
  .object({
    email: z.string().email('Valid email required'),
    role: EntityRoleSchema.default('VIEWER'),
    message: z.string().max(500).optional(),
  })
  .openapi('InviteMember');

export const UpdateMemberRoleSchema = z
  .object({
    role: EntityRoleSchema,
  })
  .openapi('UpdateMemberRole');

// Company access request (now EntityAccessRequest)
export const CompanyAccessRequestSchema = z
  .object({
    id: IdSchema,
    entityId: IdSchema, // Changed from companyId
    requesterId: IdSchema,
    requestedRole: EntityRoleSchema,
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
    message: z.string().max(500).optional(),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,

    // Relations
    entity: CompanySchema.pick({ id: true, name: true }).optional(), // Changed from company
    requester: UserSchema.optional(),
  })
  .openapi('CompanyAccessRequest');

export const CreateAccessRequestSchema = z
  .object({
    requestedRole: EntityRoleSchema.default('VIEWER'),
    message: z.string().max(500).optional(),
  })
  .openapi('CreateAccessRequest');
