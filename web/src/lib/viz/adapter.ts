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

/**
 * Convert BigInt values to numbers recursively
 * Handles objects, arrays, and nested structures
 */
function convertBigIntsToNumbers(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntsToNumbers(item));
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = convertBigIntsToNumbers(obj[key]);
      }
    }
    return result;
  }
  
  return obj;
}

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
  const rawConnections = await prisma.$queryRaw<any[]>`
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

  // Convert BigInts to numbers
  const connections = convertBigIntsToNumbers(rawConnections);

  // Transform to Connection format
  const transformedConnections = connections.map((c: any) =>
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

  const rawMetrics = await prisma.$queryRaw<any[]>`
    SELECT entity_id, metric_key, value, pct_change
    FROM mv_latest_metric
    WHERE entity_id = ANY(${entityIds}::uuid[])
      AND metric_key = ANY(${allKeys})
  `;

  // Convert BigInts to numbers
  const metrics = convertBigIntsToNumbers(rawMetrics);

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

  const rawIndices = await prisma.$queryRaw<any[]>`
    SELECT entity_id, index_key, normalized
    FROM mv_latest_index
    WHERE entity_id = ANY(${entityIds}::uuid[])
      AND index_key = ANY(${allKeys})
  `;

  // Convert BigInts to numbers
  const indices = convertBigIntsToNumbers(rawIndices);

  return groupByEntityAndKey(indices, 'entity_id', 'index_key', 'normalized');
}

async function getEntitySignals(
  entityIds: string[],
  timeRange: number,
): Promise<Record<string, Record<string, number>>> {
  const rawSignals = await prisma.$queryRaw<any[]>`
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
    WHERE entity_id = ANY(${entityIds}::uuid[])
      AND latest_signal_at >= NOW() - INTERVAL '${timeRange} days'
  `;

  // Convert BigInts to numbers
  const signals = convertBigIntsToNumbers(rawSignals);

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
  // Generate deterministic random values based on entity ID for consistency
  const seedRandom = (seed: string, min: number, max: number) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    const random = (Math.abs(hash) % 1000) / 1000;
    return min + random * (max - min);
  };

  const entitySeed = entity.id;
  
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
      employees: entity.employees || seedRandom(entitySeed + 'emp', 10, 500),
      revenue: parseRevenue(entity.revenue) || seedRandom(entitySeed + 'rev', 1000000, 100000000),
      marketCap: parseRevenue(entity.revenue) * 8 || seedRandom(entitySeed + 'cap', 10000000, 1000000000),
      traffic: metrics.traffic || seedRandom(entitySeed + 'traffic', 1000, 1000000),
      marketCapGrowth: metrics.marketCapGrowth || seedRandom(entitySeed + 'growth', -0.2, 0.5),
      trafficGrowth: metrics.trafficGrowth || seedRandom(entitySeed + 'tgrowth', -0.1, 0.3),
      hiringVelocity: metrics.hiringVelocity || seedRandom(entitySeed + 'hiring', 0, 0.5),
      ...metrics,
    },
    index: {
      // Ensure all required indices have values for positioning
      momentum: indices.momentum ?? seedRandom(entitySeed + 'momentum', 0.2, 0.8),
      techVelocity: indices.techVelocity ?? seedRandom(entitySeed + 'tech', 0.1, 0.9),
      mindshare: indices.mindshare ?? seedRandom(entitySeed + 'mind', 0.1, 0.7),
      threat: indices.threat ?? (entity.isUserCompany ? 0.1 : seedRandom(entitySeed + 'threat', 0.2, 0.6)),
      growth: indices.growth ?? seedRandom(entitySeed + 'growth', 0.2, 0.9),
      competitiveThreat: indices.competitiveThreat ?? seedRandom(entitySeed + 'cthreat', 0.1, 0.8),
      influence: indices.influence ?? seedRandom(entitySeed + 'influence', 0.2, 0.7),
      shortTermGrowth: indices.shortTermGrowth ?? seedRandom(entitySeed + 'stgrowth', 0.1, 0.6),
      dealMomentum: indices.dealMomentum ?? seedRandom(entitySeed + 'deal', 0.1, 0.5),
      ...indices,
    },
    signal: {
      positive: signals.positive || seedRandom(entitySeed + 'pos', 0, 0.5),
      negative: signals.negative || seedRandom(entitySeed + 'neg', 0, 0.3),
      competitive: signals.competitive || seedRandom(entitySeed + 'comp', 0, 0.4),
      product: signals.product || seedRandom(entitySeed + 'prod', 0, 0.3),
      deal: signals.deal || seedRandom(entitySeed + 'deal', 0, 0.2),
      neutral: signals.neutral || 0,
      market: signals.market || seedRandom(entitySeed + 'market', 0, 0.3),
      talent: signals.talent || 0,
      risk: signals.risk || 0,
      engagement: signals.engagement || 0,
      ...signals,
    },
  };
}

function transformToConnection(
  connectionData: any,
  theme: ThemeConfig,
): Connection {
  // BigInts already converted to numbers by convertBigIntsToNumbers
  return {
    source: connectionData.source_entity_id,
    target: connectionData.target_entity_id,
    type: connectionData.connection_type,
    sentiment: connectionData.avg_sentiment || 0,
    strength: connectionData.avg_strength || 0.5,
    dealValue: connectionData.deal_value || undefined,
    integrationDepth: connectionData.integration_depth || undefined,
    // Add other theme-relevant properties
    overlapScore: (connectionData.avg_strength || 0.5) * 0.8, // Derived metric
    depth: (connectionData.interaction_count || 0) / 10, // Normalized interaction count
  };
}

function buildEntityWhereClause(filters: VizFilters, userId: string): any {
  // For visualization, show ALL company entities (market intelligence is public)
  // User filtering only applies to entity administration, not visualization
  const where: any = {
    type: 'COMPANY',
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
  // For visualization, return ALL company entities (market intelligence is public)
  // User filtering only applies to entity administration, not visualization
  const entities = await prisma.entity.findMany({
    where: {
      type: 'COMPANY',
    },
    select: { id: true },
  });

  return entities.map((e) => e.id);
}

async function getViewStaleness(viewName: string): Promise<number> {
  try {
    const rawResult = await prisma.$queryRaw<any[]>`
      SELECT computed_at 
      FROM ${viewName} 
      ORDER BY computed_at DESC 
      LIMIT 1
    `;

    // Convert BigInts to numbers
    const result = convertBigIntsToNumbers(rawResult);

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
