import { OpenAPIHono } from '@hono/zod-openapi';
import { PrismaClient } from '@prisma/client';
import { z } from '@hono/zod-openapi';
import {
  ConnectionSchema,
  CreateConnectionSchema,
  UpdateConnectionSchema,
  ConnectionQuerySchema,
  ConnectionParamsSchema,
  ConnectionListResponseSchema,
  ConnectionDetailSchema,
  NetworkGraphSchema,
} from '../schemas';
import { ApiError } from '../lib/api/errors';
import { ApiResponse } from '../lib/api/responses';
import { createSafeAuthMiddleware } from '../lib/api/context-safety';

const prisma = new PrismaClient();

// Create Hono app with OpenAPI
export const connectionsApp = new OpenAPIHono();

// Use the shared authentication middleware
const authMiddleware = createSafeAuthMiddleware();

/**
 * CONNECTIONS CRUD ROUTES
 */

// GET /connections - List connections with filtering
connectionsApp.openapi(
  {
    method: 'get',
    path: '/connections',
    summary: 'List connections',
    description: 'Retrieve entity connections with optional filtering',
    tags: ['Connections'],
    security: [{ Bearer: [] }],
    request: {
      query: ConnectionQuerySchema,
    },
    responses: {
      200: {
        description: 'List of connections',
        content: {
          'application/json': {
            schema: ConnectionListResponseSchema,
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

    if (query.entityId) {
      where.OR = [
        { sourceEntityId: query.entityId },
        { targetEntityId: query.entityId },
      ];
    }

    if (query.sourceEntityId) {
      where.sourceEntityId = query.sourceEntityId;
    }

    if (query.targetEntityId) {
      where.targetEntityId = query.targetEntityId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.minStrength !== undefined) {
      where.strength = {
        gte: query.minStrength,
      };
    }

    if (query.active) {
      where.until = null;
    }

    // Calculate pagination
    const skip = (query.page - 1) * query.limit;

    // Execute queries
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
        orderBy: { [query.sortBy]: query.sortOrder },
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

// POST /connections - Create new connection
connectionsApp.openapi(
  {
    method: 'post',
    path: '/connections',
    summary: 'Create a new connection',
    description: 'Create a new connection between entities',
    tags: ['Connections'],
    security: [{ Bearer: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: CreateConnectionSchema,
        },
      },
    },
    responses: {
      201: {
        description: 'Connection created successfully',
        content: {
          'application/json': {
            schema: ConnectionSchema,
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const body = await c.req.json();

    // Validate entity IDs exist
    const [sourceEntity, targetEntity] = await Promise.all([
      prisma.entity.findUnique({ where: { id: body.sourceEntityId } }),
      prisma.entity.findUnique({ where: { id: body.targetEntityId } }),
    ]);

    if (!sourceEntity) {
      throw ApiError.validation('Source entity not found');
    }
    if (!targetEntity) {
      throw ApiError.validation('Target entity not found');
    }
    if (body.sourceEntityId === body.targetEntityId) {
      throw ApiError.validation(
        'Source and target entities cannot be the same',
      );
    }

    // Check for existing connection
    const existing = await prisma.connection.findFirst({
      where: {
        sourceEntityId: body.sourceEntityId,
        targetEntityId: body.targetEntityId,
        type: body.type,
        since: new Date(body.since),
      },
    });

    if (existing) {
      throw ApiError.conflict('Connection already exists');
    }

    // Create connection
    const connection = await prisma.connection.create({
      data: {
        ...body,
        since: new Date(body.since),
        until: body.until ? new Date(body.until) : null,
      },
      include: {
        source: {
          select: { id: true, name: true, type: true },
        },
        target: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    return c.json(ApiResponse.created(connection), 201);
  },
);

// GET /connections/:id - Get specific connection
connectionsApp.openapi(
  {
    method: 'get',
    path: '/connections/{id}',
    summary: 'Get connection by ID',
    description: 'Retrieve a specific connection with details',
    tags: ['Connections'],
    security: [{ Bearer: [] }],
    request: {
      params: ConnectionParamsSchema,
    },
    responses: {
      200: {
        description: 'Connection details',
        content: {
          'application/json': {
            schema: ConnectionDetailSchema,
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const { id } = c.req.valid('param');

    const connection = await prisma.connection.findUnique({
      where: { id },
      include: {
        source: {
          select: { id: true, name: true, type: true },
        },
        target: {
          select: { id: true, name: true, type: true },
        },
        events: {
          include: {
            signal: {
              select: {
                id: true,
                timestamp: true,
                type: true,
                summary: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!connection) {
      throw ApiError.notFound('Connection not found');
    }

    return c.json(ApiResponse.success(connection));
  },
);

// PATCH /connections/:id - Update connection
connectionsApp.openapi(
  {
    method: 'patch',
    path: '/connections/{id}',
    summary: 'Update connection',
    description: 'Update an existing connection',
    tags: ['Connections'],
    security: [{ Bearer: [] }],
    request: {
      params: ConnectionParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: UpdateConnectionSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Connection updated successfully',
        content: {
          'application/json': {
            schema: ConnectionSchema,
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const { id } = c.req.valid('param');
    const body = await c.req.json();

    // Check if connection exists
    const existingConnection = await prisma.connection.findUnique({
      where: { id },
    });

    if (!existingConnection) {
      throw ApiError.notFound('Connection not found');
    }

    // Update connection
    const connection = await prisma.connection.update({
      where: { id },
      data: {
        ...body,
        until: body.until ? new Date(body.until) : null,
      },
      include: {
        source: {
          select: { id: true, name: true, type: true },
        },
        target: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    return c.json(ApiResponse.success(connection));
  },
);

// DELETE /connections/:id - Delete connection
connectionsApp.openapi(
  {
    method: 'delete',
    path: '/connections/{id}',
    summary: 'Delete connection',
    description: 'Delete a connection',
    tags: ['Connections'],
    security: [{ Bearer: [] }],
    request: {
      params: ConnectionParamsSchema,
    },
    responses: {
      204: {
        description: 'Connection deleted successfully',
      },
    },
  },
  authMiddleware,
  async (c) => {
    const { id } = c.req.valid('param');

    // Check if connection exists
    const connection = await prisma.connection.findUnique({
      where: { id },
    });

    if (!connection) {
      throw ApiError.notFound('Connection not found');
    }

    // Delete connection
    await prisma.connection.delete({
      where: { id },
    });

    return c.body(null, 204);
  },
);

// GET /connections/network - Get network graph data
connectionsApp.openapi(
  {
    method: 'get',
    path: '/connections/network',
    summary: 'Get network graph',
    description: 'Get network graph data for visualization',
    tags: ['Connections'],
    security: [{ Bearer: [] }],
    request: {
      query: z.object({
        entityIds: z.array(z.string()).optional(),
        maxDepth: z.number().int().min(1).max(3).default(2),
        includeInactive: z.boolean().default(false),
        connectionTypes: z.array(z.string()).optional(),
      }),
    },
    responses: {
      200: {
        description: 'Network graph data',
        content: {
          'application/json': {
            schema: NetworkGraphSchema,
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const query = c.req.valid('query');

    // Build where clause for connections
    const where: any = {};

    if (query.entityIds?.length) {
      where.OR = [
        { sourceEntityId: { in: query.entityIds } },
        { targetEntityId: { in: query.entityIds } },
      ];
    }

    if (!query.includeInactive) {
      where.until = null;
    }

    if (query.connectionTypes?.length) {
      where.type = { in: query.connectionTypes };
    }

    // Get connections and related entities
    const connections = await prisma.connection.findMany({
      where,
      include: {
        source: {
          select: { id: true, name: true, type: true },
        },
        target: {
          select: { id: true, name: true, type: true },
        },
      },
      take: 1000, // Limit to prevent huge graphs
    });

    // Build nodes and edges for visualization
    const nodeMap = new Map();
    const edges = [];

    connections.forEach((conn) => {
      // Add nodes
      if (!nodeMap.has(conn.source.id)) {
        nodeMap.set(conn.source.id, {
          id: conn.source.id,
          name: conn.source.name,
          type: conn.source.type,
          group: conn.source.type,
        });
      }

      if (!nodeMap.has(conn.target.id)) {
        nodeMap.set(conn.target.id, {
          id: conn.target.id,
          name: conn.target.name,
          type: conn.target.type,
          group: conn.target.type,
        });
      }

      // Add edge
      edges.push({
        id: conn.id,
        source: conn.sourceEntityId,
        target: conn.targetEntityId,
        type: conn.type,
        strength: conn.strength,
        sentiment: conn.sentimentScore,
      });
    });

    const networkGraph = {
      nodes: Array.from(nodeMap.values()),
      edges,
    };

    return c.json(ApiResponse.success(networkGraph));
  },
);
