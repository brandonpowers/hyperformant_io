import { z } from 'zod';
import { ApiError } from './errors';

/**
 * Request validation middleware for Hono routes
 * Validates request body, query parameters, and path parameters using Zod schemas
 */

interface ValidationSchemas {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}

/**
 * Create validation middleware for request validation
 */
export const createValidationMiddleware = (schemas: ValidationSchemas) => {
  return async (c: any, next: any) => {
    try {
      // Validate request body if schema provided
      if (schemas.body) {
        let body;
        try {
          const contentType = c.req.header('content-type') || '';
          if (contentType.includes('application/json')) {
            body = await c.req.json();
          } else if (
            contentType.includes('application/x-www-form-urlencoded')
          ) {
            body = await c.req.parseBody();
          } else {
            body = {};
          }
        } catch (error) {
          throw ApiError.validation('Invalid request body format');
        }

        const bodyResult = schemas.body.safeParse(body);
        if (!bodyResult.success) {
          throw ApiError.validation('Request body validation failed', {
            errors: bodyResult.error.errors,
            received: body,
          });
        }

        // Set validated body in context for use in route handlers
        c.set('validatedBody', bodyResult.data);
      }

      // Validate query parameters if schema provided
      if (schemas.query) {
        const query = c.req.query();
        const queryResult = schemas.query.safeParse(query);
        if (!queryResult.success) {
          throw ApiError.validation('Query parameters validation failed', {
            errors: queryResult.error.errors,
            received: query,
          });
        }

        // Set validated query in context
        c.set('validatedQuery', queryResult.data);
      }

      // Validate path parameters if schema provided
      if (schemas.params) {
        const params = c.req.param();
        const paramsResult = schemas.params.safeParse(params);
        if (!paramsResult.success) {
          throw ApiError.validation('Path parameters validation failed', {
            errors: paramsResult.error.errors,
            received: params,
          });
        }

        // Set validated params in context
        c.set('validatedParams', paramsResult.data);
      }

      await next();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle unexpected validation errors
      console.error('Validation middleware error:', error);
      throw ApiError.validation('Request validation failed');
    }
  };
};

/**
 * Convenience function for body-only validation
 */
export const validateBody = (schema: z.ZodSchema) => {
  return createValidationMiddleware({ body: schema });
};

/**
 * Convenience function for query-only validation
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return createValidationMiddleware({ query: schema });
};

/**
 * Convenience function for params-only validation
 */
export const validateParams = (schema: z.ZodSchema) => {
  return createValidationMiddleware({ params: schema });
};

/**
 * Helper functions to get validated data from context
 * Use these in your route handlers instead of parsing raw request data
 */
export const getValidatedBody = <T = any>(c: any): T => {
  return c.get('validatedBody');
};

export const getValidatedQuery = <T = any>(c: any): T => {
  return c.get('validatedQuery');
};

export const getValidatedParams = <T = any>(c: any): T => {
  return c.get('validatedParams');
};
