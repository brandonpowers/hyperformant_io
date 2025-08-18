import { z } from '@hono/zod-openapi';
import {
  IdSchema,
  DateTimeSchema,
  PaginationQuerySchema,
  PaginationResponseSchema,
} from './common.schema';

/**
 * Entity-related schemas for competitive intelligence
 */

// Entity type enum
export const EntityTypeSchema = z
  .enum(['COMPANY', 'PRODUCT', 'PERSON', 'MARKET', 'SEGMENT'])
  .openapi({
    description: 'Type of entity in the competitive intelligence system',
  });

// Entity role enum
export const EntityRoleSchema = z.enum(['ADMIN', 'EDITOR', 'VIEWER']).openapi({
  description: 'User role within an entity',
});

// Industry schema
export const IndustrySchema = z
  .object({
    id: IdSchema,
    name: z.string().min(1).max(100),
    code: z.string().optional(),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
  })
  .openapi('Industry');

// Market segment schema
export const MarketSegmentSchema = z
  .object({
    id: IdSchema,
    name: z.string().min(1).max(100),
    industryId: IdSchema,
    industry: IndustrySchema.optional(),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
  })
  .openapi('MarketSegment');

// Base entity schema (consolidated with Company)
export const EntitySchema = z
  .object({
    id: IdSchema,
    type: EntityTypeSchema.default('COMPANY'),
    name: z.string().min(1).max(200),
    domain: z.string().optional(),
    ticker: z.string().optional(),
    foundedAt: DateTimeSchema.optional(),
    hqCountry: z.string().optional(),
    hqRegion: z.string().optional(),

    // Company-specific fields
    employees: z.number().int().positive().optional(),
    revenue: z.string().optional(),
    description: z.string().optional(),

    // Competitive intelligence fields
    isUserCompany: z.boolean().default(false),
    externalIds: z.record(z.string(), z.any()).optional(),

    industryId: IdSchema.optional(),
    industry: IndustrySchema.optional(),
    marketSegmentId: IdSchema.optional(),
    marketSegment: MarketSegmentSchema.optional(),

    // User management fields (for company entities)
    createdByUserId: IdSchema.optional(),
    createdBy: z
      .object({
        id: IdSchema,
        name: z.string().optional(),
        email: z.string().optional(),
      })
      .optional(),

    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,

    // Relations (optional - included when requested)
    members: z
      .array(
        z.object({
          id: IdSchema,
          role: EntityRoleSchema,
          joinedAt: DateTimeSchema,
          user: z.object({
            id: IdSchema,
            name: z.string().optional(),
            email: z.string().optional(),
          }),
        }),
      )
      .optional(),
    _count: z
      .object({
        reports: z.number().int().min(0),
        members: z.number().int().min(0),
        metrics: z.number().int().min(0),
        impacts: z.number().int().min(0),
        outgoing: z.number().int().min(0),
        incoming: z.number().int().min(0),
      })
      .optional(),
  })
  .openapi('Entity');

// Create entity request
export const CreateEntitySchema = z
  .object({
    type: EntityTypeSchema.default('COMPANY'),
    name: z.string().min(1).max(200),
    domain: z.string().optional(),
    ticker: z.string().optional(),
    foundedAt: DateTimeSchema.optional(),
    hqCountry: z.string().optional(),
    hqRegion: z.string().optional(),

    // Company-specific fields
    employees: z.number().int().positive().optional(),
    revenue: z.string().optional(),
    description: z.string().optional(),

    // Competitive intelligence fields
    isUserCompany: z.boolean().default(false),
    externalIds: z.record(z.string(), z.any()).optional(),
    industryId: IdSchema.optional(),
    marketSegmentId: IdSchema.optional(),
  })
  .openapi('CreateEntity');

// Update entity request
export const UpdateEntitySchema =
  CreateEntitySchema.partial().openapi('UpdateEntity');

// Entity query parameters
export const EntityQuerySchema = PaginationQuerySchema.extend({
  type: EntityTypeSchema.optional().openapi({
    description: 'Filter by entity type',
  }),
  industry: z.string().optional().openapi({
    description: 'Filter by industry ID',
  }),
  marketSegment: z.string().optional().openapi({
    description: 'Filter by market segment ID',
  }),
  search: z.string().optional().openapi({
    description: 'Search by name or domain',
  }),
  isUserCompany: z.boolean().optional().openapi({
    description: 'Filter for user companies only',
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
}).openapi('EntityQuery');

// Entity list response
export const EntityListResponseSchema = z
  .object({
    entities: z.array(EntitySchema),
    pagination: PaginationResponseSchema,
  })
  .openapi('EntityListResponse');

// Path parameters
export const EntityParamsSchema = z
  .object({
    id: IdSchema,
  })
  .openapi('EntityParams');

// Entity with full relations
export const EntityDetailSchema = EntitySchema.extend({
  recentSignals: z.array(z.any()).optional(),
  topConnections: z.array(z.any()).optional(),
  latestMetrics: z.array(z.any()).optional(),
  indices: z.array(z.any()).optional(),
}).openapi('EntityDetail');
