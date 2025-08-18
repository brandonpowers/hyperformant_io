import { OpenAPIHono } from '@hono/zod-openapi';
import { PrismaClient } from '@prisma/client';
import { z } from '@hono/zod-openapi';
import {
  MetricDefinitionSchema,
  CreateMetricDefinitionSchema,
  MetricPointSchema,
  CreateMetricPointSchema,
  CreateMetricPointBatchSchema,
  MetricSeriesQuerySchema,
  MetricSeriesResponseSchema,
  MetricAggregationQuerySchema,
  MetricAggregationResponseSchema,
  MetricDefinitionListResponseSchema,
} from '../schemas';
import { ApiError } from '../lib/api/errors';
import { ApiResponse } from '../lib/api/responses';
import { createSafeAuthMiddleware } from '../lib/api/context-safety';

const prisma = new PrismaClient();

// Create Hono app with OpenAPI
export const metricsApp = new OpenAPIHono();

// Use the shared authentication middleware
const authMiddleware = createSafeAuthMiddleware();

/**
 * METRIC DEFINITIONS ROUTES
 */

// GET /metrics/definitions - List metric definitions
metricsApp.openapi(
  {
    method: 'get',
    path: '/metrics/definitions',
    summary: 'List metric definitions',
    description: 'Retrieve all metric definitions with optional filtering',
    tags: ['Metrics'],
    security: [{ Bearer: [] }],
    request: {
      query: z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(50),
        kind: z.string().optional(),
        search: z.string().optional(),
      }),
    },
    responses: {
      200: {
        description: 'List of metric definitions',
        content: {
          'application/json': {
            schema: MetricDefinitionListResponseSchema,
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const query = c.req.valid('query');

    // Build where clause
    const where: any = {};

    if (query.kind) {
      where.kind = query.kind;
    }

    if (query.search) {
      where.OR = [
        { key: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Calculate pagination
    const skip = (query.page - 1) * query.limit;

    // Execute queries
    const [definitions, total] = await Promise.all([
      prisma.metricDefinition.findMany({
        where,
        orderBy: { key: 'asc' },
        skip,
        take: query.limit,
      }),
      prisma.metricDefinition.count({ where }),
    ]);

    const response = {
      definitions,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    };

    return c.json(ApiResponse.success(response));
  },
);

// POST /metrics/definitions - Create metric definition
metricsApp.openapi(
  {
    method: 'post',
    path: '/metrics/definitions',
    summary: 'Create metric definition',
    description: 'Create a new metric definition',
    tags: ['Metrics'],
    security: [{ Bearer: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: CreateMetricDefinitionSchema,
        },
      },
    },
    responses: {
      201: {
        description: 'Metric definition created',
        content: {
          'application/json': {
            schema: MetricDefinitionSchema,
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const body = await c.req.json();

    // Check if key already exists
    const existing = await prisma.metricDefinition.findUnique({
      where: { key: body.key },
    });

    if (existing) {
      throw ApiError.conflict('Metric definition with this key already exists');
    }

    // Create metric definition
    const definition = await prisma.metricDefinition.create({
      data: body,
    });

    return c.json(ApiResponse.created(definition), 201);
  },
);

/**
 * METRIC POINTS ROUTES
 */

// POST /metrics/points - Create metric point
metricsApp.openapi(
  {
    method: 'post',
    path: '/metrics/points',
    summary: 'Create metric point',
    description: 'Record a metric data point for an entity',
    tags: ['Metrics'],
    security: [{ Bearer: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: CreateMetricPointSchema,
        },
      },
    },
    responses: {
      201: {
        description: 'Metric point created',
        content: {
          'application/json': {
            schema: MetricPointSchema,
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const body = await c.req.json();

    // Validate entity and metric definition exist
    const [entity, metricDef] = await Promise.all([
      prisma.entity.findUnique({ where: { id: body.entityId } }),
      prisma.metricDefinition.findUnique({
        where: { id: body.metricDefinitionId },
      }),
    ]);

    if (!entity) {
      throw ApiError.validation('Entity not found');
    }
    if (!metricDef) {
      throw ApiError.validation('Metric definition not found');
    }

    // Create or update metric point
    const point = await prisma.metricPoint.upsert({
      where: {
        entityId_metricDefinitionId_timestamp_window: {
          entityId: body.entityId,
          metricDefinitionId: body.metricDefinitionId,
          timestamp: new Date(body.timestamp),
          window: body.window,
        },
      },
      update: {
        value: body.value,
        source: body.source,
        metadata: body.metadata,
      },
      create: {
        ...body,
        timestamp: new Date(body.timestamp),
      },
      include: {
        metricDefinition: true,
      },
    });

    return c.json(ApiResponse.created(point), 201);
  },
);

// POST /metrics/points/batch - Create multiple metric points
metricsApp.openapi(
  {
    method: 'post',
    path: '/metrics/points/batch',
    summary: 'Create multiple metric points',
    description: 'Batch create metric data points',
    tags: ['Metrics'],
    security: [{ Bearer: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: CreateMetricPointBatchSchema,
        },
      },
    },
    responses: {
      201: {
        description: 'Metric points created',
      },
    },
  },
  authMiddleware,
  async (c) => {
    const body = await c.req.json();

    if (!body.points?.length) {
      throw ApiError.validation('Points array is required');
    }

    // Validate all entity and metric definition IDs
    const entityIds = [...new Set(body.points.map((p: any) => p.entityId))];
    const metricDefIds = [
      ...new Set(body.points.map((p: any) => p.metricDefinitionId)),
    ];

    const [entities, metricDefs] = await Promise.all([
      prisma.entity.findMany({ where: { id: { in: entityIds } } }),
      prisma.metricDefinition.findMany({ where: { id: { in: metricDefIds } } }),
    ]);

    const validEntityIds = new Set(entities.map((e) => e.id));
    const validMetricDefIds = new Set(metricDefs.map((m) => m.id));

    // Check for invalid IDs
    const invalidEntityIds = entityIds.filter((id) => !validEntityIds.has(id));
    const invalidMetricDefIds = metricDefIds.filter(
      (id) => !validMetricDefIds.has(id),
    );

    if (invalidEntityIds.length > 0) {
      throw ApiError.validation(
        `Invalid entity IDs: ${invalidEntityIds.join(', ')}`,
      );
    }
    if (invalidMetricDefIds.length > 0) {
      throw ApiError.validation(
        `Invalid metric definition IDs: ${invalidMetricDefIds.join(', ')}`,
      );
    }

    // Create points in transaction
    const results = await prisma.$transaction(async (tx) => {
      const created = [];

      for (const pointData of body.points) {
        const point = await tx.metricPoint.upsert({
          where: {
            entityId_metricDefinitionId_timestamp_window: {
              entityId: pointData.entityId,
              metricDefinitionId: pointData.metricDefinitionId,
              timestamp: new Date(pointData.timestamp),
              window: pointData.window,
            },
          },
          update: {
            value: pointData.value,
            source: pointData.source,
            metadata: pointData.metadata,
          },
          create: {
            ...pointData,
            timestamp: new Date(pointData.timestamp),
          },
        });

        created.push(point);
      }

      return created;
    });

    return c.json(
      ApiResponse.created({ created: results.length, points: results }),
      201,
    );
  },
);

// GET /metrics/series - Get time series data
metricsApp.openapi(
  {
    method: 'get',
    path: '/metrics/series',
    summary: 'Get metric time series',
    description: 'Retrieve time series data for entity metrics',
    tags: ['Metrics'],
    security: [{ Bearer: [] }],
    request: {
      query: MetricSeriesQuerySchema,
    },
    responses: {
      200: {
        description: 'Metric time series',
        content: {
          'application/json': {
            schema: MetricSeriesResponseSchema,
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const query = c.req.valid('query');

    // Validate entity exists
    const entity = await prisma.entity.findUnique({
      where: { id: query.entityId },
    });

    if (!entity) {
      throw ApiError.validation('Entity not found');
    }

    // Build where clause for metric points
    const where: any = {
      entityId: query.entityId,
    };

    if (query.metricDefinitionId) {
      where.metricDefinitionId = query.metricDefinitionId;
    }

    if (query.metricKeys?.length) {
      where.metricDefinition = {
        key: { in: query.metricKeys },
      };
    }

    if (query.fromDate || query.toDate) {
      where.timestamp = {};
      if (query.fromDate) {
        where.timestamp.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.timestamp.lte = new Date(query.toDate);
      }
    }

    if (query.window) {
      where.window = query.window;
    }

    // Get metric points grouped by definition
    const points = await prisma.metricPoint.findMany({
      where,
      include: {
        metricDefinition: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group by metric definition
    const seriesMap = new Map();

    points.forEach((point) => {
      const key = point.metricDefinition.key;
      if (!seriesMap.has(key)) {
        seriesMap.set(key, {
          metricDefinition: point.metricDefinition,
          points: [],
        });
      }

      seriesMap.get(key).points.push({
        timestamp: point.timestamp,
        value: point.value,
        window: point.window,
        source: point.source,
      });
    });

    const response = {
      entityId: query.entityId,
      series: Array.from(seriesMap.values()),
    };

    return c.json(ApiResponse.success(response));
  },
);

// GET /metrics/aggregations - Get aggregated metrics
metricsApp.openapi(
  {
    method: 'get',
    path: '/metrics/aggregations',
    summary: 'Get metric aggregations',
    description: 'Get aggregated metric data across entities',
    tags: ['Metrics'],
    security: [{ Bearer: [] }],
    request: {
      query: MetricAggregationQuerySchema,
    },
    responses: {
      200: {
        description: 'Metric aggregations',
        content: {
          'application/json': {
            schema: MetricAggregationResponseSchema,
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const query = c.req.valid('query');

    // Build where clause
    const where: any = {
      entityId: { in: query.entityIds },
      metricDefinition: {
        key: { in: query.metricKeys },
      },
      window: query.window,
    };

    if (query.fromDate || query.toDate) {
      where.timestamp = {};
      if (query.fromDate) {
        where.timestamp.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.timestamp.lte = new Date(query.toDate);
      }
    }

    // Get aggregations based on groupBy
    let groupBy: any[] = [];
    if (query.groupBy === 'entity') {
      groupBy = ['entityId'];
    } else if (query.groupBy === 'metric') {
      groupBy = ['metricDefinitionId'];
    } else if (query.groupBy === 'time') {
      groupBy = ['timestamp'];
    } else {
      groupBy = ['entityId', 'metricDefinitionId'];
    }

    const aggregations = await prisma.metricPoint.groupBy({
      by: groupBy as any,
      where,
      _count: { value: true },
      _min: { value: true },
      _max: { value: true },
      _avg: { value: true },
      _sum: { value: true },
    });

    // Transform results
    const results = aggregations.map((agg: any) => ({
      entityId: agg.entityId || undefined,
      metricDefinitionId: agg.metricDefinitionId || undefined,
      timestamp: agg.timestamp || undefined,
      window: query.window,
      value: agg._sum.value || agg._avg.value,
      count: agg._count.value,
      min: agg._min.value,
      max: agg._max.value,
      avg: agg._avg.value,
    }));

    return c.json(ApiResponse.success({ aggregations: results }));
  },
);
