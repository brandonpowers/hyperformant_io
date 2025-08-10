/**
 * Data Source Management Utilities
 * 
 * Provides utilities for managing external data sources, ingestion runs,
 * and signal generation from various APIs and services.
 */

import { PrismaClient, DataSource, DataSourceType, SignalType, SignalCategory, IngestionRun, RunStatus } from '@prisma/client';

// Data source configuration types
export interface DataSourceConfig {
  name: string;
  type: DataSourceType;
  endpoint?: string;
  apiKey?: string;
  rateLimits?: {
    requests: number;
    period: 'minute' | 'hour' | 'day';
    burst?: number;
  };
  trustScore: number;
  signalTypes: SignalType[];
  categories: SignalCategory[];
  metadata?: Record<string, any>;
}

// High-impact data source configurations
export const DATA_SOURCE_CONFIGS: DataSourceConfig[] = [
  // Apollo.io Integration
  {
    name: 'Apollo.io CRM API',
    type: 'APOLLO_CRM',
    endpoint: 'https://api.apollo.io/v1',
    rateLimits: { requests: 200, period: 'hour', burst: 10 },
    trustScore: 0.95,
    signalTypes: ['CUSTOMER_WIN', 'CUSTOMER_LOSS', 'EXEC_HIRE', 'EXEC_DEPARTURE', 'FUNDING_ROUND'],
    categories: ['DEAL', 'TALENT', 'MARKET'],
    metadata: {
      description: 'Primary CRM with 275M+ contacts',
      coverage: 'B2B contacts, company data, sequences, analytics'
    }
  },
  
  {
    name: 'Apollo.io Webhooks',
    type: 'APOLLO_WEBHOOK',
    trustScore: 0.95,
    signalTypes: ['CUSTOMER_WIN', 'CUSTOMER_LOSS', 'SOCIAL_POST'],
    categories: ['DEAL', 'ENGAGEMENT'],
    metadata: {
      description: 'Real-time Apollo.io webhook events',
      coverage: 'Sequence replies, opens, clicks, conversions'
    }
  },

  // Financial Intelligence
  {
    name: 'Alpha Vantage API',
    type: 'FINANCIAL_API',
    endpoint: 'https://www.alphavantage.co/query',
    rateLimits: { requests: 5, period: 'minute' },
    trustScore: 0.95,
    signalTypes: ['EARNINGS_REPORT', 'ANALYST_FORECAST', 'IPO', 'MARKET_SHARE_CHANGE'],
    categories: ['MARKET', 'COMPETITIVE'],
    metadata: {
      description: 'Financial market data and news',
      coverage: 'Public companies, earnings, financial metrics'
    }
  },

  {
    name: 'Crunchbase API',
    type: 'FINANCIAL_API',
    endpoint: 'https://api.crunchbase.com/api/v4',
    rateLimits: { requests: 200, period: 'hour' },
    trustScore: 0.90,
    signalTypes: ['FUNDING_ROUND', 'ACQUISITION', 'EXEC_HIRE', 'IPO'],
    categories: ['DEAL', 'TALENT', 'MARKET'],
    metadata: {
      description: 'Startup and private company intelligence',
      coverage: 'Funding, M&A, leadership changes, valuations'
    }
  },

  // Social Intelligence
  {
    name: 'Reddit API',
    type: 'SOCIAL_API',
    endpoint: 'https://www.reddit.com/api/v1',
    rateLimits: { requests: 60, period: 'minute' },
    trustScore: 0.70,
    signalTypes: ['REDDIT_DISCUSSION', 'CUSTOMER_FEEDBACK', 'PRODUCT_REVIEW', 'SOCIAL_MENTION'],
    categories: ['ENGAGEMENT', 'PRODUCT', 'SENTIMENT'],
    metadata: {
      description: 'Community discussions and product feedback',
      coverage: 'Startup communities, product discussions, customer sentiment'
    }
  },

  {
    name: 'Twitter API v2',
    type: 'SOCIAL_API',
    endpoint: 'https://api.twitter.com/2',
    rateLimits: { requests: 300, period: 'minute' },
    trustScore: 0.80,
    signalTypes: ['EXEC_TWEET', 'PRODUCT_LAUNCH', 'PRESS_MENTION', 'CONTROVERSY'],
    categories: ['ENGAGEMENT', 'PRODUCT', 'RISK'],
    metadata: {
      description: 'Real-time executive communications and announcements',
      coverage: 'Executive tweets, product launches, company news'
    }
  },

  {
    name: 'HackerNews API',
    type: 'SOCIAL_API',
    endpoint: 'https://hacker-news.firebaseio.com/v0',
    rateLimits: { requests: 100, period: 'hour' },
    trustScore: 0.85,
    signalTypes: ['PRESS_MENTION', 'PRODUCT_LAUNCH', 'INNOVATION_SIGNAL'],
    categories: ['PRODUCT', 'COMPETITIVE', 'ENGAGEMENT'],
    metadata: {
      description: 'Technical community sentiment and discussions',
      coverage: 'Tech product launches, startup discussions'
    }
  },

  // Web Intelligence
  {
    name: 'SimilarWeb API',
    type: 'WEB_ANALYTICS',
    endpoint: 'https://api.similarweb.com/v1',
    rateLimits: { requests: 100, period: 'hour' },
    trustScore: 0.80,
    signalTypes: ['TRAFFIC_SPIKE', 'TRAFFIC_ANOMALY', 'SEO_RANK_CHANGE'],
    categories: ['DIGITAL', 'COMPETITIVE'],
    metadata: {
      description: 'Website analytics and competitor traffic data',
      coverage: 'Traffic metrics, audience insights, competitive benchmarks'
    }
  },

  {
    name: 'BuiltWith API',
    type: 'WEB_ANALYTICS',
    rateLimits: { requests: 200, period: 'hour' },
    trustScore: 0.75,
    signalTypes: ['TECH_STACK_CHANGE', 'WEBSITE_UPDATE', 'INTEGRATION_LAUNCH'],
    categories: ['PRODUCT', 'COMPETITIVE'],
    metadata: {
      description: 'Technology stack and infrastructure tracking',
      coverage: 'Technology adoption, platform migrations, integrations'
    }
  },

  {
    name: 'Patent Monitoring',
    type: 'PATENT_API',
    trustScore: 0.90,
    signalTypes: ['PATENT_APPLICATION', 'PATENT_FILED', 'INNOVATION_SIGNAL'],
    categories: ['INNOVATION', 'COMPETITIVE'],
    metadata: {
      description: 'Patent filings and innovation tracking',
      coverage: 'USPTO, Google Patents, innovation direction'
    }
  }
];

// Data source management class
export class DataSourceManager {
  constructor(private prisma: PrismaClient) {}

  /**
   * Initialize all data sources in the database
   */
  async initializeDataSources(): Promise<DataSource[]> {
    const sources: DataSource[] = [];
    
    for (const config of DATA_SOURCE_CONFIGS) {
      const existing = await this.prisma.dataSource.findFirst({
        where: { name: config.name }
      });

      if (!existing) {
        const source = await this.prisma.dataSource.create({
          data: {
            name: config.name,
            type: config.type,
            trustScore: config.trustScore,
            metadata: {
              ...config.metadata,
              endpoint: config.endpoint,
              rateLimits: config.rateLimits,
              signalTypes: config.signalTypes,
              categories: config.categories
            }
          }
        });
        sources.push(source);
        console.log(`✅ Created data source: ${config.name}`);
      } else {
        sources.push(existing);
        console.log(`📋 Data source exists: ${config.name}`);
      }
    }

    return sources;
  }

  /**
   * Create a new ingestion run
   */
  async createIngestionRun(
    dataSourceId: string, 
    metadata?: Record<string, any>
  ): Promise<IngestionRun> {
    return await this.prisma.ingestionRun.create({
      data: {
        dataSourceId,
        status: 'PENDING',
        metadata
      }
    });
  }

  /**
   * Update ingestion run status
   */
  async updateIngestionRun(
    runId: string,
    status: RunStatus,
    itemsIn?: number,
    itemsOut?: number,
    error?: string
  ): Promise<IngestionRun> {
    return await this.prisma.ingestionRun.update({
      where: { id: runId },
      data: {
        status,
        itemsIn,
        itemsOut,
        error,
        finishedAt: status === 'SUCCESS' || status === 'FAILED' ? new Date() : undefined
      }
    });
  }

  /**
   * Get active data sources by type
   */
  async getDataSourcesByType(type: DataSourceType): Promise<DataSource[]> {
    return await this.prisma.dataSource.findMany({
      where: { type },
      include: {
        runs: {
          take: 5,
          orderBy: { startedAt: 'desc' }
        }
      }
    });
  }

  /**
   * Get data source health metrics
   */
  async getDataSourceHealth(dataSourceId: string) {
    const runs = await this.prisma.ingestionRun.findMany({
      where: { dataSourceId },
      take: 10,
      orderBy: { startedAt: 'desc' }
    });

    const total = runs.length;
    const successful = runs.filter(r => r.status === 'SUCCESS').length;
    const failed = runs.filter(r => r.status === 'FAILED').length;
    const lastRun = runs[0];

    return {
      successRate: total > 0 ? successful / total : 0,
      failureRate: total > 0 ? failed / total : 0,
      lastRunAt: lastRun?.startedAt,
      lastStatus: lastRun?.status,
      totalRuns: total
    };
  }
}

// Signal generation utilities
export interface SignalGenerationParams {
  entityId: string;
  signalType: SignalType;
  category: SignalCategory;
  magnitude: number;
  sentimentScore?: number;
  sentimentLabel?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  summary: string;
  details?: Record<string, any>;
  source: string;
  impactRoles?: Array<{
    entityId: string;
    role: 'SUBJECT' | 'ACTOR' | 'TARGET' | 'MENTIONED';
    weight: number;
  }>;
}

export class SignalGenerator {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate a new signal from external data
   */
  async generateSignal(params: SignalGenerationParams) {
    const signal = await this.prisma.signal.create({
      data: {
        timestamp: new Date(),
        source: params.source,
        category: params.category,
        type: params.signalType,
        magnitude: params.magnitude,
        sentimentScore: params.sentimentScore,
        sentimentLabel: params.sentimentLabel,
        summary: params.summary,
        details: params.details,
        impacts: {
          create: [
            {
              entityId: params.entityId,
              role: 'SUBJECT',
              weight: 1.0
            },
            ...(params.impactRoles || [])
          ]
        }
      },
      include: {
        impacts: true
      }
    });

    console.log(`📊 Generated signal: ${params.signalType} for entity ${params.entityId}`);
    return signal;
  }

  /**
   * Bulk generate signals from API data
   */
  async bulkGenerateSignals(signals: SignalGenerationParams[]) {
    const results = [];
    
    for (const signalParams of signals) {
      try {
        const signal = await this.generateSignal(signalParams);
        results.push({ success: true, signal });
      } catch (error) {
        console.error(`❌ Failed to generate signal: ${signalParams.signalType}`, error);
        results.push({ success: false, error: error.message, params: signalParams });
      }
    }

    return results;
  }
}

// Export singleton instances
export const createDataSourceManager = (prisma: PrismaClient) => new DataSourceManager(prisma);
export const createSignalGenerator = (prisma: PrismaClient) => new SignalGenerator(prisma);