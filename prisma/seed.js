const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');
  envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key] = valueParts.join('=').replace(/^"(.*)"$/, '$1');
    }
  });
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@hyperformant.io' },
    update: {},
    create: {
      email: 'admin@hyperformant.io',
      username: 'admin',
      isAdmin: true,
      subscriptionStatus: 'active',
      subscriptionPlan: 'pro',
      credits: 1000,
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create Industries
  const techIndustry = await prisma.industry.upsert({
    where: { code: 'TECH' },
    update: {},
    create: {
      name: 'Technology',
      code: 'TECH',
    },
  });

  const financeIndustry = await prisma.industry.upsert({
    where: { code: 'FIN' },
    update: {},
    create: {
      name: 'Financial Services',
      code: 'FIN',
    },
  });

  console.log('✅ Created industries');

  // Create Market Segments
  const saasSegment = await prisma.marketSegment.upsert({
    where: { name_industryId: { name: 'SaaS', industryId: techIndustry.id } },
    update: {},
    create: {
      name: 'SaaS',
      industryId: techIndustry.id,
    },
  });

  const fintechSegment = await prisma.marketSegment.upsert({
    where: { name_industryId: { name: 'FinTech', industryId: financeIndustry.id } },
    update: {},
    create: {
      name: 'FinTech',
      industryId: financeIndustry.id,
    },
  });

  console.log('✅ Created market segments');

  // Create Hyperformant as the primary company
  const hyperformant = await prisma.entity.upsert({
    where: { domain: 'hyperformant.co' },
    update: {},
    create: {
      type: 'COMPANY',
      name: 'Hyperformant',
      domain: 'hyperformant.co',
      foundedAt: new Date('2023-01-01'),
      hqCountry: 'US',
      hqRegion: 'North America',
      employees: 12,
      revenue: '$1M-$5M',
      description: 'AI-powered B2B automation and consulting pipeline system',
      isUserCompany: true,
      industryId: techIndustry.id,
      marketSegmentId: saasSegment.id,
      createdByUserId: adminUser.id,
    },
  });

  console.log('✅ Created Hyperformant entity:', hyperformant.name);

  // Create competitor companies
  const competitors = [
    {
      name: 'Salesforce',
      domain: 'salesforce.com',
      employees: 73000,
      revenue: '$30B+',
      description: 'Cloud-based CRM platform',
      fundedAt: new Date('1999-03-08'),
    },
    {
      name: 'HubSpot',
      domain: 'hubspot.com',
      employees: 7000,
      revenue: '$1.7B',
      description: 'Inbound marketing and sales platform',
      fundedAt: new Date('2006-06-01'),
    },
    {
      name: 'Apollo.io',
      domain: 'apollo.io',
      employees: 800,
      revenue: '$100M',
      description: 'Sales intelligence and engagement platform',
      fundedAt: new Date('2015-01-01'),
    },
    {
      name: 'Outreach',
      domain: 'outreach.io',
      employees: 1200,
      revenue: '$200M',
      description: 'Sales engagement platform',
      fundedAt: new Date('2011-01-01'),
    },
    {
      name: 'Gong',
      domain: 'gong.io',
      employees: 1500,
      revenue: '$300M',
      description: 'Revenue intelligence platform',
      fundedAt: new Date('2015-06-01'),
    },
  ];

  const competitorEntities = [];
  for (const comp of competitors) {
    const entity = await prisma.entity.upsert({
      where: { domain: comp.domain },
      update: {},
      create: {
        type: 'COMPANY',
        name: comp.name,
        domain: comp.domain,
        foundedAt: comp.fundedAt,
        hqCountry: 'US',
        hqRegion: 'North America',
        employees: comp.employees,
        revenue: comp.revenue,
        description: comp.description,
        isUserCompany: false,
        industryId: techIndustry.id,
        marketSegmentId: saasSegment.id,
      },
    });
    competitorEntities.push(entity);
  }

  console.log('✅ Created competitor entities');

  // Create metric definitions
  const revenueMetric = await prisma.metricDefinition.upsert({
    where: { key: 'monthly_revenue' },
    update: {},
    create: {
      key: 'monthly_revenue',
      kind: 'FINANCIAL',
      unit: 'USD',
      description: 'Monthly recurring revenue',
    },
  });

  const trafficMetric = await prisma.metricDefinition.upsert({
    where: { key: 'website_traffic' },
    update: {},
    create: {
      key: 'website_traffic',
      kind: 'DIGITAL',
      unit: 'visits',
      description: 'Monthly website visits',
    },
  });

  const sentimentMetric = await prisma.metricDefinition.upsert({
    where: { key: 'brand_sentiment' },
    update: {},
    create: {
      key: 'brand_sentiment',
      kind: 'SENTIMENT',
      unit: 'score',
      description: 'Brand sentiment score (-1 to 1)',
    },
  });

  console.log('✅ Created metric definitions');

  // Create sample metrics for Hyperformant
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Create sample metrics for Hyperformant using upsert to avoid conflicts
  await prisma.metricPoint.upsert({
    where: {
      entityId_metricDefinitionId_timestamp_window: {
        entityId: hyperformant.id,
        metricDefinitionId: revenueMetric.id,
        timestamp: lastMonth,
        window: 'MONTH',
      },
    },
    update: {},
    create: {
      entityId: hyperformant.id,
      metricDefinitionId: revenueMetric.id,
      timestamp: lastMonth,
      window: 'MONTH',
      value: 85000,
      source: 'internal',
    },
  });

  await prisma.metricPoint.upsert({
    where: {
      entityId_metricDefinitionId_timestamp_window: {
        entityId: hyperformant.id,
        metricDefinitionId: revenueMetric.id,
        timestamp: thisMonth,
        window: 'MONTH',
      },
    },
    update: {},
    create: {
      entityId: hyperformant.id,
      metricDefinitionId: revenueMetric.id,
      timestamp: thisMonth,
      window: 'MONTH',
      value: 120000,
      source: 'internal',
    },
  });

  await prisma.metricPoint.upsert({
    where: {
      entityId_metricDefinitionId_timestamp_window: {
        entityId: hyperformant.id,
        metricDefinitionId: trafficMetric.id,
        timestamp: lastMonth,
        window: 'MONTH',
      },
    },
    update: {},
    create: {
      entityId: hyperformant.id,
      metricDefinitionId: trafficMetric.id,
      timestamp: lastMonth,
      window: 'MONTH',
      value: 25000,
      source: 'analytics',
    },
  });

  await prisma.metricPoint.upsert({
    where: {
      entityId_metricDefinitionId_timestamp_window: {
        entityId: hyperformant.id,
        metricDefinitionId: trafficMetric.id,
        timestamp: thisMonth,
        window: 'MONTH',
      },
    },
    update: {},
    create: {
      entityId: hyperformant.id,
      metricDefinitionId: trafficMetric.id,
      timestamp: thisMonth,
      window: 'MONTH',
      value: 38000,
      source: 'analytics',
    },
  });

  await prisma.metricPoint.upsert({
    where: {
      entityId_metricDefinitionId_timestamp_window: {
        entityId: hyperformant.id,
        metricDefinitionId: sentimentMetric.id,
        timestamp: thisMonth,
        window: 'MONTH',
      },
    },
    update: {},
    create: {
      entityId: hyperformant.id,
      metricDefinitionId: sentimentMetric.id,
      timestamp: thisMonth,
      window: 'MONTH',
      value: 0.65,
      source: 'sentiment_analysis',
    },
  });

  // Create metrics for competitor entities
  for (const entity of competitorEntities) {
    // Revenue metrics
    await prisma.metricPoint.upsert({
      where: {
        entityId_metricDefinitionId_timestamp_window: {
          entityId: entity.id,
          metricDefinitionId: revenueMetric.id,
          timestamp: thisMonth,
          window: 'MONTH',
        },
      },
      update: {},
      create: {
        entityId: entity.id,
        metricDefinitionId: revenueMetric.id,
        timestamp: thisMonth,
        window: 'MONTH',
        value: entity.name === 'Salesforce' ? 8500000 : // $8.5M monthly
               entity.name === 'HubSpot' ? 142000 : // $142K monthly  
               entity.name === 'Apollo.io' ? 8300 : // $8.3K monthly
               entity.name === 'Outreach' ? 16700 : // $16.7K monthly
               entity.name === 'Gong' ? 25000 : 50000, // $25K-50K monthly
        source: 'external_estimate',
      },
    });

    // Traffic metrics
    await prisma.metricPoint.upsert({
      where: {
        entityId_metricDefinitionId_timestamp_window: {
          entityId: entity.id,
          metricDefinitionId: trafficMetric.id,
          timestamp: thisMonth,
          window: 'MONTH',
        },
      },
      update: {},
      create: {
        entityId: entity.id,
        metricDefinitionId: trafficMetric.id,
        timestamp: thisMonth,
        window: 'MONTH',
        value: entity.name === 'Salesforce' ? 2500000 : // 2.5M visits
               entity.name === 'HubSpot' ? 1800000 : // 1.8M visits
               entity.name === 'Apollo.io' ? 850000 : // 850K visits
               entity.name === 'Outreach' ? 450000 : // 450K visits
               entity.name === 'Gong' ? 320000 : 100000, // 320K-100K visits
        source: 'web_analytics',
      },
    });

    // Sentiment metrics
    await prisma.metricPoint.upsert({
      where: {
        entityId_metricDefinitionId_timestamp_window: {
          entityId: entity.id,
          metricDefinitionId: sentimentMetric.id,
          timestamp: thisMonth,
          window: 'MONTH',
        },
      },
      update: {},
      create: {
        entityId: entity.id,
        metricDefinitionId: sentimentMetric.id,
        timestamp: thisMonth,
        window: 'MONTH',
        value: entity.name === 'Salesforce' ? 0.4 : // Mixed sentiment  
               entity.name === 'HubSpot' ? 0.7 : // Positive
               entity.name === 'Apollo.io' ? 0.6 : // Positive
               entity.name === 'Outreach' ? 0.3 : // Mixed
               entity.name === 'Gong' ? 0.8 : 0.5, // Very positive to neutral
        source: 'sentiment_analysis',
      },
    });
  }

  console.log('✅ Created competitor metrics');

  // Create index definitions for visualization
  const indexDefinitions = [
    {
      key: 'momentum',
      name: 'Market Momentum',
      description: 'Growth velocity and market traction',
    },
    {
      key: 'techVelocity', 
      name: 'Tech Velocity',
      description: 'Innovation and technical advancement speed',
    },
    {
      key: 'mindshare',
      name: 'Market Mindshare',
      description: 'Brand awareness and market presence',
    },
    {
      key: 'threat',
      name: 'Competitive Threat',
      description: 'Threat level to user company',
    },
    {
      key: 'growth',
      name: 'Growth Score',
      description: 'Overall growth trajectory',
    }
  ];

  const createdIndices = [];
  for (const indexDef of indexDefinitions) {
    const index = await prisma.indexDefinition.upsert({
      where: { key: indexDef.key },
      update: {},
      create: indexDef,
    });
    createdIndices.push(index);
  }

  console.log('✅ Created index definitions');

  // Create index values for all entities
  const allEntities = [hyperformant, ...competitorEntities];
  for (const entity of allEntities) {
    for (const indexDef of createdIndices) {
      let value;
      const isUserCompany = entity.id === hyperformant.id;
      
      switch (indexDef.key) {
        case 'momentum':
          value = isUserCompany ? 0.85 : // High momentum for user company
                  entity.name === 'Apollo.io' ? 0.92 : // Very high
                  entity.name === 'Gong' ? 0.78 :
                  entity.name === 'HubSpot' ? 0.65 :
                  entity.name === 'Outreach' ? 0.58 :
                  0.45; // Salesforce - slower to adapt
          break;
          
        case 'techVelocity':
          value = isUserCompany ? 0.90 : // High tech velocity
                  entity.name === 'Gong' ? 0.85 : // AI-first
                  entity.name === 'Apollo.io' ? 0.75 :
                  entity.name === 'Outreach' ? 0.70 :
                  entity.name === 'HubSpot' ? 0.55 :
                  0.40; // Salesforce - legacy platform
          break;
          
        case 'mindshare':
          value = isUserCompany ? 0.25 : // Low mindshare (startup)
                  entity.name === 'Salesforce' ? 0.95 : // Dominant
                  entity.name === 'HubSpot' ? 0.80 :
                  entity.name === 'Outreach' ? 0.60 :
                  entity.name === 'Gong' ? 0.55 :
                  0.45; // Apollo.io
          break;
          
        case 'threat':
          value = isUserCompany ? 0.10 : // No self-threat
                  entity.name === 'Apollo.io' ? 0.75 : // Direct competitor
                  entity.name === 'Outreach' ? 0.70 :
                  entity.name === 'Gong' ? 0.45 :
                  entity.name === 'HubSpot' ? 0.35 :
                  0.25; // Salesforce - different market
          break;
          
        case 'growth':
          value = isUserCompany ? 0.88 : // High growth startup
                  entity.name === 'Gong' ? 0.82 :
                  entity.name === 'Apollo.io' ? 0.75 :
                  entity.name === 'Outreach' ? 0.60 :
                  entity.name === 'HubSpot' ? 0.55 :
                  0.35; // Salesforce - mature, slower growth
          break;
          
        default:
          value = Math.random() * 0.8 + 0.1; // 0.1 to 0.9
      }

      await prisma.indexValue.upsert({
        where: {
          entityId_indexDefinitionId_asOf: {
            entityId: entity.id,
            indexDefinitionId: indexDef.id,
            asOf: new Date(),
          },
        },
        update: {},
        create: {
          entityId: entity.id,
          indexDefinitionId: indexDef.id,
          asOf: new Date(),
          value: value,
          normalized: value, // Already 0-1 normalized
        },
      });
    }
  }

  console.log('✅ Created index values');

  // Create signals using correct enum values with strategic distribution
  const signalTypes = [
    'ACQUISITION', 'FUNDING_ROUND', 'PARTNERSHIP', 'COMPETITOR_LAUNCH', 
    'PRICING_CHANGE', 'MARKET_ENTRY', 'CUSTOMER_WIN', 'CUSTOMER_LOSS', 
    'PRESS_MENTION', 'SOCIAL_POST', 'REVIEW', 'PRODUCT_LAUNCH', 
    'MAJOR_UPDATE', 'PATENT_FILED', 'EXEC_HIRE'
  ];
  const signalCategories = ['MARKET', 'COMPETITIVE', 'DEAL', 'PRODUCT', 'TALENT', 'RISK', 'ENGAGEMENT'];
  const sentimentLabels = ['POSITIVE', 'NEGATIVE', 'NEUTRAL'];
  const impactRoles = ['SUBJECT', 'ACTOR', 'TARGET', 'MENTIONED']; // Using correct enum values
  const signals = [];
  
  for (const entity of allEntities) {
    // Create different signal patterns based on entity type and characteristics
    const isUserCompany = entity.id === hyperformant.id;
    const signalCount = isUserCompany ? 12 : 8; // More signals for user company
    
    for (let i = 0; i < signalCount; i++) {
      // Strategic signal type selection based on entity
      let type, category, sentimentLabel;
      
      if (isUserCompany) {
        // User company gets more product launches, funding, and positive signals
        const userCompanyTypes = ['PRODUCT_LAUNCH', 'FUNDING_ROUND', 'PARTNERSHIP', 'CUSTOMER_WIN', 'PRESS_MENTION'];
        type = i < 6 ? userCompanyTypes[Math.floor(Math.random() * userCompanyTypes.length)] : 
               signalTypes[Math.floor(Math.random() * signalTypes.length)];
        // 70% positive sentiment for user company
        sentimentLabel = Math.random() < 0.7 ? 'POSITIVE' : (Math.random() < 0.8 ? 'NEUTRAL' : 'NEGATIVE');
      } else {
        type = signalTypes[Math.floor(Math.random() * signalTypes.length)];
        // More balanced sentiment for competitors
        const rand = Math.random();
        sentimentLabel = rand < 0.4 ? 'POSITIVE' : (rand < 0.7 ? 'NEUTRAL' : 'NEGATIVE');
      }
      
      // Category selection based on signal type
      category = getSignalCategory(type);
      
      const role = impactRoles[Math.floor(Math.random() * impactRoles.length)];
      const daysAgo = Math.floor(Math.random() * 30); // Last 30 days
      
      const signal = await prisma.signal.create({
        data: {
          timestamp: new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000)),
          source: getSignalSource(type),
          category: category,
          type: type,
          magnitude: getMagnitudeForType(type, sentimentLabel),
          sentimentScore: getSentimentScore(sentimentLabel),
          sentimentLabel: sentimentLabel,
          summary: `${type.toLowerCase().replace('_', ' ')} signal for ${entity.name} (${sentimentLabel.toLowerCase()})`,
          details: {
            source_confidence: 0.7 + Math.random() * 0.3,
            automated: true,
            keywords: [category.toLowerCase(), type.toLowerCase()],
            entity_role: role.toLowerCase(),
          },
          decayHalfLifeDays: getDecayForType(type),
          tags: [category.toLowerCase(), type.toLowerCase(), sentimentLabel.toLowerCase()],
          createdAt: new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000)),
        },
      });
      signals.push(signal);

      // Create signal impact with strategic role and weight
      await prisma.signalImpact.create({
        data: {
          signalId: signal.id,
          entityId: entity.id,
          role: role,
          weight: getWeightForRole(role, type, isUserCompany),
        },
      });
    }
  }

  // Helper functions for strategic signal generation
  function getSignalCategory(signalType) {
    const typeToCategory = {
      'ACQUISITION': 'DEAL',
      'FUNDING_ROUND': 'DEAL', 
      'PARTNERSHIP': 'DEAL',
      'COMPETITOR_LAUNCH': 'COMPETITIVE',
      'PRICING_CHANGE': 'COMPETITIVE',
      'MARKET_ENTRY': 'MARKET',
      'CUSTOMER_WIN': 'MARKET',
      'CUSTOMER_LOSS': 'RISK',
      'PRESS_MENTION': 'ENGAGEMENT',
      'SOCIAL_POST': 'ENGAGEMENT',
      'REVIEW': 'ENGAGEMENT',
      'PRODUCT_LAUNCH': 'PRODUCT',
      'MAJOR_UPDATE': 'PRODUCT',
      'PATENT_FILED': 'PRODUCT',
      'EXEC_HIRE': 'TALENT'
    };
    return typeToCategory[signalType] || 'MARKET';
  }

  function getSignalSource(signalType) {
    const sources = {
      'SOCIAL_POST': 'Social Media',
      'PRESS_MENTION': 'Press Release',
      'REVIEW': 'Review Sites',
      'FUNDING_ROUND': 'SEC Filings',
      'ACQUISITION': 'Business News',
      'PRODUCT_LAUNCH': 'Company Blog',
    };
    return sources[signalType] || 'Market Intelligence';
  }

  function getMagnitudeForType(signalType, sentimentLabel) {
    const baseMagnitude = {
      'ACQUISITION': 0.9,
      'FUNDING_ROUND': 0.8,
      'PRODUCT_LAUNCH': 0.7,
      'COMPETITOR_LAUNCH': 0.6,
      'CUSTOMER_WIN': 0.6,
      'CUSTOMER_LOSS': 0.7,
    };
    
    const base = baseMagnitude[signalType] || 0.5;
    const sentimentModifier = sentimentLabel === 'POSITIVE' ? 0.1 : 
                             sentimentLabel === 'NEGATIVE' ? 0.2 : 0.05;
    
    return Math.min(1.0, base + sentimentModifier + (Math.random() * 0.2 - 0.1));
  }

  function getSentimentScore(sentimentLabel) {
    switch (sentimentLabel) {
      case 'POSITIVE': return 0.3 + Math.random() * 0.7; // 0.3 to 1.0
      case 'NEGATIVE': return -0.3 - Math.random() * 0.7; // -1.0 to -0.3
      case 'NEUTRAL': return -0.2 + Math.random() * 0.4; // -0.2 to 0.2
      default: return 0;
    }
  }

  function getDecayForType(signalType) {
    const decayDays = {
      'ACQUISITION': 60,
      'FUNDING_ROUND': 45,
      'PRODUCT_LAUNCH': 30,
      'SOCIAL_POST': 7,
      'PRESS_MENTION': 14,
    };
    return decayDays[signalType] || 21;
  }

  function getWeightForRole(role, signalType, isUserCompany) {
    const baseWeights = {
      'SUBJECT': 0.9,
      'ACTOR': 0.7,
      'TARGET': 0.8,
      'MENTIONED': 0.3,
    };
    
    let weight = baseWeights[role] || 0.5;
    
    // User company gets higher weights for positive signals
    if (isUserCompany && ['PRODUCT_LAUNCH', 'FUNDING_ROUND', 'CUSTOMER_WIN'].includes(signalType)) {
      weight = Math.min(1.0, weight + 0.1);
    }
    
    return weight + (Math.random() * 0.2 - 0.1); // Add some randomness
  }

  console.log('✅ Created signals and impacts');

  console.log('✅ Created sample metrics');

  // Create connections between Hyperformant and competitors
  const connections = [
    {
      targetId: competitorEntities[0].id, // Salesforce
      type: 'WEAK_COMPETITOR', // Large enterprise, different market segment
      strength: 0.4,
      sentimentScore: -0.1,
    },
    {
      targetId: competitorEntities[1].id, // HubSpot
      type: 'WEAK_COMPETITOR', // Broader platform, some overlap
      strength: 0.6,
      sentimentScore: -0.2,
    },
    {
      targetId: competitorEntities[2].id, // Apollo.io
      type: 'WEAK_COMPETITOR', // Direct competitor in sales intelligence
      strength: 0.8,
      sentimentScore: -0.4,
    },
    {
      targetId: competitorEntities[3].id, // Outreach
      type: 'WEAK_COMPETITOR', // Sales engagement overlap
      strength: 0.7,
      sentimentScore: -0.3,
    },
    {
      targetId: competitorEntities[4].id, // Gong
      type: 'INDUSTRY_ADJACENCY', // Revenue intelligence, adjacent space
      strength: 0.5,
      sentimentScore: 0.1,
    },
  ];

  for (const conn of connections) {
    await prisma.connection.upsert({
      where: {
        sourceEntityId_targetEntityId_type_since: {
          sourceEntityId: hyperformant.id,
          targetEntityId: conn.targetId,
          type: conn.type,
          since: new Date('2024-01-01'),
        },
      },
      update: {
        strength: conn.strength,
        sentimentScore: conn.sentimentScore,
      },
      create: {
        sourceEntityId: hyperformant.id,
        targetEntityId: conn.targetId,
        type: conn.type,
        strength: conn.strength,
        sentimentScore: conn.sentimentScore,
        since: new Date('2024-01-01'),
      },
    });
  }

  console.log('✅ Created connections');

  // Create sample report for Hyperformant
  const sampleReport = await prisma.report.create({
    data: {
      title: 'Market Forces Analysis - Hyperformant',
      type: 'FULL',
      status: 'COMPLETED',
      content: 'Comprehensive market intelligence report for Hyperformant showing competitive landscape, sentiment analysis, and growth opportunities.',
      entityId: hyperformant.id,
      userId: adminUser.id,
    },
  });

  console.log('✅ Created sample report:', sampleReport.title);

  // Create sample daily metrics for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  await prisma.dailyMetrics.upsert({
    where: { date: today },
    update: {},
    create: {
      date: today,
      prospectCount: 150,
      replyRate: 8.5,
      previewConversions: 12,
      fullReportSales: 3,
      consultingConversions: 1,
      revenue: 1497.0,
    },
  });

  console.log('✅ Created/updated sample daily metrics');

  // Create sample Apollo Smart List
  await prisma.apolloSmartList.upsert({
    where: { apolloId: 'sample-smart-list-id' },
    update: {},
    create: {
      apolloId: 'sample-smart-list-id',
      name: 'SaaS Companies 5-50 Employees',
      description: 'Target market for Market Forces Analysis',
      filters: {
        industry: ['Software', 'SaaS', 'Technology'],
        employeeRange: [5, 50],
        revenueRange: ['$500K', '$10M'],
        founded: '2018+',
      },
      prospectCount: 2500,
    },
  });

  console.log('✅ Created sample Apollo Smart List');

  console.log('🎉 Database seeded successfully with comprehensive demo data!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });