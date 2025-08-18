import { z } from '@hono/zod-openapi';
import {
  IdSchema,
  DateTimeSchema,
  PaginationQuerySchema,
  PaginationResponseSchema,
} from './common.schema';

/**
 * Connection-related schemas for entity relationships
 */

// Connection type enum
export const ConnectionTypeSchema = z
  .enum([
    'PARTNERSHIP',
    'COMPETITOR',
    'CUSTOMER_SUPPLIER',
    'INVESTOR_PORTFOLIO',
    'OWNERSHIP',
    'BOARD_LINK',
    'JOINT_RD',
    'CO_PATENT',
    'TECH_AFFINITY',
    'REGULATORY',
    'LEGAL_DISPUTE',
    'SUPPLY_CHAIN',
    'INDUSTRY_ADJACENCY',
    'WEAK_COMPETITOR',
  ])
  .openapi({
    description: 'Type of connection between entities',
  });

// Base connection schema
export const ConnectionSchema = z
  .object({
    id: IdSchema,
    sourceEntityId: IdSchema,
    targetEntityId: IdSchema,
    type: ConnectionTypeSchema,
    strength: z.number().min(0).max(1).optional().openapi({
      description: 'Connection strength (0-1)',
    }),
    sentimentScore: z.number().min(-1).max(1).optional().openapi({
      description: 'Sentiment of relationship (-1 to 1)',
    }),
    since: DateTimeSchema,
    until: DateTimeSchema.optional(),
    metadata: z.record(z.string(), z.any()).optional(),

    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,

    // Relations (optional - included when requested)
    source: z
      .object({
        id: IdSchema,
        name: z.string(),
        type: z.string(),
      })
      .optional(),
    target: z
      .object({
        id: IdSchema,
        name: z.string(),
        type: z.string(),
      })
      .optional(),
  })
  .openapi('Connection');

// Create connection request
export const CreateConnectionSchema = z
  .object({
    sourceEntityId: IdSchema,
    targetEntityId: IdSchema,
    type: ConnectionTypeSchema,
    strength: z.number().min(0).max(1).optional(),
    sentimentScore: z.number().min(-1).max(1).optional(),
    since: DateTimeSchema.default(() => new Date().toISOString()),
    until: DateTimeSchema.optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .openapi('CreateConnection');

// Update connection request
export const UpdateConnectionSchema = z
  .object({
    strength: z.number().min(0).max(1).optional(),
    sentimentScore: z.number().min(-1).max(1).optional(),
    until: DateTimeSchema.optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .openapi('UpdateConnection');

// Connection event schema
export const ConnectionEventSchema = z
  .object({
    connectionId: IdSchema,
    signalId: IdSchema,
  })
  .openapi('ConnectionEvent');

// Connection query parameters
export const ConnectionQuerySchema = PaginationQuerySchema.extend({
  entityId: IdSchema.optional().openapi({
    description: 'Filter connections for specific entity (as source or target)',
  }),
  sourceEntityId: IdSchema.optional().openapi({
    description: 'Filter by source entity',
  }),
  targetEntityId: IdSchema.optional().openapi({
    description: 'Filter by target entity',
  }),
  type: ConnectionTypeSchema.optional(),
  minStrength: z.number().min(0).max(1).optional().openapi({
    description: 'Minimum connection strength',
  }),
  active: z.boolean().optional().openapi({
    description: 'Only active connections (no until date)',
  }),
  sortBy: z
    .enum(['since', 'strength', 'sentimentScore', 'createdAt'])
    .default('since')
    .openapi({
      description: 'Field to sort by',
    }),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).openapi('ConnectionQuery');

// Connection list response
export const ConnectionListResponseSchema = z
  .object({
    connections: z.array(ConnectionSchema),
    pagination: PaginationResponseSchema,
  })
  .openapi('ConnectionListResponse');

// Path parameters
export const ConnectionParamsSchema = z
  .object({
    id: IdSchema,
  })
  .openapi('ConnectionParams');

// Connection detail with full entities
export const ConnectionDetailSchema = ConnectionSchema.extend({
  events: z
    .array(
      z.object({
        id: IdSchema,
        signal: z.object({
          id: IdSchema,
          timestamp: DateTimeSchema,
          type: z.string(),
          summary: z.string().optional(),
        }),
        createdAt: DateTimeSchema,
      }),
    )
    .optional(),
}).openapi('ConnectionDetail');

// Network graph response for visualization
export const NetworkGraphSchema = z
  .object({
    nodes: z.array(
      z.object({
        id: IdSchema,
        name: z.string(),
        type: z.string(),
        group: z.string().optional(),
      }),
    ),
    edges: z.array(
      z.object({
        id: IdSchema,
        source: IdSchema,
        target: IdSchema,
        type: ConnectionTypeSchema,
        strength: z.number().optional(),
        sentiment: z.number().optional(),
      }),
    ),
  })
  .openapi('NetworkGraph');
