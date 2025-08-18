import { OpenAPIHono } from '@hono/zod-openapi';
import { PrismaClient } from '@prisma/client';
import { z } from '@hono/zod-openapi';
import {
  IndexDefinitionSchema,
  CreateIndexDefinitionSchema,
  IndexValueSchema,
  CreateIndexValueSchema,
  AnalyzeRequestSchema,
  AnalysisResponseSchema,
} from '../schemas';
import { ApiError } from '../lib/api/errors';
import { ApiResponse } from '../lib/api/responses';
import { createSafeAuthMiddleware } from '../lib/api/context-safety';

const prisma = new PrismaClient();

// Create Hono app with OpenAPI
export const intelligenceApp = new OpenAPIHono();

// Use the shared authentication middleware
const authMiddleware = createSafeAuthMiddleware();

/**
 * INDEX DEFINITIONS ROUTES
 */

// GET /intelligence/indices - List index definitions
intelligenceApp.openapi(
  {
    method: 'get',
    path: '/intelligence/indices',
    summary: 'List composite indices',
    description: 'Retrieve all composite index definitions',
    tags: ['Intelligence'],
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: 'List of index definitions',
        content: {
          'application/json': {
            schema: z.array(IndexDefinitionSchema),
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const indices = await prisma.indexDefinition.findMany({
      orderBy: { name: 'asc' },
    });

    return c.json(ApiResponse.success(indices));
  },
);

// POST /intelligence/indices - Create index definition
intelligenceApp.openapi(
  {
    method: 'post',
    path: '/intelligence/indices',
    summary: 'Create index definition',
    description: 'Create a new composite index definition',
    tags: ['Intelligence'],
    security: [{ Bearer: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: CreateIndexDefinitionSchema,
        },
      },
    },
    responses: {
      201: {
        description: 'Index definition created',
        content: {
          'application/json': {
            schema: IndexDefinitionSchema,
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const body = await c.req.json();

    // Check if key already exists
    const existing = await prisma.indexDefinition.findUnique({
      where: { key: body.key },
    });

    if (existing) {
      throw ApiError.conflict('Index definition with this key already exists');
    }

    // Create index definition
    const definition = await prisma.indexDefinition.create({
      data: body,
    });

    return c.json(ApiResponse.created(definition), 201);
  },
);

// GET /intelligence/indices/:entityId - Get entity index values
intelligenceApp.openapi(
  {
    method: 'get',
    path: '/intelligence/indices/{entityId}',
    summary: 'Get entity index values',
    description: 'Retrieve all composite index values for an entity',
    tags: ['Intelligence'],
    security: [{ Bearer: [] }],
    request: {
      params: z.object({
        entityId: z.string(),
      }),
      query: z.object({
        asOf: z.string().optional(),
        indexKeys: z.array(z.string()).optional(),
      }),
    },
    responses: {
      200: {
        description: 'Entity index values',
      },
    },
  },
  authMiddleware,
  async (c) => {
    const { entityId } = c.req.valid('param');
    const query = c.req.valid('query');

    // Validate entity exists
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw ApiError.notFound('Entity not found');
    }

    // Build where clause
    const where: any = { entityId };

    if (query.asOf) {
      where.asOf = { lte: new Date(query.asOf) };
    }

    if (query.indexKeys?.length) {
      where.indexDefinition = {
        key: { in: query.indexKeys },
      };
    }

    // Get latest index values
    const indexValues = await prisma.indexValue.findMany({
      where,
      include: {
        indexDefinition: true,
      },
      orderBy: [{ indexDefinitionId: 'asc' }, { asOf: 'desc' }],
    });

    // Group by index definition and get most recent value
    const latestValues = new Map();
    indexValues.forEach((value) => {
      const key = value.indexDefinition.key;
      if (!latestValues.has(key) || value.asOf > latestValues.get(key).asOf) {
        latestValues.set(key, value);
      }
    });

    return c.json(ApiResponse.success(Array.from(latestValues.values())));
  },
);

// POST /intelligence/indices/:entityId - Create index value
intelligenceApp.openapi(
  {
    method: 'post',
    path: '/intelligence/indices/{entityId}',
    summary: 'Create index value',
    description: 'Record a new composite index value for an entity',
    tags: ['Intelligence'],
    security: [{ Bearer: [] }],
    request: {
      params: z.object({
        entityId: z.string(),
      }),
      body: {
        content: {
          'application/json': {
            schema: CreateIndexValueSchema.omit({ entityId: true }),
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Index value created',
        content: {
          'application/json': {
            schema: IndexValueSchema,
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const { entityId } = c.req.valid('param');
    const body = await c.req.json();

    // Validate entity and index definition exist
    const [entity, indexDef] = await Promise.all([
      prisma.entity.findUnique({ where: { id: entityId } }),
      prisma.indexDefinition.findUnique({
        where: { id: body.indexDefinitionId },
      }),
    ]);

    if (!entity) {
      throw ApiError.validation('Entity not found');
    }
    if (!indexDef) {
      throw ApiError.validation('Index definition not found');
    }

    // Create index value
    const indexValue = await prisma.indexValue.create({
      data: {
        ...body,
        entityId,
        asOf: new Date(body.asOf),
      },
      include: {
        indexDefinition: true,
      },
    });

    return c.json(ApiResponse.created(indexValue), 201);
  },
);

/**
 * COMPETITIVE ANALYSIS ROUTES
 */

// POST /intelligence/analyze - Run competitive analysis
intelligenceApp.openapi(
  {
    method: 'post',
    path: '/intelligence/analyze',
    summary: 'Analyze entities',
    description: 'Run competitive intelligence analysis on entities',
    tags: ['Intelligence'],
    security: [{ Bearer: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: AnalyzeRequestSchema,
        },
      },
    },
    responses: {
      200: {
        description: 'Analysis results',
        content: {
          'application/json': {
            schema: AnalysisResponseSchema,
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const body = await c.req.json();

    // Validate entities exist
    const entities = await prisma.entity.findMany({
      where: { id: { in: body.entityIds } },
      include: {
        industry: true,
        marketSegment: true,
        _count: {
          select: {
            metrics: true,
            impacts: true,
            outgoing: true,
            incoming: true,
          },
        },
      },
    });

    if (entities.length !== body.entityIds.length) {
      throw ApiError.validation('Some entity IDs are invalid');
    }

    // Build time range for analysis
    const timeRange = body.timeframe || {
      from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      to: new Date(),
    };

    // Get recent signals for analysis context
    const signals = body.includeSignals
      ? await prisma.signal.findMany({
          where: {
            timestamp: {
              gte: new Date(timeRange.from),
              lte: new Date(timeRange.to),
            },
            impacts: {
              some: {
                entityId: { in: body.entityIds },
              },
            },
          },
          include: {
            impacts: {
              where: { entityId: { in: body.entityIds } },
              include: {
                entity: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 100,
        })
      : [];

    // Get connections if requested
    const connections = body.includeConnections
      ? await prisma.connection.findMany({
          where: {
            OR: [
              { sourceEntityId: { in: body.entityIds } },
              { targetEntityId: { in: body.entityIds } },
            ],
          },
          include: {
            source: { select: { id: true, name: true, type: true } },
            target: { select: { id: true, name: true, type: true } },
          },
        })
      : [];

    // Get recent metrics if requested
    const metrics = body.includeMetrics
      ? await prisma.metricPoint.findMany({
          where: {
            entityId: { in: body.entityIds },
            timestamp: {
              gte: new Date(timeRange.from),
              lte: new Date(timeRange.to),
            },
          },
          include: {
            metricDefinition: true,
          },
          orderBy: { timestamp: 'desc' },
          take: 500,
        })
      : [];

    // Simple analysis logic (placeholder for more sophisticated AI analysis)
    const analysisResults = entities.map((entity) => {
      const entitySignals = signals.filter((s) =>
        s.impacts.some((i) => i.entityId === entity.id),
      );
      const entityConnections = connections.filter(
        (c) => c.sourceEntityId === entity.id || c.targetEntityId === entity.id,
      );
      const entityMetrics = metrics.filter((m) => m.entityId === entity.id);

      // Calculate basic scores
      const activityScore = Math.min(entitySignals.length / 10, 1);
      const connectivityScore = Math.min(entityConnections.length / 20, 1);
      const growthScore = entityMetrics.length > 0 ? Math.random() : 0; // Placeholder

      // Generate insights based on signals
      const insights = [];
      const risks = [];
      const opportunities = [];

      if (entitySignals.length > 5) {
        insights.push('High signal activity detected');
      }
      if (entityConnections.length > 10) {
        insights.push('Well-connected in the ecosystem');
      }

      // Risk assessment
      const negativeSignals = entitySignals.filter(
        (s) => s.sentimentLabel === 'NEGATIVE',
      );
      if (negativeSignals.length > 2) {
        risks.push('Recent negative sentiment signals');
      }

      // Opportunity identification
      const competitorConnections = entityConnections.filter(
        (c) => c.type === 'COMPETITOR',
      );
      if (competitorConnections.length < 3) {
        opportunities.push('Low competitive pressure');
      }

      return {
        id: entity.id,
        name: entity.name,
        scores: {
          activity: Math.round(activityScore * 100) / 100,
          connectivity: Math.round(connectivityScore * 100) / 100,
          growth: Math.round(growthScore * 100) / 100,
          overall:
            Math.round(
              (activityScore + connectivityScore + growthScore) * 33.33,
            ) / 100,
        },
        insights,
        risks,
        opportunities,
      };
    });

    // Market context (simplified)
    const marketContext = {
      totalSignals: signals.length,
      avgConnections: connections.length / entities.length,
      industryTrends: 'Placeholder for industry analysis',
    };

    // Recommendations (simplified)
    const recommendations = [
      'Monitor competitor activity closely',
      'Consider strategic partnerships',
      'Invest in digital presence',
    ];

    const analysis = {
      entities: analysisResults,
      marketContext,
      recommendations,
      generatedAt: new Date().toISOString(),
    };

    return c.json(ApiResponse.success(analysis));
  },
);
