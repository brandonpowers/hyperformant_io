/**
 * Materialized Views Refresh API
 * 
 * Endpoint to refresh materialized views after data collection.
 * This ensures the 3D visualization has the latest aggregated data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// Available materialized views
const AVAILABLE_VIEWS = [
  'mv_latest_metric',
  'mv_latest_index', 
  'mv_signal_rollup',
  'mv_connection_rollup'
];

export async function POST(request: NextRequest) {
  try {
    // Check authentication (allow both admin and regular users)
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { views } = await request.json();
    const viewsToRefresh = views && Array.isArray(views) ? views : AVAILABLE_VIEWS;

    // Validate requested views
    const invalidViews = viewsToRefresh.filter(view => !AVAILABLE_VIEWS.includes(view));
    if (invalidViews.length > 0) {
      return NextResponse.json({ 
        error: `Invalid views: ${invalidViews.join(', ')}`,
        availableViews: AVAILABLE_VIEWS
      }, { status: 400 });
    }

    console.log(`🔄 Refreshing materialized views: ${viewsToRefresh.join(', ')}`);

    const results = [];
    const startTime = Date.now();

    // Refresh each view
    for (const viewName of viewsToRefresh) {
      try {
        const viewStartTime = Date.now();
        
        await prisma.$executeRaw`REFRESH MATERIALIZED VIEW ${viewName}`;
        
        const viewDuration = Date.now() - viewStartTime;
        results.push({
          view: viewName,
          status: 'success',
          duration: viewDuration
        });
        
        console.log(`✅ Refreshed ${viewName} (${viewDuration}ms)`);
        
      } catch (viewError) {
        console.error(`❌ Failed to refresh ${viewName}:`, viewError);
        results.push({
          view: viewName,
          status: 'error',
          error: viewError.message
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`📊 View refresh completed: ${successCount} success, ${errorCount} errors (${totalDuration}ms)`);

    return NextResponse.json({
      success: errorCount === 0,
      message: `Refreshed ${successCount}/${viewsToRefresh.length} views`,
      results,
      summary: {
        totalViews: viewsToRefresh.length,
        successCount,
        errorCount,
        totalDuration
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Materialized views refresh error:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh views',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * Get materialized view status and row counts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewStats = [];

    for (const viewName of AVAILABLE_VIEWS) {
      try {
        // Get row count for each view
        const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM ${viewName}`;
        const count = parseInt(result[0]?.count || '0');

        // Get last refresh timestamp (PostgreSQL specific)
        const refreshInfo = await prisma.$queryRaw`
          SELECT schemaname, matviewname, hasindexes, ispopulated, definition
          FROM pg_matviews 
          WHERE matviewname = ${viewName}
        `;

        viewStats.push({
          name: viewName,
          rowCount: count,
          populated: refreshInfo[0]?.ispopulated || false,
          hasIndexes: refreshInfo[0]?.hasindexes || false,
          status: count > 0 ? 'populated' : 'empty'
        });

      } catch (error) {
        viewStats.push({
          name: viewName,
          status: 'error',
          error: error.message
        });
      }
    }

    return NextResponse.json({
      views: viewStats,
      availableViews: AVAILABLE_VIEWS,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching view stats:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch view stats',
      details: error.message 
    }, { status: 500 });
  }
}