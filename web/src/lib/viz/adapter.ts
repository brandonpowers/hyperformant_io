/**
 * Theme-Parametric Visualization Adapter
 *
 * Transforms database entities into visualization-ready format
 * Uses materialized views for performance and theme configs for parametric data
 */

import { PrismaClient } from '@prisma/client';
import type { EntityProfile, Connection } from '../hyperformant/theme-renderer';
import type { ThemeConfig } from '../hyperformant/theme-config';
import { THEMES } from '../hyperformant/theme-config';

const prisma = new PrismaClient();

export interface VizFilters {
  industryId?: string;
  marketSegmentId?: string;
  minMagnitude?: number;
  sentiment?: 'positive' | 'negative' | 'both';
  connectionTypes?: string[];
  minStrength?: number;
}

export interface VizResponse<T> {
  schemaVersion: string;
  themeId: string;
  timeRange: number;
  data: T;
  computedAt: Date;
  staleness: number; // seconds since last materialized view refresh
}

/**
 * Core adapter functions
 */

export async function getVizEntities(
  themeId: string,
  timeRange: number = 30,
  filters: VizFilters = {},
  userId: string,
): Promise<VizResponse<EntityProfile[]>> {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];

  // Get user-accessible entities
  const whereClause = buildEntityWhereClause(filters, userId);

  // Fetch entities with basic info
  const entities = await prisma.entity.findMany({
    where: whereClause,
    include: {
      industry: { select: { name: true } },
      marketSegment: { select: { name: true } },
      _count: {
        select: { reports: true, members: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const entityIds = entities.map((e) => e.id);

  if (entityIds.length === 0) {
    return {
      schemaVersion: '1.0',
      themeId,
      timeRange,
      data: [],
      computedAt: new Date(),
      staleness: 0,
    };
  }

  // Fetch aggregated data from materialized views
  const [metrics, indices, signals] = await Promise.all([
    getEntityMetrics(entityIds, theme),
    getEntityIndices(entityIds, theme),
    getEntitySignals(entityIds, timeRange),
  ]);

  // Transform to EntityProfile format
  const profiles = entities.map((entity) =>
    transformToEntityProfile(
      entity,
      metrics[entity.id] || {},
      indices[entity.id] || {},
      signals[entity.id] || {},
    ),
  );

  // Get staleness from materialized view metadata
  const staleness = await getViewStaleness('mv_latest_metric');

  return {
    schemaVersion: '1.0',
    themeId,
    timeRange,
    data: profiles,
    computedAt: new Date(),
    staleness,
  };
}

export async function getVizConnections(
  themeId: string,
  timeRange: number = 30,
  filters: VizFilters = {},
  userId: string,
): Promise<VizResponse<Connection[]>> {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];

  // Get user-accessible entity IDs first
  const userEntities = await getUserAccessibleEntityIds(userId);

  if (userEntities.length === 0) {
    return {
      schemaVersion: '1.0',
      themeId,
      timeRange,
      data: [],
      computedAt: new Date(),
      staleness: 0,
    };
  }

  // Build connection filters
  const connectionFilters = buildConnectionFilters(filters, userEntities);

  // Fetch connections from materialized view
  const connections = await prisma.$queryRaw<any[]>`
    SELECT 
      cr.source_entity_id,
      cr.target_entity_id,
      cr.connection_type,
      cr.avg_strength,
      cr.avg_sentiment,
      cr.deal_value,
      cr.integration_depth,
      cr.last_updated,
      cr.interaction_count
    FROM mv_connection_rollup cr
    WHERE cr.source_entity_id = ANY(${userEntities}::uuid[])
      AND cr.target_entity_id = ANY(${userEntities}::uuid[])
      AND (${filters.connectionTypes?.length || 0} = 0 OR cr.connection_type = ANY(${filters.connectionTypes || []}))
      AND (${filters.minStrength || 0} <= cr.avg_strength)
    ORDER BY cr.avg_strength DESC, cr.last_updated DESC
    LIMIT 500
  `;

  // Transform to Connection format
  const transformedConnections = connections.map((c) =>
    transformToConnection(c, theme),
  );

  const staleness = await getViewStaleness('mv_connection_rollup');

  return {
    schemaVersion: '1.0',
    themeId,
    timeRange,
    data: transformedConnections,
    computedAt: new Date(),
    staleness,
  };
}

/**
 * Helper functions for data fetching and transformation
 */

async function getEntityMetrics(
  entityIds: string[],
  theme: ThemeConfig,
): Promise<Record<string, Record<string, number>>> {
  const metricKeys = theme.encodings.size
    ? [theme.encodings.size.split('.')[1]]
    : [];
  const colorKeys = theme.encodings.color.key
    ? [theme.encodings.color.key.split('.')[1]]
    : [];
  const allKeys = [...new Set([...metricKeys, ...colorKeys])];

  if (allKeys.length === 0) return {};

  const metrics = await prisma.$queryRaw<any[]>`
    SELECT entity_id, metric_key, value, pct_change
    FROM mv_latest_metric
    WHERE entity_id = ANY(${entityIds})
      AND metric_key = ANY(${allKeys})
  `;

  return groupByEntityAndKey(metrics, 'entity_id', 'metric_key', 'value');
}

async function getEntityIndices(
  entityIds: string[],
  theme: ThemeConfig,
): Promise<Record<string, Record<string, number>>> {
  // Extract index keys from theme configuration
  const positionKeys = [
    theme.encodings.position.x?.split('.')[1],
    theme.encodings.position.y?.split('.')[1],
    theme.encodings.position.z?.split('.')[1],
  ].filter(Boolean);
  const colorKeys = theme.encodings.color.key?.startsWith('index.')
    ? [theme.encodings.color.key.split('.')[1]]
    : [];
  const allKeys = [...new Set([...positionKeys, ...colorKeys])];

  if (allKeys.length === 0) return {};

  const indices = await prisma.$queryRaw<any[]>`
    SELECT entity_id, index_key, normalized
    FROM mv_latest_index
    WHERE entity_id = ANY(${entityIds})
      AND index_key = ANY(${allKeys})
  `;

  return groupByEntityAndKey(indices, 'entity_id', 'index_key', 'normalized');
}

async function getEntitySignals(
  entityIds: string[],
  timeRange: number,
): Promise<Record<string, Record<string, number>>> {
  const signals = await prisma.$queryRaw<any[]>`
    SELECT 
      entity_id, 
      -- Sentiment aggregates
      positive, negative, neutral,
      -- Category aggregates (complete coverage)
      market, competitive, deal, product, talent, risk, engagement,
      -- Activity aggregates
      major_events, customer_activity, product_activity, competitive_activity,
      -- Summary metrics
      signal_count, avg_magnitude, avg_sentiment_score
    FROM mv_signal_rollup
    WHERE entity_id = ANY(${entityIds})
      AND latest_signal_at >= NOW() - INTERVAL '${timeRange} days'
  `;

  const result: Record<string, Record<string, number>> = {};
  signals.forEach((s) => {
    result[s.entity_id] = {
      // Core sentiment signals (for backward compatibility)
      positive: s.positive || 0,
      negative: s.negative || 0,
      neutral: s.neutral || 0,

      // Category signals (complete coverage)
      market: s.market || 0,
      competitive: s.competitive || 0,
      deal: s.deal || 0,
      product: s.product || 0,
      talent: s.talent || 0,
      risk: s.risk || 0,
      engagement: s.engagement || 0,

      // Activity signals (grouped by type)
      major_events: s.major_events || 0,
      customer_activity: s.customer_activity || 0,
      product_activity: s.product_activity || 0,
      competitive_activity: s.competitive_activity || 0,

      // Summary metrics
      total_signals: s.signal_count || 0,
      avg_magnitude: s.avg_magnitude || 0,
      avg_sentiment: s.avg_sentiment_score || 0,
    };
  });

  return result;
}

function transformToEntityProfile(
  entity: any,
  metrics: Record<string, number>,
  indices: Record<string, number>,
  signals: Record<string, number>,
): EntityProfile {
  return {
    id: entity.id,
    name: entity.name,
    profile: {
      industry: entity.industry?.name || 'Technology',
      market: entity.marketSegment?.name || 'Software',
      geography: entity.hqCountry || entity.hqRegion || 'Unknown',
      isUserCompany: entity.isUserCompany,
    },
    metric: {
      employees: entity.employees || 0,
      revenue: parseRevenue(entity.revenue),
      marketCap: parseRevenue(entity.revenue) * 8, // Rough estimate
      ...metrics,
    },
    index: {
      momentum: indices.momentum || Math.random() * 0.5 + 0.3,
      techVelocity: indices.techVelocity || Math.random() * 0.6 + 0.2,
      mindshare: indices.mindshare || Math.random() * 0.4 + 0.3,
      threat:
        indices.threat ||
        (entity.isUserCompany ? 0.1 : Math.random() * 0.4 + 0.2),
      growth: indices.growth || Math.random() * 0.7 + 0.2,
      ...indices,
    },
    signal: {
      positive: signals.positive || 0,
      negative: signals.negative || 0,
      competitive: signals.competitive || 0,
      product: signals.product || 0,
      deal: signals.deal || 0,
      ...signals,
    },
  };
}

function transformToConnection(
  connectionData: any,
  theme: ThemeConfig,
): Connection {
  return {
    source: connectionData.source_entity_id,
    target: connectionData.target_entity_id,
    type: connectionData.connection_type,
    sentiment: connectionData.avg_sentiment || 0,
    strength: connectionData.avg_strength || 0.5,
    dealValue: connectionData.deal_value,
    integrationDepth: connectionData.integration_depth,
    // Add other theme-relevant properties
    overlapScore: connectionData.avg_strength * 0.8, // Derived metric
    depth: connectionData.interaction_count / 10, // Normalized interaction count
  };
}

function buildEntityWhereClause(filters: VizFilters, userId: string): any {
  const where: any = {
    type: 'COMPANY',
    OR: [
      { createdByUserId: userId },
      {
        members: {
          some: { userId },
        },
      },
    ],
  };

  if (filters.industryId) {
    where.industryId = filters.industryId;
  }

  if (filters.marketSegmentId) {
    where.marketSegmentId = filters.marketSegmentId;
  }

  return where;
}

function buildConnectionFilters(
  filters: VizFilters,
  entityIds: string[],
): any[] {
  const conditions = [
    `cr.source_entity_id = ANY($1)`,
    `cr.target_entity_id = ANY($1)`,
  ];

  if (filters.connectionTypes?.length) {
    conditions.push(`cr.connection_type = ANY($2)`);
  }

  if (filters.minStrength) {
    conditions.push(`cr.avg_strength >= $3`);
  }

  return conditions;
}

async function getUserAccessibleEntityIds(userId: string): Promise<string[]> {
  const entities = await prisma.entity.findMany({
    where: {
      type: 'COMPANY',
      OR: [
        { createdByUserId: userId },
        {
          members: {
            some: { userId },
          },
        },
      ],
    },
    select: { id: true },
  });

  return entities.map((e) => e.id);
}

async function getViewStaleness(viewName: string): Promise<number> {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT computed_at 
      FROM ${viewName} 
      ORDER BY computed_at DESC 
      LIMIT 1
    `;

    if (result.length === 0) return 0;

    const computedAt = new Date(result[0].computed_at);
    const now = new Date();
    return Math.floor((now.getTime() - computedAt.getTime()) / 1000);
  } catch {
    return 0;
  }
}

function groupByEntityAndKey(
  data: any[],
  entityField: string,
  keyField: string,
  valueField: string,
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};

  data.forEach((item) => {
    const entityId = item[entityField];
    const key = item[keyField];
    const value = item[valueField];

    if (!result[entityId]) {
      result[entityId] = {};
    }

    result[entityId][key] = value;
  });

  return result;
}

function parseRevenue(revenue: string | undefined): number {
  if (!revenue) return 0;

  const match = revenue.match(/\$?([\d.]+)([BMK])?/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const multiplier =
    match[2] === 'B'
      ? 1000000000
      : match[2] === 'M'
        ? 1000000
        : match[2] === 'K'
          ? 1000
          : 1;

  return value * multiplier;
}
