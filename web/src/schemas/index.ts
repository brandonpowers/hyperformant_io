/**
 * Centralized schema exports
 * Single source of truth for all API types
 */

// Common schemas
export * from './common.schema';

// Core schemas (order matters - entity must come before company)
export * from './user.schema';
export * from './auth.schema';
export * from './entity.schema';

// Domain-specific schemas (depends on entity.schema)
export * from './company.schema';

// Competitive Intelligence schemas
export * from './signal.schema';
export * from './connection.schema';
export * from './metric.schema';
export * from './intelligence.schema';

// Future schemas (to be added)
// export * from './report.schema';
// export * from './ai.schema';
// export * from './marketing.schema';
// export * from './analytics.schema';
