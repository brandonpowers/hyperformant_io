/**
 * Data Sources Initialization API
 * 
 * Admin endpoint to initialize all configured data sources in the database.
 * This should be run once during setup or when adding new data source types.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { createDataSourceManager } from '@/lib/data-sources';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();
const dataSourceManager = createDataSourceManager(prisma);

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔧 Initializing data sources...');

    // Initialize all configured data sources
    const dataSources = await dataSourceManager.initializeDataSources();

    // Get health metrics for each source
    const healthMetrics = await Promise.all(
      dataSources.map(async (source) => {
        const health = await dataSourceManager.getDataSourceHealth(source.id);
        return {
          id: source.id,
          name: source.name,
          type: source.type,
          trustScore: source.trustScore,
          ...health
        };
      })
    );

    console.log(`✅ Initialized ${dataSources.length} data sources`);

    return NextResponse.json({
      success: true,
      message: `Initialized ${dataSources.length} data sources`,
      dataSources: healthMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error initializing data sources:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize data sources',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * Get current data sources status
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all data sources with recent runs
    const dataSources = await prisma.dataSource.findMany({
      include: {
        runs: {
          take: 5,
          orderBy: { startedAt: 'desc' }
        }
      }
    });

    // Calculate health metrics
    const healthMetrics = await Promise.all(
      dataSources.map(async (source) => {
        const health = await dataSourceManager.getDataSourceHealth(source.id);
        return {
          id: source.id,
          name: source.name,
          type: source.type,
          trustScore: source.trustScore,
          metadata: source.metadata,
          recentRuns: source.runs,
          ...health
        };
      })
    );

    return NextResponse.json({
      dataSources: healthMetrics,
      totalSources: dataSources.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching data sources:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch data sources',
      details: error.message 
    }, { status: 500 });
  }
}