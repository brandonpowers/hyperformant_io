/**
 * Materialized View Refresh Strategy
 *
 * Handles refreshing of visualization materialized views
 * with proper error handling, monitoring, and scheduling
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RefreshResult {
  view: string;
  success: boolean;
  duration: number;
  recordCount?: number;
  error?: string;
  staleness?: number;
}

export interface RefreshSummary {
  totalViews: number;
  successful: number;
  failed: number;
  totalDuration: number;
  results: RefreshResult[];
  timestamp: Date;
}

const MATERIALIZED_VIEWS = [
  'mv_latest_metric',
  'mv_latest_index',
  'mv_signal_rollup',
  'mv_connection_rollup',
  'mv_entity_viz_summary', // Complete entity profiles for visualization
];

/**
 * Refresh all visualization materialized views
 */
export async function refreshVisualizationViews(): Promise<RefreshSummary> {
  const startTime = Date.now();
  const results: RefreshResult[] = [];

  console.log('🔄 Starting materialized view refresh...');

  for (const viewName of MATERIALIZED_VIEWS) {
    const result = await refreshSingleView(viewName);
    results.push(result);

    if (result.success) {
      console.log(
        `✅ ${viewName}: ${result.duration}ms, ${result.recordCount} records`,
      );
    } else {
      console.error(`❌ ${viewName}: ${result.error}`);
    }
  }

  const summary: RefreshSummary = {
    totalViews: MATERIALIZED_VIEWS.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    totalDuration: Date.now() - startTime,
    results,
    timestamp: new Date(),
  };

  // Log summary to database for monitoring
  await logRefreshSummary(summary);

  console.log(
    `🏁 Refresh completed: ${summary.successful}/${summary.totalViews} successful in ${summary.totalDuration}ms`,
  );

  return summary;
}

/**
 * Refresh a single materialized view
 */
async function refreshSingleView(viewName: string): Promise<RefreshResult> {
  const startTime = Date.now();

  try {
    // Use CONCURRENTLY for non-blocking refresh
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`;

    const duration = Date.now() - startTime;

    // Get record count
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM ${viewName}
    `;
    const recordCount = Number(countResult[0].count);

    // Get staleness (time since computed_at)
    const stalenessResult = await prisma.$queryRaw<
      [{ staleness_seconds: number }]
    >`
      SELECT EXTRACT(EPOCH FROM (NOW() - MAX(computed_at))) as staleness_seconds
      FROM ${viewName}
    `;
    const staleness = stalenessResult[0]?.staleness_seconds || 0;

    return {
      view: viewName,
      success: true,
      duration,
      recordCount,
      staleness,
    };
  } catch (error) {
    return {
      view: viewName,
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if views need refreshing based on staleness threshold
 */
export async function checkViewStaleness(
  maxStaleSeconds: number = 1800,
): Promise<{
  needsRefresh: boolean;
  views: Array<{ view: string; staleness: number; stale: boolean }>;
}> {
  const viewStatuses = [];

  for (const viewName of MATERIALIZED_VIEWS) {
    try {
      const result = await prisma.$queryRaw<[{ staleness_seconds: number }]>`
        SELECT EXTRACT(EPOCH FROM (NOW() - MAX(computed_at))) as staleness_seconds
        FROM ${viewName}
      `;

      const staleness = result[0]?.staleness_seconds || Infinity;
      const stale = staleness > maxStaleSeconds;

      viewStatuses.push({
        view: viewName,
        staleness,
        stale,
      });
    } catch (error) {
      // If we can't check staleness, assume it's stale
      viewStatuses.push({
        view: viewName,
        staleness: Infinity,
        stale: true,
      });
    }
  }

  return {
    needsRefresh: viewStatuses.some((v) => v.stale),
    views: viewStatuses,
  };
}

/**
 * Smart refresh - only refresh if needed
 */
export async function smartRefresh(
  maxStaleSeconds: number = 1800,
): Promise<RefreshSummary | null> {
  const staleness = await checkViewStaleness(maxStaleSeconds);

  if (!staleness.needsRefresh) {
    console.log('📊 Views are fresh, no refresh needed');
    return null;
  }

  console.log(
    `📊 Found stale views: ${staleness.views
      .filter((v) => v.stale)
      .map((v) => v.view)
      .join(', ')}`,
  );
  return await refreshVisualizationViews();
}

/**
 * Log refresh summary to database for monitoring
 */
async function logRefreshSummary(summary: RefreshSummary): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO system_log (event_type, message, metadata, created_at)
      VALUES (
        'MATERIALIZED_VIEW_REFRESH',
        ${`Refreshed ${summary.successful}/${summary.totalViews} views in ${summary.totalDuration}ms`},
        ${JSON.stringify({
          summary,
          performance: {
            totalDuration: summary.totalDuration,
            avgDuration: summary.totalDuration / summary.totalViews,
            successRate: summary.successful / summary.totalViews,
          },
        })},
        NOW()
      )
    `;
  } catch (error) {
    console.error('Failed to log refresh summary:', error);
  }
}

/**
 * Initialize materialized views (first-time setup)
 */
export async function initializeMaterializedViews(): Promise<RefreshSummary> {
  console.log('🚀 Initializing materialized views for first time...');

  // For first-time setup, we need to create the initial data
  // This is different from refresh as views might be empty
  const startTime = Date.now();
  const results: RefreshResult[] = [];

  for (const viewName of MATERIALIZED_VIEWS) {
    const viewStartTime = Date.now();

    try {
      // Use regular REFRESH for initial population (not CONCURRENTLY)
      await prisma.$executeRaw`REFRESH MATERIALIZED VIEW ${viewName}`;

      const duration = Date.now() - viewStartTime;
      const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM ${viewName}
      `;
      const recordCount = Number(countResult[0].count);

      results.push({
        view: viewName,
        success: true,
        duration,
        recordCount,
        staleness: 0,
      });

      console.log(
        `✅ Initialized ${viewName}: ${recordCount} records in ${duration}ms`,
      );
    } catch (error) {
      results.push({
        view: viewName,
        success: false,
        duration: Date.now() - viewStartTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      console.error(`❌ Failed to initialize ${viewName}:`, error);
    }
  }

  const summary: RefreshSummary = {
    totalViews: MATERIALIZED_VIEWS.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    totalDuration: Date.now() - startTime,
    results,
    timestamp: new Date(),
  };

  await logRefreshSummary(summary);

  console.log(
    `🏁 Initialization completed: ${summary.successful}/${summary.totalViews} successful`,
  );

  return summary;
}

/**
 * Get refresh history from logs
 */
export async function getRefreshHistory(limit: number = 10): Promise<
  Array<{
    timestamp: Date;
    duration: number;
    successful: number;
    total: number;
    successRate: number;
  }>
> {
  try {
    const logs = await prisma.$queryRaw<
      Array<{
        created_at: Date;
        metadata: any;
      }>
    >`
      SELECT created_at, metadata
      FROM system_log
      WHERE event_type = 'MATERIALIZED_VIEW_REFRESH'
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return logs.map((log) => {
      const summary = log.metadata?.summary;
      return {
        timestamp: log.created_at,
        duration: summary?.totalDuration || 0,
        successful: summary?.successful || 0,
        total: summary?.totalViews || 0,
        successRate: summary ? summary.successful / summary.totalViews : 0,
      };
    });
  } catch (error) {
    console.error('Failed to get refresh history:', error);
    return [];
  }
}

/**
 * Schedule automatic refresh (for use with cron/N8N)
 */
export async function scheduleRefresh(
  intervalMinutes: number = 30,
): Promise<void> {
  console.log(
    `⏰ Setting up automatic refresh every ${intervalMinutes} minutes`,
  );

  const refresh = async () => {
    try {
      await smartRefresh(intervalMinutes * 60); // Convert to seconds
    } catch (error) {
      console.error('Scheduled refresh failed:', error);
    }
  };

  // Initial refresh
  await refresh();

  // Schedule subsequent refreshes
  setInterval(refresh, intervalMinutes * 60 * 1000);

  console.log(
    `✅ Automatic refresh scheduled every ${intervalMinutes} minutes`,
  );
}
