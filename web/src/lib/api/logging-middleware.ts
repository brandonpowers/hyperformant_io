/**
 * Request logging middleware for API monitoring and debugging
 */

interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  userAgent?: string;
  userId?: string;
  ip?: string;
  error?: string;
}

/**
 * Log levels for different environments
 */
const LOG_LEVELS = {
  development: ['info', 'warn', 'error'],
  production: ['warn', 'error'],
  test: ['error'],
} as const;

const currentLogLevel =
  LOG_LEVELS[process.env.NODE_ENV as keyof typeof LOG_LEVELS] ||
  LOG_LEVELS.development;

/**
 * Format log entry for console output
 */
const formatLogEntry = (entry: LogEntry): string => {
  const { timestamp, method, path, statusCode, duration, userId, error } =
    entry;

  let logLine = `[${timestamp}] ${method} ${path}`;

  if (statusCode) {
    const statusColor =
      statusCode >= 400 ? '🔴' : statusCode >= 300 ? '🟡' : '🟢';
    logLine += ` ${statusColor} ${statusCode}`;
  }

  if (duration !== undefined) {
    logLine += ` (${duration}ms)`;
  }

  if (userId) {
    logLine += ` [User: ${userId}]`;
  }

  if (error) {
    logLine += ` ❌ ${error}`;
  }

  return logLine;
};

/**
 * Determine if we should log at this level
 */
const shouldLog = (level: string): boolean => {
  return currentLogLevel.includes(level as any);
};

/**
 * Create request logging middleware
 */
export const createLoggingMiddleware = (
  options: {
    logRequests?: boolean;
    logResponses?: boolean;
    logErrors?: boolean;
    excludePaths?: string[];
  } = {},
) => {
  const {
    logRequests = true,
    logResponses = true,
    logErrors = true,
    excludePaths = ['/health', '/ping'],
  } = options;

  return async (c: any, next: any) => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    const method = c.req.method;
    const path = c.req.path;

    // Skip logging for excluded paths
    if (excludePaths.includes(path)) {
      await next();
      return;
    }

    // Get request info
    const userAgent = c.req.header('user-agent');
    const ip =
      c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

    let userId: string | undefined;
    let error: string | undefined;
    let statusCode: number | undefined;

    try {
      // Log incoming request
      if (logRequests && shouldLog('info')) {
        const entry: LogEntry = {
          timestamp,
          method,
          path,
          userAgent: userAgent?.substring(0, 100),
          ip,
        };

        console.log(`📥 ${formatLogEntry(entry)}`);
      }

      // Execute the route
      await next();

      // Get user info if available (set by auth middleware)
      const user = c.get('user');
      if (user) {
        userId = user.id;
      }

      // Get response status
      statusCode = c.res?.status || 200;
    } catch (err: any) {
      error = err.message || 'Unknown error';
      statusCode = err.status || 500;

      if (logErrors && shouldLog('error')) {
        console.error(`❌ Error in ${method} ${path}:`, err);
      }

      throw err; // Re-throw the error
    } finally {
      // Log response
      if (logResponses && shouldLog('info')) {
        const duration = Date.now() - startTime;

        const entry: LogEntry = {
          timestamp,
          method,
          path,
          statusCode,
          duration,
          userId,
          error,
        };

        const logPrefix = error ? '📤❌' : '📤';
        console.log(`${logPrefix} ${formatLogEntry(entry)}`);
      }

      // Log performance warnings for slow requests
      const duration = Date.now() - startTime;
      if (duration > 1000 && shouldLog('warn')) {
        console.warn(`⚠️ Slow request: ${method} ${path} took ${duration}ms`);
      }
    }
  };
};

/**
 * Middleware specifically for error logging
 */
export const createErrorLoggingMiddleware = () => {
  return async (c: any, next: any) => {
    try {
      await next();
    } catch (error: any) {
      const timestamp = new Date().toISOString();
      const method = c.req.method;
      const path = c.req.path;
      const user = c.get('user');

      console.error(`[${timestamp}] ERROR in ${method} ${path}`, {
        error: error.message,
        stack: error.stack,
        userId: user?.id,
        statusCode: error.status,
        details: error.details,
      });

      throw error;
    }
  };
};

/**
 * Create metrics collection middleware for production monitoring
 */
export const createMetricsMiddleware = () => {
  const metrics = {
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    responseTimeSum: 0,
  };

  return async (c: any, next: any) => {
    const startTime = Date.now();
    metrics.requestCount++;

    try {
      await next();
    } catch (error) {
      metrics.errorCount++;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      metrics.responseTimeSum += duration;
      metrics.averageResponseTime =
        metrics.responseTimeSum / metrics.requestCount;
    }
  };
};

/**
 * Simple middleware for development debugging
 */
export const createDebugMiddleware = () => {
  return async (c: any, next: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔧 Debug: ${c.req.method} ${c.req.path}`);

      // Log request headers in development
      const headers = Object.fromEntries(c.req.raw.headers.entries());
      console.log('📋 Headers:', headers);

      // Log query params
      const query = c.req.query();
      if (Object.keys(query).length > 0) {
        console.log('🔍 Query:', query);
      }
    }

    await next();
  };
};
