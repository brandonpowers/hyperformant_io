import { OpenAPIHono } from '@hono/zod-openapi';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  EntitySchema,
  CreateEntitySchema,
  UpdateEntitySchema,
  EntityQuerySchema,
  EntityParamsSchema,
  EntityListResponseSchema,
  EntityDetailSchema,
} from '../schemas';
import { ApiError } from '../lib/api/errors';
import { ApiResponse } from '../lib/api/responses';
import { createSafeAuthMiddleware } from '../lib/api/context-safety';

const prisma = new PrismaClient();

// Create Hono app with OpenAPI
export const entitiesApp = new OpenAPIHono();

// Use the safe authentication middleware
const authMiddleware = createSafeAuthMiddleware();

/**
 * ENTITIES CRUD ROUTES
 */

// GET /entities - List entities with search/filter
entitiesApp.openapi(
  {
    method: 'get',
    path: '/entities',
    summary: 'List entities',
    description: 'Retrieve entities with optional filtering and search',
    tags: ['Entities'],
    security: [{ Bearer: [] }],
    request: {
      query: EntityQuerySchema,
    },
    responses: {
      200: {
        description: 'List of entities',
        content: {
          'application/json': {
            schema: EntityListResponseSchema,
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

    if (query.type) {
      where.type = query.type;
    }

    if (query.industry) {
      where.industryId = query.industry;
    }

    if (query.marketSegment) {
      where.marketSegmentId = query.marketSegment;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { domain: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.isUserCompany !== undefined) {
      where.isUserCompany = query.isUserCompany;
    }

    // Calculate pagination
    const skip = (query.page - 1) * query.limit;

    // Execute queries
    const [entities, total] = await Promise.all([
      prisma.entity.findMany({
        where,
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
        orderBy: { [query.sortBy]: query.sortOrder },
        skip,
        take: query.limit,
      }),
      prisma.entity.count({ where }),
    ]);

    const response = {
      entities,
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

// POST /entities - Create new entity
entitiesApp.openapi(
  {
    method: 'post',
    path: '/entities',
    summary: 'Create a new entity',
    description: 'Create a new entity in the competitive intelligence system',
    tags: ['Entities'],
    security: [{ Bearer: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: CreateEntitySchema,
        },
      },
    },
    responses: {
      201: {
        description: 'Entity created successfully',
        content: {
          'application/json': {
            schema: EntitySchema,
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const body = await c.req.json();

    // Validate required fields
    if (!body.name || !body.type) {
      throw ApiError.validation('Name and type are required');
    }

    // Check for duplicate domain if provided
    if (body.domain) {
      const existing = await prisma.entity.findFirst({
        where: { domain: body.domain },
      });
      if (existing) {
        throw ApiError.conflict('Entity with this domain already exists');
      }
    }

    // Create entity
    const entity = await prisma.entity.create({
      data: {
        ...body,
        foundedAt: body.foundedAt ? new Date(body.foundedAt) : null,
      },
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

    return c.json(ApiResponse.created(entity), 201);
  },
);

// GET /entities/:id - Get specific entity
entitiesApp.openapi(
  {
    method: 'get',
    path: '/entities/{id}',
    summary: 'Get entity by ID',
    description: 'Retrieve a specific entity with detailed information',
    tags: ['Entities'],
    security: [{ Bearer: [] }],
    request: {
      params: EntityParamsSchema,
    },
    responses: {
      200: {
        description: 'Entity details',
        content: {
          'application/json': {
            schema: EntityDetailSchema,
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const { id } = c.req.valid('param');

    const entity = await prisma.entity.findUnique({
      where: { id },
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

    if (!entity) {
      throw ApiError.notFound('Entity not found');
    }

    return c.json(ApiResponse.success(entity));
  },
);

// PATCH /entities/:id - Update entity
entitiesApp.openapi(
  {
    method: 'patch',
    path: '/entities/{id}',
    summary: 'Update entity',
    description: 'Update an existing entity',
    tags: ['Entities'],
    security: [{ Bearer: [] }],
    request: {
      params: EntityParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: UpdateEntitySchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Entity updated successfully',
        content: {
          'application/json': {
            schema: EntitySchema,
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const { id } = c.req.valid('param');
    const body = await c.req.json();

    // Check if entity exists
    const existingEntity = await prisma.entity.findUnique({
      where: { id },
    });

    if (!existingEntity) {
      throw ApiError.notFound('Entity not found');
    }

    // Check for duplicate domain if changing domain
    if (body.domain && body.domain !== existingEntity.domain) {
      const existing = await prisma.entity.findFirst({
        where: {
          domain: body.domain,
          id: { not: id },
        },
      });
      if (existing) {
        throw ApiError.conflict('Entity with this domain already exists');
      }
    }

    // Update entity
    const entity = await prisma.entity.update({
      where: { id },
      data: {
        ...body,
        foundedAt: body.foundedAt ? new Date(body.foundedAt) : undefined,
      },
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

    return c.json(ApiResponse.success(entity));
  },
);

// DELETE /entities/:id - Delete entity
entitiesApp.openapi(
  {
    method: 'delete',
    path: '/entities/{id}',
    summary: 'Delete entity',
    description: 'Delete an entity and all related data',
    tags: ['Entities'],
    security: [{ Bearer: [] }],
    request: {
      params: EntityParamsSchema,
    },
    responses: {
      204: {
        description: 'Entity deleted successfully',
      },
    },
  },
  authMiddleware,
  async (c) => {
    const { id } = c.req.valid('param');

    // Check if entity exists
    const entity = await prisma.entity.findUnique({
      where: { id },
    });

    if (!entity) {
      throw ApiError.notFound('Entity not found');
    }

    // Delete entity (cascade will handle related records)
    await prisma.entity.delete({
      where: { id },
    });

    return c.body(null, 204);
  },
);

// GET /entities/:id/signals - Get entity signals
entitiesApp.openapi(
  {
    method: 'get',
    path: '/entities/{id}/signals',
    summary: 'Get entity signals',
    description: 'Retrieve signals that impact this entity',
    tags: ['Entities'],
    security: [{ Bearer: [] }],
    request: {
      params: EntityParamsSchema,
      query: z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        category: z.string().optional(),
        type: z.string().optional(),
        fromDate: z.string().optional(),
      }),
    },
    responses: {
      200: {
        description: 'Entity signals',
      },
    },
  },
  authMiddleware,
  async (c) => {
    const { id } = c.req.valid('param');
    const query = c.req.valid('query');

    // Check if entity exists
    const entity = await prisma.entity.findUnique({
      where: { id },
    });

    if (!entity) {
      throw ApiError.notFound('Entity not found');
    }

    // Build where clause for signals
    const where: any = {
      impacts: {
        some: {
          entityId: id,
        },
      },
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.fromDate) {
      where.timestamp = {
        gte: new Date(query.fromDate),
      };
    }

    const skip = (query.page - 1) * query.limit;

    // Get signals with their impacts on this entity
    const [signals, total] = await Promise.all([
      prisma.signal.findMany({
        where,
        include: {
          impacts: {
            where: { entityId: id },
            include: {
              entity: {
                select: { id: true, name: true, type: true },
              },
            },
          },
        },
        orderBy: { timestamp: 'desc' },
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
  },
);

// GET /entities/:id/connections - Get entity connections
entitiesApp.openapi(
  {
    method: 'get',
    path: '/entities/{id}/connections',
    summary: 'Get entity connections',
    description: 'Retrieve connections (relationships) for this entity',
    tags: ['Entities'],
    security: [{ Bearer: [] }],
    request: {
      params: EntityParamsSchema,
      query: z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        type: z.string().optional(),
        active: z.boolean().optional(),
      }),
    },
    responses: {
      200: {
        description: 'Entity connections',
      },
    },
  },
  authMiddleware,
  async (c) => {
    const { id } = c.req.valid('param');
    const query = c.req.valid('query');

    // Check if entity exists
    const entity = await prisma.entity.findUnique({
      where: { id },
    });

    if (!entity) {
      throw ApiError.notFound('Entity not found');
    }

    // Build where clause for connections
    const where: any = {
      OR: [{ sourceEntityId: id }, { targetEntityId: id }],
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.active) {
      where.until = null;
    }

    const skip = (query.page - 1) * query.limit;

    // Get connections
    const [connections, total] = await Promise.all([
      prisma.connection.findMany({
        where,
        include: {
          source: {
            select: { id: true, name: true, type: true },
          },
          target: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: { since: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.connection.count({ where }),
    ]);

    const response = {
      connections,
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
