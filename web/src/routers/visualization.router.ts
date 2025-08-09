import { OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import type { Context } from 'hono';
import { createSafeAuthMiddleware } from '../lib/api/context-safety';
import { ApiError } from '../lib/api/errors';
import { ApiResponse } from '../lib/api/responses';
import {
  getVizEntities,
  getVizConnections,
  type VizFilters,
} from '../lib/viz/adapter';
import {
  applyTheme,
  defaultPalette,
  defaultNormalize,
  defaultGetCompound,
  defaultGetConnValue,
} from '../lib/hyperformant/theme-renderer';
import { THEMES } from '../lib/hyperformant/theme-config';
import {
  refreshVisualizationViews,
  smartRefresh,
  checkViewStaleness,
  getRefreshHistory,
} from '../lib/viz/refresh';

// Create Hono app with OpenAPI
export const visualizationApp = new OpenAPIHono();

// Use safe authentication middleware
const authMiddleware = createSafeAuthMiddleware();

// Simple test route
visualizationApp.get('/viz/test', authMiddleware, async (c) => {
  return c.json({ message: 'Visualization router working!', timestamp: new Date() });
});


/**
 * SCHEMAS
 */

const VizFiltersSchema = z.object({
  themeId: z.string().default('market-landscape').openapi({
    description: 'Theme ID for visualization style',
    example: 'market-landscape',
  }),
  timeRange: z.coerce.number().min(1).max(365).default(30).openapi({
    description: 'Time range in days for signal aggregation',
    example: 30,
  }),
  industryId: z.string().uuid().optional().openapi({
    description: 'Filter by industry ID',
  }),
  marketSegmentId: z.string().uuid().optional().openapi({
    description: 'Filter by market segment ID',
  }),
  minMagnitude: z.coerce.number().min(0).max(1).optional().openapi({
    description: 'Minimum signal magnitude threshold (0-1)',
  }),
  sentiment: z.enum(['positive', 'negative', 'both']).optional().openapi({
    description: 'Filter by sentiment type',
  }),
  connectionTypes: z
    .array(z.string())
    .optional()
    .openapi({
      description: 'Filter connection types',
      example: ['competitor', 'partnership', 'mna'],
    }),
  minStrength: z.coerce.number().min(0).max(1).optional().openapi({
    description: 'Minimum connection strength threshold (0-1)',
  }),
});

const EntityProfileSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    profile: z.object({
      industry: z.string().optional(),
      market: z.string().optional(),
      geography: z.string().optional(),
      isUserCompany: z.boolean().optional(),
    }),
    metric: z.record(z.number()),
    index: z.record(z.number()),
    signal: z.record(z.number()),
  })
  .openapi('EntityProfile');

const ConnectionSchema = z
  .object({
    source: z.string(),
    target: z.string(),
    type: z.string(),
    sentiment: z.number().optional(),
    strength: z.number().optional(),
    dealValue: z.number().optional(),
    integrationDepth: z.number().optional(),
    overlapScore: z.number().optional(),
    depth: z.number().optional(),
  })
  .openapi('Connection');

const VizResponseSchema = z.object({
  schemaVersion: z.string(),
  themeId: z.string(),
  timeRange: z.number(),
  computedAt: z.string().datetime(),
  staleness: z
    .number()
    .describe('Seconds since last materialized view refresh'),
});

const EntitiesResponseSchema = VizResponseSchema.extend({
  data: z.array(EntityProfileSchema),
}).openapi('VizEntitiesResponse');

const ConnectionsResponseSchema = VizResponseSchema.extend({
  data: z.array(ConnectionSchema),
}).openapi('VizConnectionsResponse');

const FrameResponseSchema = VizResponseSchema.extend({
  data: z.object({
    nodes: z.array(z.any()).describe('VisualNode array from theme renderer'),
    edges: z.array(z.any()).describe('VisualEdge array from theme renderer'),
    background: z.any().describe('VisualBackground from theme renderer'),
  }),
}).openapi('VizFrameResponse');

/**
 * ROUTES
 */

// GET /viz/entities - Theme-parametric entities
visualizationApp.openapi(
  {
    method: 'get',
    path: '/viz/entities',
    summary: 'Get entities for visualization',
    description:
      'Retrieve entities in theme-parametric format optimized for 3D visualization',
    tags: ['Visualization'],
    security: [{ Bearer: [] }],
    request: {
      query: VizFiltersSchema,
    },
    responses: {
      200: {
        description: 'Entities formatted for visualization',
        content: {
          'application/json': {
            schema: EntitiesResponseSchema,
          },
        },
      },
      401: { description: 'Unauthorized' },
      500: { description: 'Internal server error' },
    },
  },
  authMiddleware,
  async (c) => {
    const user = c.get('user');
    const query = c.req.valid('query');

    try {
      const filters: VizFilters = {
        industryId: query.industryId,
        marketSegmentId: query.marketSegmentId,
        minMagnitude: query.minMagnitude,
        sentiment: query.sentiment,
        connectionTypes: query.connectionTypes,
        minStrength: query.minStrength,
      };

      const result = await getVizEntities(
        query.themeId,
        query.timeRange,
        filters,
        user.id,
      );

      return c.json(ApiResponse.success(result));
    } catch (error) {
      console.error('Error fetching viz entities:', error);
      throw ApiError.server('Failed to fetch visualization entities');
    }
  },
);

// GET /viz/connections - Theme-parametric connections
visualizationApp.openapi(
  {
    method: 'get',
    path: '/viz/connections',
    summary: 'Get connections for visualization',
    description:
      'Retrieve connections in theme-parametric format optimized for 3D visualization',
    tags: ['Visualization'],
    security: [{ Bearer: [] }],
    request: {
      query: VizFiltersSchema,
    },
    responses: {
      200: {
        description: 'Connections formatted for visualization',
        content: {
          'application/json': {
            schema: ConnectionsResponseSchema,
          },
        },
      },
      401: { description: 'Unauthorized' },
      500: { description: 'Internal server error' },
    },
  },
  authMiddleware,
  async (c) => {
    const user = c.get('user');
    const query = c.req.valid('query');

    try {
      const filters: VizFilters = {
        industryId: query.industryId,
        marketSegmentId: query.marketSegmentId,
        minMagnitude: query.minMagnitude,
        sentiment: query.sentiment,
        connectionTypes: query.connectionTypes,
        minStrength: query.minStrength,
      };

      const result = await getVizConnections(
        query.themeId,
        query.timeRange,
        filters,
        user.id,
      );

      return c.json(ApiResponse.success(result));
    } catch (error) {
      console.error('Error fetching viz connections:', error);
      throw ApiError.server('Failed to fetch visualization connections');
    }
  },
);

// GET /viz/frame - Complete visualization frame (simple route for now)
visualizationApp.get('/viz/frame', authMiddleware, async (c) => {
    const user = c.get('user');
    
    // Manually parse query parameters since we removed OpenAPI validation  
    const url = new URL(c.req.url);
    const query = {
      themeId: url.searchParams.get('themeId') || 'market-landscape',
      timeRange: parseInt(url.searchParams.get('timeRange') || '30'),
      industryId: url.searchParams.get('industryId') || undefined,
      marketSegmentId: url.searchParams.get('marketSegmentId') || undefined,
      minMagnitude: url.searchParams.get('minMagnitude') ? parseFloat(url.searchParams.get('minMagnitude')!) : undefined,
      sentiment: url.searchParams.get('sentiment') as 'positive' | 'negative' | 'both' | undefined,
      connectionTypes: url.searchParams.get('connectionTypes')?.split(',') || undefined,
      minStrength: url.searchParams.get('minStrength') ? parseFloat(url.searchParams.get('minStrength')!) : undefined,
    };

    try {
      const filters: VizFilters = {
        industryId: query.industryId,
        marketSegmentId: query.marketSegmentId,
        minMagnitude: query.minMagnitude,
        sentiment: query.sentiment,
        connectionTypes: query.connectionTypes,
        minStrength: query.minStrength,
      };

      // Get both entities and connections
      const [entitiesResult, connectionsResult] = await Promise.all([
        getVizEntities(query.themeId, query.timeRange, filters, user.id),
        getVizConnections(query.themeId, query.timeRange, filters, user.id),
      ]);

      // Find the theme configuration
      const theme = THEMES.find((t) => t.id === query.themeId) || THEMES[0];

      // Apply theme renderer to create complete frame
      const frame = applyTheme({
        theme,
        entities: entitiesResult.data,
        connections: connectionsResult.data,
        palette: defaultPalette,
        normalize: defaultNormalize,
        getCompound: defaultGetCompound,
        getConnValue: defaultGetConnValue,
      });

      const result = {
        schemaVersion: '1.0',
        themeId: query.themeId,
        timeRange: query.timeRange,
        data: frame,
        computedAt: new Date(),
        staleness: Math.max(
          entitiesResult.staleness,
          connectionsResult.staleness,
        ),
      };

      return c.json(ApiResponse.success(result));
    } catch (error) {
      console.error('Error generating viz frame:', error);
      throw ApiError.server('Failed to generate visualization frame');
    }
});

// GET /viz/themes - Available themes
visualizationApp.openapi(
  {
    method: 'get',
    path: '/viz/themes',
    summary: 'Get available visualization themes',
    description:
      'Retrieve list of available visualization themes with their configurations',
    tags: ['Visualization'],
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: 'Available themes',
        content: {
          'application/json': {
            schema: z
              .object({
                themes: z.array(
                  z.object({
                    id: z.string(),
                    name: z.string(),
                    description: z.string(),
                    category: z.string(),
                  }),
                ),
              })
              .openapi('ThemesResponse'),
          },
        },
      },
    },
  },
  authMiddleware,
  async (c) => {
    const themes = THEMES.map((theme) => ({
      id: theme.id,
      name: theme.name,
      description: theme.description,
      category: theme.category,
    }));

    return c.json(ApiResponse.success({ themes }));
  },
);

// GET /viz/health - Health check with materialized view status
visualizationApp.get('/viz/health', async (c) => {
  try {
    // Check materialized view staleness
    const staleness = await checkViewStaleness();
    const maxStaleness = Math.max(
      ...staleness.views.map((v) => v.staleness).filter((s) => s !== Infinity),
    );
    const isHealthy = maxStaleness < 3600; // 1 hour threshold

    return c.json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      materializedViews: {
        views: staleness.views,
        needsRefresh: staleness.needsRefresh,
        maxStaleness,
      },
      schemaVersion: '1.0',
    });
  } catch (error) {
    return c.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Failed to check health',
      },
      500,
    );
  }
});

// POST /viz/refresh - Manual refresh of materialized views (admin only)
visualizationApp.openapi(
  {
    method: 'post',
    path: '/viz/refresh',
    summary: 'Refresh materialized views',
    description: 'Manually trigger refresh of visualization materialized views',
    tags: ['Visualization', 'Admin'],
    security: [{ Bearer: [] }],
    request: {
      query: z.object({
        force: z
          .boolean()
          .optional()
          .describe('Force full refresh even if views are fresh'),
      }),
    },
    responses: {
      200: {
        description: 'Refresh completed',
        content: {
          'application/json': {
            schema: z
              .object({
                success: z.boolean(),
                summary: z.object({
                  totalViews: z.number(),
                  successful: z.number(),
                  failed: z.number(),
                  totalDuration: z.number(),
                  timestamp: z.string().datetime(),
                }),
              })
              .openapi('RefreshResponse'),
          },
        },
      },
      403: { description: 'Admin access required' },
      500: { description: 'Refresh failed' },
    },
  },
  authMiddleware,
  async (c) => {
    const user = c.get('user');

    // Check admin access
    if (!user.isAdmin) {
      throw ApiError.forbidden('Admin access required for manual refresh');
    }

    const query = c.req.valid('query') || {};

    try {
      let summary;

      if (query.force) {
        console.log('🔧 Admin forced full refresh');
        summary = await refreshVisualizationViews();
      } else {
        console.log('🔍 Admin triggered smart refresh');
        summary = await smartRefresh();
      }

      if (!summary) {
        return c.json(
          ApiResponse.success({
            success: true,
            message: 'Views were already fresh, no refresh needed',
            summary: null,
          }),
        );
      }

      return c.json(
        ApiResponse.success({
          success: summary.successful === summary.totalViews,
          summary: {
            totalViews: summary.totalViews,
            successful: summary.successful,
            failed: summary.failed,
            totalDuration: summary.totalDuration,
            timestamp: summary.timestamp.toISOString(),
          },
        }),
      );
    } catch (error) {
      console.error('Manual refresh failed:', error);
      throw ApiError.server('Failed to refresh materialized views');
    }
  },
);

// GET /viz/refresh/history - Refresh history (admin only)
visualizationApp.openapi(
  {
    method: 'get',
    path: '/viz/refresh/history',
    summary: 'Get refresh history',
    description: 'Get history of materialized view refreshes for monitoring',
    tags: ['Visualization', 'Admin'],
    security: [{ Bearer: [] }],
    request: {
      query: z.object({
        limit: z.coerce.number().min(1).max(100).default(20).optional(),
      }),
    },
    responses: {
      200: {
        description: 'Refresh history',
        content: {
          'application/json': {
            schema: z
              .object({
                history: z.array(
                  z.object({
                    timestamp: z.string().datetime(),
                    duration: z.number(),
                    successful: z.number(),
                    total: z.number(),
                    successRate: z.number(),
                  }),
                ),
              })
              .openapi('RefreshHistoryResponse'),
          },
        },
      },
      403: { description: 'Admin access required' },
    },
  },
  authMiddleware,
  async (c) => {
    const user = c.get('user');

    if (!user.isAdmin) {
      throw ApiError.forbidden('Admin access required for refresh history');
    }

    const query = c.req.valid('query') || {};

    try {
      const history = await getRefreshHistory(query.limit || 20);

      return c.json(
        ApiResponse.success({
          history: history.map((h) => ({
            timestamp: h.timestamp.toISOString(),
            duration: h.duration,
            successful: h.successful,
            total: h.total,
            successRate: h.successRate,
          })),
        }),
      );
    } catch (error) {
      console.error('Failed to get refresh history:', error);
      throw ApiError.server('Failed to get refresh history');
    }
  },
);

/**
 * Helper functions
 */

async function checkViewStaleness() {
  const views = [
    'mv_latest_metric',
    'mv_latest_index',
    'mv_signal_rollup',
    'mv_connection_rollup',
  ];
  const staleness: Record<string, number> = {};

  for (const view of views) {
    try {
      const result = await (visualizationApp as any).env.prisma.$queryRaw<
        any[]
      >`
        SELECT EXTRACT(EPOCH FROM (NOW() - computed_at)) as staleness_seconds
        FROM ${view}
        ORDER BY computed_at DESC
        LIMIT 1
      `;

      staleness[view] = result[0]?.staleness_seconds || 0;
    } catch {
      staleness[view] = -1; // Error state
    }
  }

  return {
    views: staleness,
    maxStaleness: Math.max(...Object.values(staleness).filter((v) => v >= 0)),
    lastCheck: new Date().toISOString(),
  };
}
