import { z } from '@hono/zod-openapi';
import {
  IdSchema,
  DateTimeSchema,
  PaginationQuerySchema,
  PaginationResponseSchema,
} from './common.schema';

/**
 * Intelligence-related schemas for composite indices and context
 */

// Data source type enum
export const DataSourceTypeSchema = z
  .enum(['API', 'SCRAPER', 'MANUAL', 'LLM'])
  .openapi({
    description: 'Type of data source',
  });

// Run status enum
export const RunStatusSchema = z
  .enum(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED'])
  .openapi({
    description: 'Status of ingestion run',
  });

// Index definition schema
export const IndexDefinitionSchema = z
  .object({
    id: IdSchema,
    key: z.string().min(1).max(50),
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    formula: z.record(z.string(), z.any()).optional(),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
  })
  .openapi('IndexDefinition');

// Create index definition request
export const CreateIndexDefinitionSchema = z
  .object({
    key: z.string().min(1).max(50),
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    formula: z.record(z.string(), z.any()).optional(),
  })
  .openapi('CreateIndexDefinition');

// Index value schema
export const IndexValueSchema = z
  .object({
    id: IdSchema,
    entityId: IdSchema,
    indexDefinitionId: IdSchema,
    asOf: DateTimeSchema,
    value: z.number(),
    normalized: z.number().min(0).max(1).optional().openapi({
      description: 'Normalized value (0-1) for visualization',
    }),
    createdAt: DateTimeSchema,

    // Relations (optional)
    indexDefinition: IndexDefinitionSchema.optional(),
  })
  .openapi('IndexValue');

// Create index value request
export const CreateIndexValueSchema = z
  .object({
    entityId: IdSchema,
    indexDefinitionId: IdSchema,
    asOf: DateTimeSchema.default(() => new Date().toISOString()),
    value: z.number(),
    normalized: z.number().min(0).max(1).optional(),
  })
  .openapi('CreateIndexValue');

// Context dimension schema
export const ContextDimensionSchema = z
  .object({
    id: IdSchema,
    key: z.string().min(1).max(50),
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
  })
  .openapi('ContextDimension');

// Create context dimension request
export const CreateContextDimensionSchema = z
  .object({
    key: z.string().min(1).max(50),
    name: z.string().min(1).max(100),
    description: z.string().optional(),
  })
  .openapi('CreateContextDimension');

// Context value schema
export const ContextValueSchema = z
  .object({
    id: IdSchema,
    contextDimensionId: IdSchema,
    industryId: IdSchema.optional(),
    marketSegmentId: IdSchema.optional(),
    region: z.string().optional(),
    asOf: DateTimeSchema,
    value: z.number(),
    source: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    createdAt: DateTimeSchema,

    // Relations (optional)
    dimension: ContextDimensionSchema.optional(),
  })
  .openapi('ContextValue');

// Create context value request
export const CreateContextValueSchema = z
  .object({
    contextDimensionId: IdSchema,
    industryId: IdSchema.optional(),
    marketSegmentId: IdSchema.optional(),
    region: z.string().optional(),
    asOf: DateTimeSchema.default(() => new Date().toISOString()),
    value: z.number(),
    source: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .openapi('CreateContextValue');

// Data source schema
export const DataSourceSchema = z
  .object({
    id: IdSchema,
    name: z.string().min(1).max(100),
    type: DataSourceTypeSchema,
    credRef: z.string().optional(),
    trustScore: z.number().min(0).max(1).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
  })
  .openapi('DataSource');

// Create data source request
export const CreateDataSourceSchema = z
  .object({
    name: z.string().min(1).max(100),
    type: DataSourceTypeSchema,
    credRef: z.string().optional(),
    trustScore: z.number().min(0).max(1).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .openapi('CreateDataSource');

// Ingestion run schema
export const IngestionRunSchema = z
  .object({
    id: IdSchema,
    dataSourceId: IdSchema,
    status: RunStatusSchema,
    startedAt: DateTimeSchema,
    finishedAt: DateTimeSchema.optional(),
    itemsIn: z.number().int().min(0).optional(),
    itemsOut: z.number().int().min(0).optional(),
    error: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),

    // Relations (optional)
    dataSource: DataSourceSchema.optional(),
  })
  .openapi('IngestionRun');

// Create ingestion run request
export const CreateIngestionRunSchema = z
  .object({
    dataSourceId: IdSchema,
    status: RunStatusSchema.default('PENDING'),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .openapi('CreateIngestionRun');

// Update ingestion run request
export const UpdateIngestionRunSchema = z
  .object({
    status: RunStatusSchema.optional(),
    finishedAt: DateTimeSchema.optional(),
    itemsIn: z.number().int().min(0).optional(),
    itemsOut: z.number().int().min(0).optional(),
    error: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .openapi('UpdateIngestionRun');

// Intelligence analysis request
export const AnalyzeRequestSchema = z
  .object({
    entityIds: z.array(IdSchema).min(1).max(10),
    analysisType: z.enum(['competitive', 'market', 'risk', 'opportunity']),
    timeframe: z
      .object({
        from: DateTimeSchema,
        to: DateTimeSchema,
      })
      .optional(),
    includeConnections: z.boolean().default(true),
    includeSignals: z.boolean().default(true),
    includeMetrics: z.boolean().default(true),
  })
  .openapi('AnalyzeRequest');

// Intelligence analysis response
export const AnalysisResponseSchema = z
  .object({
    entities: z.array(
      z.object({
        id: IdSchema,
        name: z.string(),
        scores: z.record(z.string(), z.number()),
        insights: z.array(z.string()),
        risks: z.array(z.string()),
        opportunities: z.array(z.string()),
      }),
    ),
    marketContext: z.record(z.string(), z.any()),
    recommendations: z.array(z.string()),
    generatedAt: DateTimeSchema,
  })
  .openapi('AnalysisResponse');
