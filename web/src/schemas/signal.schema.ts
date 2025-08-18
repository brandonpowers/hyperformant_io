import { z } from '@hono/zod-openapi';
import {
  IdSchema,
  DateTimeSchema,
  PaginationQuerySchema,
  PaginationResponseSchema,
} from './common.schema';

/**
 * Signal-related schemas for competitive intelligence events
 */

// Signal category enum
export const SignalCategorySchema = z
  .enum([
    'MARKET',
    'COMPETITIVE',
    'DEAL',
    'PRODUCT',
    'TALENT',
    'RISK',
    'ENGAGEMENT',
  ])
  .openapi({
    description: 'Category of signal/event',
  });

// Signal type enum
export const SignalTypeSchema = z
  .enum([
    'ACQUISITION',
    'FUNDING_ROUND',
    'PARTNERSHIP',
    'COMPETITOR_LAUNCH',
    'PRICING_CHANGE',
    'MARKET_ENTRY',
    'CUSTOMER_WIN',
    'CUSTOMER_LOSS',
    'PRESS_MENTION',
    'SOCIAL_POST',
    'REVIEW',
    'PRODUCT_LAUNCH',
    'MAJOR_UPDATE',
    'PATENT_FILED',
    'EXEC_HIRE',
    'EXEC_DEPARTURE',
    'LAYOFF',
    'LAWSUIT',
    'SECURITY_BREACH',
    'REGULATORY_CHANGE',
    'TRAFFIC_SPIKE',
    'SEO_RANK_CHANGE',
    'ANALYST_FORECAST',
    'TREND_REPORT',
    'IPO',
    'MERGER',
    'CONTROVERSY',
  ])
  .openapi({
    description: 'Specific type of signal/event',
  });

// Sentiment label enum
export const SentimentLabelSchema = z
  .enum(['NEGATIVE', 'NEUTRAL', 'POSITIVE'])
  .openapi({
    description: 'Sentiment classification',
  });

// Impact role enum
export const ImpactRoleSchema = z
  .enum(['SUBJECT', 'ACTOR', 'TARGET', 'MENTIONED'])
  .openapi({
    description: 'Role of entity in signal impact',
  });

// Signal impact schema
export const SignalImpactSchema = z
  .object({
    entityId: IdSchema,
    role: ImpactRoleSchema,
    weight: z.number().min(0).max(1).openapi({
      description: 'Importance weight for this entity (0-1)',
    }),
  })
  .openapi('SignalImpact');

// Base signal schema
export const SignalSchema = z
  .object({
    id: IdSchema,
    timestamp: DateTimeSchema,
    source: z.string().min(1).max(100),
    category: SignalCategorySchema,
    type: SignalTypeSchema,
    magnitude: z.number().min(0).max(1).openapi({
      description: 'Signal magnitude/importance (0-1)',
    }),
    sentimentScore: z.number().min(-1).max(1).optional().openapi({
      description: 'Sentiment score (-1 to 1)',
    }),
    sentimentLabel: SentimentLabelSchema.optional(),
    summary: z.string().max(500).optional(),
    details: z.record(z.string(), z.any()).optional(),
    decayHalfLifeDays: z.number().int().positive().optional().openapi({
      description: 'Days for signal importance to decay by half',
    }),
    tags: z.array(z.string()).default([]),

    createdAt: DateTimeSchema,

    // Relations (optional - included when requested)
    impacts: z.array(SignalImpactSchema).optional(),
  })
  .openapi('Signal');

// Create signal request
export const CreateSignalSchema = z
  .object({
    timestamp: DateTimeSchema.default(() => new Date().toISOString()),
    source: z.string().min(1).max(100),
    category: SignalCategorySchema,
    type: SignalTypeSchema,
    magnitude: z.number().min(0).max(1),
    sentimentScore: z.number().min(-1).max(1).optional(),
    sentimentLabel: SentimentLabelSchema.optional(),
    summary: z.string().max(500).optional(),
    details: z.record(z.string(), z.any()).optional(),
    decayHalfLifeDays: z.number().int().positive().optional(),
    tags: z.array(z.string()).default([]),
    impacts: z.array(SignalImpactSchema).min(1).openapi({
      description: 'Entities impacted by this signal',
    }),
  })
  .openapi('CreateSignal');

// Batch signal creation
export const CreateSignalBatchSchema = z
  .object({
    signals: z.array(CreateSignalSchema).min(1).max(100),
  })
  .openapi('CreateSignalBatch');

// Signal query parameters
export const SignalQuerySchema = PaginationQuerySchema.extend({
  entityId: IdSchema.optional().openapi({
    description: 'Filter signals for specific entity',
  }),
  category: SignalCategorySchema.optional(),
  type: SignalTypeSchema.optional(),
  fromDate: DateTimeSchema.optional().openapi({
    description: 'Filter signals from this date',
  }),
  toDate: DateTimeSchema.optional().openapi({
    description: 'Filter signals until this date',
  }),
  minMagnitude: z.number().min(0).max(1).optional().openapi({
    description: 'Minimum signal magnitude',
  }),
  sentiment: SentimentLabelSchema.optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional().openapi({
    description: 'Filter by any of these tags',
  }),
  sortBy: z
    .enum(['timestamp', 'magnitude', 'sentimentScore', 'createdAt'])
    .default('timestamp')
    .openapi({
      description: 'Field to sort by',
    }),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).openapi('SignalQuery');

// Signal list response
export const SignalListResponseSchema = z
  .object({
    signals: z.array(SignalSchema),
    pagination: PaginationResponseSchema,
  })
  .openapi('SignalListResponse');

// Path parameters
export const SignalParamsSchema = z
  .object({
    id: IdSchema,
  })
  .openapi('SignalParams');

// Signal detail with full impacts
export const SignalDetailSchema = SignalSchema.extend({
  impacts: z.array(
    SignalImpactSchema.extend({
      entity: z.object({
        id: IdSchema,
        name: z.string(),
        type: z.string(),
      }),
    }),
  ),
}).openapi('SignalDetail');
