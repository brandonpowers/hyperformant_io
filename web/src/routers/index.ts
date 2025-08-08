import { OpenAPIHono } from '@hono/zod-openapi';
import { companiesApp } from './companies.router';
import { authApp } from './auth.router';
import { usersApp } from './users.router';
import { errorHandler } from '../lib/api/errors';
import { createLoggingMiddleware } from '../lib/api/logging-middleware';
import { dbHealthCheck } from '../lib/api/database';

/**
 * Main API router that combines all domain routers
 * This is the single entry point for all API routes
 */
export const apiApp = new OpenAPIHono({
  info: {
    title: 'Hyperformant API',
    version: '1.0.0',
    description: 'AI-powered B2B automation and consulting pipeline system',
  },
  openapi: '3.1.0',
  servers: [
    {
      url: process.env.NODE_ENV === 'production' 
        ? 'https://api.hyperformant.io/v1' 
        : 'http://localhost:3000/api/v1',
      description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
    },
  ],
});

// Global middleware
const loggingMiddleware = createLoggingMiddleware({
  excludePaths: ['/health', '/info', '/docs'],
});

apiApp.use('*', loggingMiddleware);

// Global error handler
apiApp.onError(errorHandler);

// Mount domain routers
apiApp.route('/', companiesApp);
apiApp.route('/', authApp);
apiApp.route('/', usersApp);

// System endpoints
apiApp.get('/health', async (c) => {
  const dbHealthy = await dbHealthCheck();
  
  return c.json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    database: dbHealthy,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

apiApp.get('/info', (c) => {
  return c.json({
    name: 'Hyperformant API',
    version: '1.0.0',
    description: 'AI-powered B2B automation and consulting pipeline system',
    health: '/api/v1/health',
    endpoints: {
      companies: '/api/v1/companies',
      auth: '/api/v1/auth',
      users: '/api/v1/users',
    },
    features: [
      'REST API',
      'Authentication with NextAuth.js',
      'Hono framework',
    ],
  });
});

// OpenAPI specification endpoints
apiApp.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Hyperformant API',
    version: '1.0.0', 
    description: 'AI-powered B2B automation and consulting pipeline system',
  },
  servers: [
    {
      url: process.env.NODE_ENV === 'production' 
        ? 'https://api.hyperformant.io/v1' 
        : 'http://localhost:3000/api/v1',
      description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
    },
  ],
});

// Add Scalar documentation endpoint
apiApp.get('/docs', (c) => {
  return c.html(`<!DOCTYPE html>
<html>
<head>
  <title>Hyperformant API Documentation</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      margin: 0;
    }
  </style>
</head>
<body>
  <script id="api-reference" data-url="/api/v1/openapi.json"></script>
  <script>
    var configuration = {
      theme: 'alternate',
      spec: {
        url: '/api/v1/openapi.json',
      },
      metaData: {
        title: 'Hyperformant API Documentation',
      },
      customCss: \`
        .scalar-api-reference {
          --scalar-color-1: #0f172a;
          --scalar-color-2: #1e293b;
          --scalar-color-3: #334155;
        }
      \`,
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`);
});
