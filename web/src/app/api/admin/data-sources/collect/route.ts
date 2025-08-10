/**
 * Manual Data Collection API
 * 
 * Admin endpoint to manually trigger data collection from specific sources.
 * Useful for testing and on-demand data gathering.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { createApolloClient, createApolloDataProcessor } from '@/lib/data-sources/apollo';
import { createDataSourceManager } from '@/lib/data-sources';
// Temporarily comment out auth import until we create the file
// import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();
const dataSourceManager = createDataSourceManager(prisma);

export async function POST(request: NextRequest) {
  try {
    // TEMPORARY: Allow testing without auth (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 Development mode: bypassing auth for testing');
    } else {
      // TODO: Re-enable authentication in production
      // const session = await getServerSession(authOptions);
      // if (!session || !session.user?.isAdmin) {
      //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // }
    }

    const { sourceType, action, params } = await request.json();

    console.log(`🔄 Manual data collection: ${sourceType} - ${action}`);

    // Get data source configuration
    const dataSource = await prisma.dataSource.findFirst({
      where: { type: sourceType }
    });

    if (!dataSource) {
      return NextResponse.json({ 
        error: `Data source not found: ${sourceType}` 
      }, { status: 404 });
    }

    // Create ingestion run
    const ingestionRun = await dataSourceManager.createIngestionRun(
      dataSource.id,
      { manual_trigger: true, action, params }
    );

    let results: any = null;

    try {
      // Handle different data collection actions
      switch (sourceType) {
        case 'APOLLO_CRM':
          results = await handleApolloCollection(action, params);
          break;
        
        case 'FINANCIAL_API':
          results = await handleFinancialCollection(action, params);
          break;
          
        case 'SOCIAL_API':
          results = await handleSocialCollection(action, params);
          break;
          
        default:
          throw new Error(`Unsupported source type: ${sourceType}`);
      }

      // Update ingestion run as successful
      await dataSourceManager.updateIngestionRun(
        ingestionRun.id,
        'SUCCESS',
        results.itemsIn || 0,
        results.itemsOut || 0
      );

      console.log(`✅ Manual collection completed: ${sourceType} - ${action}`);

      return NextResponse.json({
        success: true,
        runId: ingestionRun.id,
        results,
        timestamp: new Date().toISOString()
      });

    } catch (processingError) {
      console.error('❌ Manual collection error:', processingError);

      // Update ingestion run as failed
      await dataSourceManager.updateIngestionRun(
        ingestionRun.id,
        'FAILED',
        0,
        0,
        processingError.message
      );

      return NextResponse.json({ 
        error: 'Collection failed',
        details: processingError.message,
        runId: ingestionRun.id 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Manual collection handler error:', error);
    return NextResponse.json({ 
      error: 'Request processing failed',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * Handle Apollo.io data collection
 */
async function handleApolloCollection(action: string, params: any) {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    throw new Error('Apollo.io API key not configured');
  }

  const apolloClient = createApolloClient(apiKey);
  const apolloProcessor = createApolloDataProcessor(prisma);

  switch (action) {
    case 'discover_companies':
      const criteria = {
        industries: params.industries || [],
        employeeRanges: params.employeeRanges || ['1-10', '11-50', '51-200'],
        keywords: params.keywords || ['saas', 'software', 'startup'],
        limit: params.limit || 25
      };
      
      const entityIds = await apolloProcessor.discoverTargetCompanies(apolloClient, criteria);
      
      return {
        action: 'discover_companies',
        itemsIn: 1,
        itemsOut: entityIds.length,
        entityIds,
        criteria
      };

    case 'sync_organization':
      if (!params.organizationId && !params.domain) {
        throw new Error('organizationId or domain required');
      }
      
      let org;
      if (params.organizationId) {
        org = await apolloClient.getOrganization(params.organizationId);
      } else {
        const searchResult = await apolloClient.searchOrganizations({ domain: params.domain });
        if (searchResult.organizations.length === 0) {
          throw new Error(`No organization found for domain: ${params.domain}`);
        }
        org = searchResult.organizations[0];
      }
      
      const entityId = await apolloProcessor.processOrganization(org);
      
      return {
        action: 'sync_organization',
        itemsIn: 1,
        itemsOut: 1,
        entityId,
        organization: org
      };

    case 'sync_sequence_metrics':
      if (!params.sequenceId) {
        throw new Error('sequenceId required');
      }
      
      await apolloProcessor.syncSequenceMetrics(apolloClient, params.sequenceId);
      
      return {
        action: 'sync_sequence_metrics',
        itemsIn: 1,
        itemsOut: 1,
        sequenceId: params.sequenceId
      };

    default:
      throw new Error(`Unsupported Apollo action: ${action}`);
  }
}

/**
 * Handle Financial API data collection (placeholder)
 */
async function handleFinancialCollection(action: string, params: any) {
  // TODO: Implement financial API collection
  throw new Error('Financial API collection not yet implemented');
}

/**
 * Handle Social API data collection (placeholder)
 */
async function handleSocialCollection(action: string, params: any) {
  // TODO: Implement social API collection
  throw new Error('Social API collection not yet implemented');
}

/**
 * Get available collection actions for each source type
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actions = {
      APOLLO_CRM: [
        {
          action: 'discover_companies',
          description: 'Discover new target companies',
          params: {
            industries: 'Array of industry keywords (optional)',
            employeeRanges: 'Array of employee ranges (optional)',
            keywords: 'Array of search keywords (optional)',
            limit: 'Number of companies to discover (default: 25)'
          }
        },
        {
          action: 'sync_organization',
          description: 'Sync specific organization data',
          params: {
            organizationId: 'Apollo organization ID (optional)',
            domain: 'Company domain (optional, used if no organizationId)'
          }
        },
        {
          action: 'sync_sequence_metrics',
          description: 'Update sequence performance metrics',
          params: {
            sequenceId: 'Apollo sequence ID (required)'
          }
        }
      ],
      FINANCIAL_API: [
        {
          action: 'sync_earnings',
          description: 'Sync earnings reports (not yet implemented)',
          params: {}
        }
      ],
      SOCIAL_API: [
        {
          action: 'collect_mentions',
          description: 'Collect social media mentions (not yet implemented)',
          params: {}
        }
      ]
    };

    return NextResponse.json({
      availableActions: actions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching collection actions:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch actions',
      details: error.message 
    }, { status: 500 });
  }
}