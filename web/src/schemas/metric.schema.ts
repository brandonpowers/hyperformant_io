import { z } from 'zod';
import {
  IdSchema,
  DateTimeSchema,
  PaginationQuerySchema,
  PaginationResponseSchema,
} from './common.schema';

/**
 * Metric-related schemas for time-series performance data
 */

// Metric kind enum
export const MetricKindSchema = z.enum([
  'FINANCIAL',
  'DIGITAL',
  'OPERATIONAL',
  'SENTIMENT',
  'INNOVATION',
]).openapi({
  description: 'Category of metric',
});

// Time window enum
export const TimeWindowSchema = z.enum([
  'DAY',
  'WEEK',
  'MONTH',
  'QUARTER',
  'YEAR',
]).openapi({
  description: 'Time aggregation window',
});

// Metric definition schema
export const MetricDefinitionSchema = z
  .object({
    id: IdSchema,
    key: z.string().min(1).max(50),
    kind: MetricKindSchema,
    unit: z.string().optional(),
    description: z.string().optional(),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
  })
  .openapi('MetricDefinition');

// Create metric definition request
export const CreateMetricDefinitionSchema = z
  .object({
    key: z.string().min(1).max(50),
    kind: MetricKindSchema,
    unit: z.string().optional(),
    description: z.string().optional(),
  })
  .openapi('CreateMetricDefinition');

// Metric point schema
export const MetricPointSchema = z
  .object({
    id: IdSchema,
    entityId: IdSchema,
    metricDefinitionId: IdSchema,
    timestamp: DateTimeSchema,
    window: TimeWindowSchema,
    value: z.number(),
    source: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    createdAt: DateTimeSchema,
    
    // Relations (optional)
    metricDefinition: MetricDefinitionSchema.optional(),
  })
  .openapi('MetricPoint');

// Create metric point request
export const CreateMetricPointSchema = z
  .object({
    entityId: IdSchema,
    metricDefinitionId: IdSchema,
    timestamp: DateTimeSchema.default(() => new Date().toISOString()),
    window: TimeWindowSchema.default('DAY'),
    value: z.number(),
    source: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .openapi('CreateMetricPoint');

// Batch metric points creation
export const CreateMetricPointBatchSchema = z
  .object({
    points: z.array(CreateMetricPointSchema).min(1).max(1000),
  })
  .openapi('CreateMetricPointBatch');

// Metric series query parameters
export const MetricSeriesQuerySchema = z
  .object({
    entityId: IdSchema,
    metricDefinitionId: IdSchema.optional().openapi({
      description: 'Specific metric to retrieve',
    }),
    metricKeys: z.array(z.string()).optional().openapi({
      description: 'Filter by metric keys',
    }),
    fromDate: DateTimeSchema.optional(),
    toDate: DateTimeSchema.optional(),
    window: TimeWindowSchema.optional(),
    aggregation: z.enum(['avg', 'sum', 'min', 'max', 'last']).optional().openapi({
      description: 'Aggregation method for multiple points',
    }),
  })
  .openapi('MetricSeriesQuery');

// Metric series response
export const MetricSeriesResponseSchema = z
  .object({
    entityId: IdSchema,
    series: z.array(z.object({
      metricDefinition: MetricDefinitionSchema,
      points: z.array(z.object({
        timestamp: DateTimeSchema,
        value: z.number(),
        window: TimeWindowSchema,
        source: z.string().optional(),
      })),
    })),
  })
  .openapi('MetricSeriesResponse');

// Metric aggregation query
export const MetricAggregationQuerySchema = z
  .object({
    entityIds: z.array(IdSchema).min(1).openapi({
      description: 'Entities to aggregate metrics for',
    }),
    metricKeys: z.array(z.string()).min(1).openapi({
      description: 'Metrics to aggregate',
    }),
    fromDate: DateTimeSchema.optional(),
    toDate: DateTimeSchema.optional(),
    window: TimeWindowSchema.default('MONTH'),
    groupBy: z.enum(['entity', 'metric', 'time']).optional(),
  })
  .openapi('MetricAggregationQuery');

// Metric aggregation response
export const MetricAggregationResponseSchema = z
  .object({
    aggregations: z.array(z.object({
      entityId: IdSchema.optional(),
      metricKey: z.string().optional(),
      window: TimeWindowSchema,
      timestamp: DateTimeSchema.optional(),
      value: z.number(),
      count: z.number(),
      min: z.number(),
      max: z.number(),
      avg: z.number(),
    })),
  })
  .openapi('MetricAggregationResponse');

// Metric definitions list response
export const MetricDefinitionListResponseSchema = z
  .object({
    definitions: z.array(MetricDefinitionSchema),
    pagination: PaginationResponseSchema,
  })
  .openapi('MetricDefinitionListResponse');