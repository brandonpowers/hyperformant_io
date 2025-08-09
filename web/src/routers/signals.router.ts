import { OpenAPIHono } from '@hono/zod-openapi';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { 
  SignalSchema,
  CreateSignalSchema,
  CreateSignalBatchSchema,
  SignalQuerySchema,
  SignalParamsSchema,
  SignalListResponseSchema,
  SignalDetailSchema,
} from '../schemas';
import { ApiError } from '../lib/api/errors';
import { ApiResponse } from '../lib/api/responses';
import { createAuthMiddleware } from '../lib/api/auth-middleware';

const prisma = new PrismaClient();

// Create Hono app with OpenAPI
export const signalsApp = new OpenAPIHono();

// Use the shared authentication middleware
const authMiddleware = createAuthMiddleware();

/**
 * SIGNALS CRUD ROUTES
 */

// GET /signals - List signals with filtering
signalsApp.openapi({
  method: 'get',
  path: '/signals',
  summary: 'List signals',
  description: 'Retrieve signals with optional filtering by time, category, and entities',
  tags: ['Signals'],
  security: [{ Bearer: [] }],
  request: {
    query: SignalQuerySchema,
  },
  responses: {
    200: {
      description: 'List of signals',
      content: {
        'application/json': {
          schema: SignalListResponseSchema,
        },
      },
    },
  },
}, authMiddleware, async (c) => {
  const query = c.req.valid('query');
  
  // Build where clause
  const where: any = {};
  
  if (query.entityId) {
    where.impacts = {
      some: {
        entityId: query.entityId,
      },
    };
  }
  
  if (query.category) {
    where.category = query.category;
  }
  
  if (query.type) {
    where.type = query.type;
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
  
  if (query.minMagnitude !== undefined) {
    where.magnitude = {
      gte: query.minMagnitude,
    };
  }
  
  if (query.sentiment) {
    where.sentimentLabel = query.sentiment;
  }
  
  if (query.source) {
    where.source = {
      contains: query.source,
      mode: 'insensitive',
    };
  }
  
  if (query.tags && query.tags.length > 0) {
    where.tags = {
      hasSome: query.tags,
    };
  }

  // Calculate pagination
  const skip = (query.page - 1) * query.limit;
  
  // Execute queries
  const [signals, total] = await Promise.all([
    prisma.signal.findMany({
      where,
      include: {
        impacts: {
          include: {
            entity: {
              select: { id: true, name: true, type: true },
            },
          },
        },
      },
      orderBy: { [query.sortBy]: query.sortOrder },
      skip,
      take: query.limit,
    }),
    prisma.signal.count({ where }),
  ]);

  const response = {
    signals,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };

  return c.json(ApiResponse.success(response));
});

// POST /signals - Create new signal
signalsApp.openapi({
  method: 'post',
  path: '/signals',
  summary: 'Create a new signal',
  description: 'Create a new signal with entity impacts',
  tags: ['Signals'],
  security: [{ Bearer: [] }],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: CreateSignalSchema,
      },
    },
  },
  responses: {
    201: {
      description: 'Signal created successfully',
      content: {
        'application/json': {
          schema: SignalDetailSchema,
        },
      },
    },
  },
}, authMiddleware, async (c) => {
  const body = await c.req.json();
  
  // Validate required fields
  if (!body.source || !body.category || !body.type || !body.impacts?.length) {
    throw ApiError.validation('Source, category, type, and impacts are required');
  }

  // Verify all entity IDs exist
  const entityIds = body.impacts.map((impact: any) => impact.entityId);
  const entities = await prisma.entity.findMany({
    where: { id: { in: entityIds } },
    select: { id: true },
  });

  if (entities.length !== entityIds.length) {
    throw ApiError.validation('Some entity IDs are invalid');
  }

  // Create signal with impacts in a transaction
  const signal = await prisma.$transaction(async (tx) => {
    const newSignal = await tx.signal.create({
      data: {
        timestamp: new Date(body.timestamp),
        source: body.source,
        category: body.category,
        type: body.type,
        magnitude: body.magnitude,
        sentimentScore: body.sentimentScore,
        sentimentLabel: body.sentimentLabel,
        summary: body.summary,
        details: body.details,
        decayHalfLifeDays: body.decayHalfLifeDays,
        tags: body.tags || [],
      },
    });

    // Create signal impacts
    await tx.signalImpact.createMany({
      data: body.impacts.map((impact: any) => ({
        signalId: newSignal.id,
        entityId: impact.entityId,
        role: impact.role,
        weight: impact.weight,
      })),
    });

    // Return signal with impacts
    return tx.signal.findUnique({
      where: { id: newSignal.id },
      include: {
        impacts: {
          include: {
            entity: {
              select: { id: true, name: true, type: true },
            },
          },
        },
      },
    });
  });

  return c.json(ApiResponse.created(signal), 201);
});

// POST /signals/batch - Create multiple signals
signalsApp.openapi({
  method: 'post',
  path: '/signals/batch',
  summary: 'Create multiple signals',
  description: 'Batch create multiple signals with their impacts',
  tags: ['Signals'],
  security: [{ Bearer: [] }],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: CreateSignalBatchSchema,
      },
    },
  },
  responses: {
    201: {
      description: 'Signals created successfully',
      content: {
        'application/json': {
          schema: z.object({
            created: z.number(),
            signals: z.array(SignalSchema),
          }),
        },
      },
    },
  },
}, authMiddleware, async (c) => {
  const body = await c.req.json();
  
  if (!body.signals?.length) {
    throw ApiError.validation('Signals array is required');
  }

  // Validate all entity IDs exist
  const allEntityIds = new Set<string>();
  body.signals.forEach((signal: any) => {
    signal.impacts?.forEach((impact: any) => {
      allEntityIds.add(impact.entityId);
    });
  });

  const entities = await prisma.entity.findMany({
    where: { id: { in: Array.from(allEntityIds) } },
    select: { id: true },
  });

  const validEntityIds = new Set(entities.map(e => e.id));
  const invalidIds = Array.from(allEntityIds).filter(id => !validEntityIds.has(id));
  
  if (invalidIds.length > 0) {
    throw ApiError.validation(`Invalid entity IDs: ${invalidIds.join(', ')}`);
  }

  // Create all signals with impacts in a transaction
  const results = await prisma.$transaction(async (tx) => {
    const createdSignals = [];

    for (const signalData of body.signals) {
      const signal = await tx.signal.create({
        data: {
          timestamp: new Date(signalData.timestamp),
          source: signalData.source,
          category: signalData.category,
          type: signalData.type,
          magnitude: signalData.magnitude,
          sentimentScore: signalData.sentimentScore,
          sentimentLabel: signalData.sentimentLabel,
          summary: signalData.summary,
          details: signalData.details,
          decayHalfLifeDays: signalData.decayHalfLifeDays,
          tags: signalData.tags || [],
        },
        include: {
          impacts: {
            include: {
              entity: {
                select: { id: true, name: true, type: true },
              },
            },
          },
        },
      });

      // Create signal impacts
      if (signalData.impacts?.length) {
        await tx.signalImpact.createMany({
          data: signalData.impacts.map((impact: any) => ({
            signalId: signal.id,
            entityId: impact.entityId,
            role: impact.role,
            weight: impact.weight,
          })),
        });
      }

      createdSignals.push(signal);
    }

    return createdSignals;
  });

  const response = {
    created: results.length,
    signals: results,
  };

  return c.json(ApiResponse.created(response), 201);
});

// GET /signals/:id - Get specific signal
signalsApp.openapi({
  method: 'get',
  path: '/signals/{id}',
  summary: 'Get signal by ID',
  description: 'Retrieve a specific signal with all impacts',
  tags: ['Signals'],
  security: [{ Bearer: [] }],
  request: {
    params: SignalParamsSchema,
  },
  responses: {
    200: {
      description: 'Signal details',
      content: {
        'application/json': {
          schema: SignalDetailSchema,
        },
      },
    },
  },
}, authMiddleware, async (c) => {
  const { id } = c.req.valid('param');
  
  const signal = await prisma.signal.findUnique({
    where: { id },
    include: {
      impacts: {
        include: {
          entity: {
            select: { id: true, name: true, type: true },
          },
        },
      },
      connectionEvents: {
        include: {
          connection: {
            include: {
              source: {
                select: { id: true, name: true, type: true },
              },
              target: {
                select: { id: true, name: true, type: true },
              },
            },
          },
        },
      },
    },
  });

  if (!signal) {
    throw ApiError.notFound('Signal not found');
  }

  return c.json(ApiResponse.success(signal));
});

// DELETE /signals/:id - Delete signal
signalsApp.openapi({
  method: 'delete',
  path: '/signals/{id}',
  summary: 'Delete signal',
  description: 'Delete a signal and all related impacts',
  tags: ['Signals'],
  security: [{ Bearer: [] }],
  request: {
    params: SignalParamsSchema,
  },
  responses: {
    204: {
      description: 'Signal deleted successfully',
    },
  },
}, authMiddleware, async (c) => {
  const { id } = c.req.valid('param');
  
  // Check if signal exists
  const signal = await prisma.signal.findUnique({
    where: { id },
  });

  if (!signal) {
    throw ApiError.notFound('Signal not found');
  }

  // Delete signal (cascade will handle related records)
  await prisma.signal.delete({
    where: { id },
  });

  return c.body(null, 204);
});

// GET /signals/stats - Get signal statistics
signalsApp.openapi({
  method: 'get',
  path: '/signals/stats',
  summary: 'Get signal statistics',
  description: 'Get aggregated statistics about signals',
  tags: ['Signals'],
  security: [{ Bearer: [] }],
  request: {
    query: z.object({
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      entityId: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Signal statistics',
    },
  },
}, authMiddleware, async (c) => {
  const query = c.req.valid('query');
  
  // Build where clause
  const where: any = {};
  
  if (query.fromDate || query.toDate) {
    where.timestamp = {};
    if (query.fromDate) {
      where.timestamp.gte = new Date(query.fromDate);
    }
    if (query.toDate) {
      where.timestamp.lte = new Date(query.toDate);
    }
  }
  
  if (query.entityId) {
    where.impacts = {
      some: {
        entityId: query.entityId,
      },
    };
  }

  // Get statistics
  const [
    totalCount,
    categoryCounts,
    typeCounts,
    avgMagnitude,
    sentimentCounts,
  ] = await Promise.all([
    prisma.signal.count({ where }),
    prisma.signal.groupBy({
      by: ['category'],
      where,
      _count: { category: true },
    }),
    prisma.signal.groupBy({
      by: ['type'],
      where,
      _count: { type: true },
      orderBy: { _count: { type: 'desc' } },
      take: 10,
    }),
    prisma.signal.aggregate({
      where,
      _avg: { magnitude: true },
    }),
    prisma.signal.groupBy({
      by: ['sentimentLabel'],
      where: { ...where, sentimentLabel: { not: null } },
      _count: { sentimentLabel: true },
    }),
  ]);

  const stats = {
    total: totalCount,
    avgMagnitude: avgMagnitude._avg.magnitude,
    byCategory: categoryCounts.map(c => ({ 
      category: c.category, 
      count: c._count.category 
    })),
    byType: typeCounts.map(t => ({ 
      type: t.type, 
      count: t._count.type 
    })),
    bySentiment: sentimentCounts.map(s => ({ 
      sentiment: s.sentimentLabel, 
      count: s._count.sentimentLabel 
    })),
  };

  return c.json(ApiResponse.success(stats));
});