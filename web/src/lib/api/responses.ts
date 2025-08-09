/**
 * Standard API response helpers
 */

export const ApiResponse = {
  success: (data: any, meta?: any) => ({
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      ...meta,
    },
  }),

  created: (data: any, meta?: any) => ({
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      ...meta,
    },
  }),

  accepted: (taskId: string, estimatedCompletion?: string) => ({
    data: {
      id: taskId,
      status: 'processing',
      estimatedCompletion,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  }),
};

/**
 * Standard OpenAPI response schemas for documentation
 * This reduces repetition in route definitions
 */
export const StandardResponses = {
  200: {
    description: 'Successful response',
  },
  201: {
    description: 'Resource created successfully',
  },
  202: {
    description: 'Request accepted for processing',
  },
  400: {
    description: 'Bad request - validation error',
  },
  401: {
    description: 'Authentication required',
  },
  403: {
    description: 'Access denied',
  },
  404: {
    description: 'Resource not found',
  },
  409: {
    description: 'Conflict - resource already exists',
  },
  429: {
    description: 'Rate limit exceeded',
  },
  500: {
    description: 'Internal server error',
  },
};
