import { z } from 'zod';

/**
 * Common schemas used across all API endpoints
 * Single source of truth for shared types
 */

// Common field types
export const IdSchema = z.string().uuid('Invalid ID format').openapi({
  example: 'uuid-v4-string',
  description: 'Unique identifier',
});

export const EmailSchema = z.string().email('Invalid email format').openapi({
  example: 'user@example.com',
  description: 'Valid email address',
});

export const UrlSchema = z.string().url('Invalid URL format').openapi({
  example: 'https://example.com',
  description: 'Valid HTTP/HTTPS URL',
});

export const DateTimeSchema = z
  .string()
  .datetime('Invalid date format')
  .openapi({
    example: '2024-01-01T00:00:00Z',
    description: 'ISO 8601 datetime string',
  });

// Pagination schemas
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({
    description: 'Page number (1-based)',
    example: 1,
  }),
  limit: z.coerce.number().int().min(1).max(100).default(20).openapi({
    description: 'Items per page (max 100)',
    example: 20,
  }),
  search: z.string().optional().openapi({
    description: 'Search query string',
    example: 'company name',
  }),
});

export const PaginationResponseSchema = z
  .object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    pages: z.number().int().min(0),
  })
  .openapi('Pagination');

// Standard API response wrapper
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: z
      .object({
        timestamp: DateTimeSchema,
        requestId: z.string().optional(),
        version: z.string().default('1.0.0'),
      })
      .optional(),
  });

// Standard error response
export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
    }),
  })
  .openapi('ErrorResponse');

// Async operation response (for 202 Accepted)
export const AsyncResponseSchema = z
  .object({
    data: z.object({
      id: IdSchema,
      status: z.enum(['pending', 'processing', 'completed', 'failed']),
      estimatedCompletion: DateTimeSchema.optional(),
      progress: z.number().min(0).max(100).optional(),
      result: z.any().optional(),
    }),
  })
  .openapi('AsyncResponse');

// Common enums
export const SortOrderSchema = z.enum(['asc', 'desc']).default('desc');
export const StatusSchema = z.enum([
  'active',
  'inactive',
  'pending',
  'archived',
]);

// Rate limit information
export const RateLimitSchema = z
  .object({
    limit: z.number(),
    remaining: z.number(),
    resetTime: z.number(),
    retryAfter: z.number().optional(),
  })
  .openapi('RateLimit');
