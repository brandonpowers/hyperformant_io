import { HTTPException } from 'hono/http-exception';

/**
 * Standard API error codes
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

/**
 * Custom API Error class
 */
export class ApiError extends HTTPException {
  public readonly code: string;
  public readonly details?: any;

  constructor(status: number, code: string, message: string, details?: any) {
    super(status, { message });
    this.code = code;
    this.details = details;
  }

  static validation(message: string, details?: any) {
    return new ApiError(400, ErrorCodes.VALIDATION_ERROR, message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, ErrorCodes.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Access denied') {
    return new ApiError(403, ErrorCodes.FORBIDDEN, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, ErrorCodes.NOT_FOUND, message);
  }

  static duplicate(message = 'Resource already exists') {
    return new ApiError(400, ErrorCodes.DUPLICATE_ERROR, message);
  }

  static server(message = 'Internal server error') {
    return new ApiError(500, ErrorCodes.SERVER_ERROR, message);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = async (err: Error, c: any) => {
  console.error('API Error:', err);

  // Handle our custom ApiError
  if (err instanceof ApiError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      err.status,
    );
  }

  // Handle Prisma errors
  if (err.code === 'P2002') {
    return c.json(
      {
        error: {
          code: ErrorCodes.DUPLICATE_ERROR,
          message: 'A resource with this information already exists',
        },
      },
      400,
    );
  }

  // Handle validation errors (Zod)
  if (err.name === 'ZodError') {
    return c.json(
      {
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Validation failed',
          details: err.issues,
        },
      },
      400,
    );
  }

  // Default server error
  return c.json(
    {
      error: {
        code: ErrorCodes.SERVER_ERROR,
        message: 'Internal server error',
      },
    },
    500,
  );
};
