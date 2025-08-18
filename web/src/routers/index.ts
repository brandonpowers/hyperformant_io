import { OpenAPIHono } from '@hono/zod-openapi';
import { companiesApp } from './companies.router';
import { authApp } from './auth.router';
import { usersApp } from './users.router';
import { entitiesApp } from './entities.router';
import { signalsApp } from './signals.router';
import { connectionsApp } from './connections.router';
import { metricsApp } from './metrics.router';
import { intelligenceApp } from './intelligence.router';
import { visualizationApp } from './visualization.router';
import { errorHandler } from '../lib/api/errors';
import { createLoggingMiddleware } from '../lib/api/logging-middleware';
import { dbHealthCheck } from '../lib/api/database';

/**
 * Main API router that combines all domain routers
 * This is the single entry point for all API routes
 */
export const apiApp = new OpenAPIHono();

// Global middleware
const loggingMiddleware = createLoggingMiddleware({
  excludePaths: ['/health', '/info', '/docs'],
});

apiApp.use('*', loggingMiddleware);

// Global error handler
apiApp.onError(errorHandler);

// Test adding routers one by one to find the problematic one
apiApp.route('/', companiesApp);
apiApp.route('/', authApp);
apiApp.route('/', usersApp);
apiApp.route('/', entitiesApp);
apiApp.route('/', signalsApp);
apiApp.route('/', connectionsApp);
apiApp.route('/', metricsApp);
apiApp.route('/', intelligenceApp);
apiApp.route('/', visualizationApp); // Testing with history route disabled

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
      entities: '/api/v1/entities',
      signals: '/api/v1/signals',
      connections: '/api/v1/connections',
      metrics: '/api/v1/metrics',
      intelligence: '/api/v1/intelligence',
      visualization: '/api/v1/viz',
    },
    features: [
      'REST API',
      'Authentication with NextAuth.js',
      'Hono framework',
      'Competitive Intelligence',
      'Entity Relationship Mapping',
      'Signal Processing',
      'Time-series Metrics',
      'Composite Indices',
    ],
  });
});

// OpenAPI specification endpoint using getOpenAPI31Document method
apiApp.get('/openapi.json', (c) => {
  try {
    console.log('📋 Generating OpenAPI specification using getOpenAPI31Document...');
    
    const openApiDocument = apiApp.getOpenAPI31Document({
      openapi: '3.1.0',
      info: {
        title: 'Hyperformant API',
        version: '1.0.0',
        description: 'AI-powered B2B automation and consulting pipeline system',
      },
      servers: [
        {
          url:
            process.env.NODE_ENV === 'production'
              ? 'https://api.hyperformant.io/v1'
              : 'http://localhost:3000/api/v1',
          description:
            process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
        },
      ],
    });
    
    console.log('✅ OpenAPI document generated successfully');
    console.log('📊 Paths found:', Object.keys(openApiDocument.paths || {}));
    console.log('🔧 Components:', Object.keys(openApiDocument.components || {}));
    
    return c.json(openApiDocument);
  } catch (error) {
    console.error('❌ Error generating OpenAPI document:', error);
    console.error('Stack trace:', error.stack);
    return c.json({ 
      error: 'Failed to generate OpenAPI specification', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, 500);
  }
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
