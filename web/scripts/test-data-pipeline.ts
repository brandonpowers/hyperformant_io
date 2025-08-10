/**
 * Data Pipeline Test Script
 * 
 * Test script to initialize data sources and verify the data collection pipeline.
 * Run this after setting up the schema to test everything works.
 */

import { PrismaClient } from '@prisma/client';
import { createDataSourceManager, createSignalGenerator } from '../src/lib/data-sources';
import { createApolloDataProcessor } from '../src/lib/data-sources/apollo';

const prisma = new PrismaClient();
const dataSourceManager = createDataSourceManager(prisma);
const signalGenerator = createSignalGenerator(prisma);
const apolloProcessor = createApolloDataProcessor(prisma);

async function testDataPipeline() {
  console.log('🧪 Testing Hyperformant Data Pipeline...\n');

  try {
    // Step 1: Initialize data sources
    console.log('1️⃣ Initializing data sources...');
    const dataSources = await dataSourceManager.initializeDataSources();
    console.log(`   ✅ Initialized ${dataSources.length} data sources\n`);

    // Step 2: Test signal generation
    console.log('2️⃣ Testing signal generation...');
    
    // Find or create a test entity
    let testEntity = await prisma.entity.findFirst({
      where: { name: 'Test Company' }
    });

    if (!testEntity) {
      testEntity = await prisma.entity.create({
        data: {
          type: 'COMPANY',
          name: 'Test Company',
          domain: 'test-company.com',
          employees: 25,
          description: 'Test entity for data pipeline validation'
        }
      });
      console.log(`   ✅ Created test entity: ${testEntity.id}`);
    } else {
      console.log(`   📋 Using existing test entity: ${testEntity.id}`);
    }

    // Generate test signals
    const testSignals = [
      {
        entityId: testEntity.id,
        signalType: 'FUNDING_ROUND' as const,
        category: 'DEAL' as const,
        magnitude: 0.8,
        sentimentScore: 0.6,
        sentimentLabel: 'POSITIVE' as const,
        summary: 'Test funding round signal',
        source: 'Test Pipeline',
        details: { amount: 1000000, series: 'A' }
      },
      {
        entityId: testEntity.id,
        signalType: 'PRODUCT_LAUNCH' as const,
        category: 'PRODUCT' as const,
        magnitude: 0.6,
        sentimentScore: 0.4,
        sentimentLabel: 'POSITIVE' as const,
        summary: 'Test product launch signal',
        source: 'Test Pipeline',
        details: { product: 'Test Product v2.0' }
      },
      {
        entityId: testEntity.id,
        signalType: 'SOCIAL_MENTION' as const,
        category: 'ENGAGEMENT' as const,
        magnitude: 0.3,
        sentimentScore: 0.1,
        sentimentLabel: 'NEUTRAL' as const,
        summary: 'Test social media mention',
        source: 'Test Pipeline',
        details: { platform: 'Twitter', mentions: 15 }
      }
    ];

    const signalResults = await signalGenerator.bulkGenerateSignals(testSignals);
    const successfulSignals = signalResults.filter(r => r.success).length;
    console.log(`   ✅ Generated ${successfulSignals}/${testSignals.length} test signals\n`);

    // Step 3: Test Apollo.io webhook processing
    console.log('3️⃣ Testing Apollo.io webhook processing...');
    
    const testWebhookEvent = {
      type: 'contact.replied' as const,
      data: {
        contact: {
          id: 'test-contact-123',
          email: 'test@test-company.com',
          first_name: 'John',
          last_name: 'Doe',
          title: 'CEO',
          organization_id: 'test-org-123',
          organization_name: 'Test Company'
        },
        organization: {
          id: 'test-org-123',
          name: 'Test Company',
          website_url: 'test-company.com',
          num_employees: 25,
          industry: 'Software'
        },
        sequence: {
          id: 'test-sequence-123',
          name: 'Test Outreach Sequence'
        },
        reply: {
          contact_id: 'test-contact-123',
          sequence_id: 'test-sequence-123',
          step_id: 'step-1',
          email_thread_id: 'thread-123',
          reply_body: 'Thanks for reaching out! Very interested.',
          replied_at: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }
    };

    await apolloProcessor.processWebhookEvent(testWebhookEvent);
    console.log('   ✅ Processed test webhook event\n');

    // Step 4: Create ingestion run
    console.log('4️⃣ Testing ingestion run tracking...');
    
    const apolloDataSource = dataSources.find(ds => ds.type === 'APOLLO_CRM');
    if (apolloDataSource) {
      const ingestionRun = await dataSourceManager.createIngestionRun(
        apolloDataSource.id,
        { test: true, pipeline: 'validation' }
      );
      
      await dataSourceManager.updateIngestionRun(
        ingestionRun.id,
        'SUCCESS',
        testSignals.length,
        successfulSignals
      );
      
      console.log(`   ✅ Created and completed ingestion run: ${ingestionRun.id}\n`);
    }

    // Step 5: Test data source health
    console.log('5️⃣ Testing data source health metrics...');
    
    for (const source of dataSources.slice(0, 3)) { // Test first 3 sources
      const health = await dataSourceManager.getDataSourceHealth(source.id);
      console.log(`   📊 ${source.name}: ${Math.round(health.successRate * 100)}% success rate`);
    }
    console.log('');

    // Step 6: Count generated data
    console.log('6️⃣ Validating data generation...');
    
    const signalCount = await prisma.signal.count();
    const entityCount = await prisma.entity.count();
    const connectionCount = await prisma.connection.count();
    const runCount = await prisma.ingestionRun.count();
    
    console.log(`   📈 Signals: ${signalCount}`);
    console.log(`   🏢 Entities: ${entityCount}`);
    console.log(`   🔗 Connections: ${connectionCount}`);
    console.log(`   ⚙️ Ingestion runs: ${runCount}\n`);

    // Step 7: Test materialized view refresh (if views exist)
    console.log('7️⃣ Testing materialized view refresh...');
    
    try {
      // Check if materialized views exist
      const viewExists = await prisma.$queryRaw`
        SELECT matviewname FROM pg_matviews WHERE matviewname = 'mv_signal_rollup'
      `;
      
      if (Array.isArray(viewExists) && viewExists.length > 0) {
        await prisma.$executeRaw`REFRESH MATERIALIZED VIEW mv_signal_rollup`;
        await prisma.$executeRaw`REFRESH MATERIALIZED VIEW mv_latest_metric`;
        await prisma.$executeRaw`REFRESH MATERIALIZED VIEW mv_connection_rollup`;
        console.log('   ✅ Refreshed materialized views');
        
        // Check row counts
        const signalRollupCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM mv_signal_rollup`;
        console.log(`   📊 Signal rollup rows: ${signalRollupCount[0]?.count || 0}`);
      } else {
        console.log('   ⚠️ Materialized views not found (run create_materialized_views.sql first)');
      }
    } catch (viewError) {
      console.log(`   ⚠️ Materialized views error: ${viewError.message}`);
    }
    console.log('');

    // Step 8: Summary
    console.log('✅ Data Pipeline Test Completed Successfully!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Set up Apollo.io API key in .env.local');
    console.log('   2. Configure N8N workflows');
    console.log('   3. Set up webhook endpoints');
    console.log('   4. Add financial and social API integrations');
    console.log('   5. Test 3D visualization with real data');

  } catch (error) {
    console.error('❌ Data pipeline test failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testDataPipeline()
    .then(() => {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

export default testDataPipeline;