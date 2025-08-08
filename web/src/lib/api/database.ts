import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma client with connection pooling and logging
 */
class DatabaseManager {
  private static instance: PrismaClient;
  
  public static getInstance(): PrismaClient {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        errorFormat: 'pretty',
      });
      
      // Handle graceful shutdown
      process.on('beforeExit', async () => {
        await DatabaseManager.instance.$disconnect();
      });
    }
    
    return DatabaseManager.instance;
  }
  
  /**
   * Health check for database connection
   */
  public static async healthCheck(): Promise<boolean> {
    try {
      const db = DatabaseManager.getInstance();
      await db.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
  
  /**
   * Get database connection statistics
   */
  public static async getConnectionInfo() {
    try {
      const db = DatabaseManager.getInstance();
      const result = await db.$queryRaw`
        SELECT 
          count(*) as active_connections,
          current_database() as database_name,
          current_user as user_name,
          version() as version
      `;
      return result;
    } catch (error) {
      console.error('Failed to get database info:', error);
      return null;
    }
  }
}

// Export singleton instance
export const db = DatabaseManager.getInstance();

// Export utilities
export const dbHealthCheck = DatabaseManager.healthCheck;
export const getDbConnectionInfo = DatabaseManager.getConnectionInfo;

/**
 * Database middleware for Hono routes
 * Ensures database connection is available in route context
 */
export const createDatabaseMiddleware = () => {
  return async (c: any, next: any) => {
    try {
      // Set database instance in context
      c.set('db', db);
      await next();
    } catch (error) {
      console.error('Database middleware error:', error);
      throw error;
    }
  };
};

/**
 * Helper to get database instance from context
 */
export const getDb = (c: any): PrismaClient => {
  return c.get('db') || db;
};

/**
 * Transaction helper for complex operations
 */
export const withTransaction = async <T>(
  operation: (tx: PrismaClient) => Promise<T>
): Promise<T> => {
  return await db.$transaction(operation);
};

/**
 * Common database error handler
 */
export const handleDatabaseError = (error: any) => {
  console.error('Database error:', error);
  
  // Handle specific Prisma errors
  if (error.code === 'P2002') {
    return {
      type: 'UNIQUE_CONSTRAINT',
      message: 'A record with this information already exists',
      field: error.meta?.target?.[0] || 'unknown',
    };
  }
  
  if (error.code === 'P2025') {
    return {
      type: 'RECORD_NOT_FOUND',
      message: 'The requested record was not found',
    };
  }
  
  if (error.code === 'P2003') {
    return {
      type: 'FOREIGN_KEY_CONSTRAINT',
      message: 'This record is referenced by other data and cannot be deleted',
    };
  }
  
  // Generic database error
  return {
    type: 'DATABASE_ERROR',
    message: 'A database error occurred',
  };
};