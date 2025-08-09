/**
 * ROUTER TEMPLATE
 *
 * Use this template when creating new API routers.
 * Copy this file and replace the placeholders with your specific implementation.
 *
 * This template includes:
 * - Proper imports for all shared middleware
 * - Standard middleware setup
 * - Common route patterns
 * - Error handling best practices
 * - OpenAPI documentation examples
 */

import { OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { createAuthMiddleware, createAdminMiddleware } from './auth-middleware';
import {
  createValidationMiddleware,
  validateBody,
  validateQuery,
  validateParams,
  getValidatedBody,
  getValidatedQuery,
  getValidatedParams,
} from './validation-middleware';
import {
  db,
  createDatabaseMiddleware,
  getDb,
  withTransaction,
  handleDatabaseError,
} from './database';
import {
  createLoggingMiddleware,
  createErrorLoggingMiddleware,
} from './logging-middleware';
import { ApiError } from './errors';
import { ApiResponse } from './responses';

// Import your schemas
// import { YourSchema, YourQuerySchema, YourParamsSchema } from '../schemas';

// Create Hono app with OpenAPI
export const yourResourceApp = new OpenAPIHono();

// Set up shared middleware
const authMiddleware = createAuthMiddleware();
const adminMiddleware = createAdminMiddleware();
const dbMiddleware = createDatabaseMiddleware();
const loggingMiddleware = createLoggingMiddleware({
  excludePaths: ['/health'], // Exclude health checks from logs
});
const errorLoggingMiddleware = createErrorLoggingMiddleware();

// Apply global middleware to this router
yourResourceApp.use('*', loggingMiddleware);
yourResourceApp.use('*', errorLoggingMiddleware);
yourResourceApp.use('*', dbMiddleware);

/**
 * EXAMPLE ROUTE PATTERNS
 */

// Example: Public endpoint (no auth required)
yourResourceApp.get('/your-resource/public', async (c) => {
  const db = getDb(c);

  try {
    // Your logic here
    const data = await db.yourModel.findMany({
      where: { public: true },
      select: { id: true, name: true },
    });

    return c.json(ApiResponse.success(data));
  } catch (error) {
    const dbError = handleDatabaseError(error);
    throw ApiError.server(dbError.message);
  }
});

// Example: Authenticated endpoint
yourResourceApp.get('/your-resource', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = getDb(c);

  try {
    const data = await db.yourModel.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return c.json(ApiResponse.success(data));
  } catch (error) {
    const dbError = handleDatabaseError(error);
    throw ApiError.server(dbError.message);
  }
});

// Example: Admin-only endpoint
yourResourceApp.get(
  '/your-resource/admin',
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const db = getDb(c);

    try {
      const data = await db.yourModel.findMany({
        include: { user: true },
      });

      return c.json(ApiResponse.success(data));
    } catch (error) {
      const dbError = handleDatabaseError(error);
      throw ApiError.server(dbError.message);
    }
  },
);

// Example: Endpoint with validation
/* 
yourResourceApp.post(
  '/your-resource',
  authMiddleware,
  validateBody(YourSchema),
  async (c) => {
    const user = c.get('user');
    const body = getValidatedBody(c);
    const db = getDb(c);
    
    try {
      const newRecord = await db.yourModel.create({
        data: {
          ...body,
          userId: user.id,
        },
      });

      return c.json(ApiResponse.created(newRecord), 201);
    } catch (error) {
      const dbError = handleDatabaseError(error);
      
      if (dbError.type === 'UNIQUE_CONSTRAINT') {
        throw ApiError.duplicate(dbError.message);
      }
      
      throw ApiError.server(dbError.message);
    }
  }
);
*/

// Example: Endpoint with query parameters
/*
yourResourceApp.get(
  '/your-resource/search',
  authMiddleware,
  validateQuery(YourQuerySchema),
  async (c) => {
    const user = c.get('user');
    const query = getValidatedQuery(c);
    const db = getDb(c);
    
    try {
      const data = await db.yourModel.findMany({
        where: {
          userId: user.id,
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        take: query.limit || 10,
        skip: query.offset || 0,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
      });

      return c.json(ApiResponse.success(data));
    } catch (error) {
      const dbError = handleDatabaseError(error);
      throw ApiError.server(dbError.message);
    }
  }
);
*/

// Example: Endpoint with path parameters
/*
yourResourceApp.get(
  '/your-resource/:id',
  authMiddleware,
  validateParams(YourParamsSchema),
  async (c) => {
    const user = c.get('user');
    const params = getValidatedParams(c);
    const db = getDb(c);
    
    try {
      const record = await db.yourModel.findFirst({
        where: {
          id: params.id,
          userId: user.id, // Ensure user can only access their own data
        },
      });

      if (!record) {
        throw ApiError.notFound('Resource not found');
      }

      return c.json(ApiResponse.success(record));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      const dbError = handleDatabaseError(error);
      throw ApiError.server(dbError.message);
    }
  }
);
*/

// Example: Complex endpoint with transaction
/*
yourResourceApp.post(
  '/your-resource/complex',
  authMiddleware,
  validateBody(YourComplexSchema),
  async (c) => {
    const user = c.get('user');
    const body = getValidatedBody(c);
    
    try {
      const result = await withTransaction(async (tx) => {
        // Multiple database operations in transaction
        const mainRecord = await tx.yourModel.create({
          data: {
            ...body.main,
            userId: user.id,
          },
        });

        const relatedRecords = await Promise.all(
          body.related.map(item =>
            tx.relatedModel.create({
              data: {
                ...item,
                yourModelId: mainRecord.id,
              },
            })
          )
        );

        return { main: mainRecord, related: relatedRecords };
      });

      return c.json(ApiResponse.created(result), 201);
    } catch (error) {
      const dbError = handleDatabaseError(error);
      throw ApiError.server(dbError.message);
    }
  }
);
*/

/**
 * OPENAPI DOCUMENTATION EXAMPLE
 *
 * Use this pattern for OpenAPI route definitions:
 */
/*
yourResourceApp.openapi({
  method: 'get',
  path: '/your-resource',
  summary: 'List user resources',
  description: 'Retrieve all resources belonging to the authenticated user',
  tags: ['YourResource'],
  security: [{ Bearer: [] }],
  request: {
    query: YourQuerySchema.optional(),
  },
  responses: {
    200: {
      description: 'List of resources',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(YourSchema),
            meta: z.object({
              timestamp: z.string(),
              version: z.string(),
            }),
          }),
        },
      },
    },
    401: { description: 'Authentication required' },
    500: { description: 'Internal server error' },
  },
}, authMiddleware, async (c) => {
  // Route implementation
});
*/

/**
 * DEVELOPMENT CHECKLIST
 *
 * When creating a new router, ensure you:
 *
 * ✅ Import all necessary middleware
 * ✅ Set up proper authentication for protected routes
 * ✅ Use validation middleware for all inputs
 * ✅ Handle database errors appropriately
 * ✅ Return consistent response formats
 * ✅ Add proper TypeScript types
 * ✅ Include OpenAPI documentation
 * ✅ Add unit tests for route handlers
 * ✅ Consider rate limiting for expensive operations
 * ✅ Log important operations and errors
 * ✅ Follow the existing naming conventions
 * ✅ Update the main router index to mount your new router
 */
