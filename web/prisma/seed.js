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

  await prisma.metricPoint.createMany({
    data: [
      {
        entityId: hyperformant.id,
        metricDefinitionId: revenueMetric.id,
        timestamp: lastMonth,
        window: 'MONTH',
        value: 85000,
        source: 'internal',
      },
      {
        entityId: hyperformant.id,
        metricDefinitionId: revenueMetric.id,
        timestamp: thisMonth,
        window: 'MONTH',
        value: 120000,
        source: 'internal',
      },
      {
        entityId: hyperformant.id,
        metricDefinitionId: trafficMetric.id,
        timestamp: lastMonth,
        window: 'MONTH',
        value: 25000,
        source: 'analytics',
      },
      {
        entityId: hyperformant.id,
        metricDefinitionId: trafficMetric.id,
        timestamp: thisMonth,
        window: 'MONTH',
        value: 38000,
        source: 'analytics',
      },
      {
        entityId: hyperformant.id,
        metricDefinitionId: sentimentMetric.id,
        timestamp: thisMonth,
        window: 'MONTH',
        value: 0.65,
        source: 'sentiment_analysis',
      },
    ],
  });

  console.log('✅ Created sample metrics');

  // Create connections between Hyperformant and competitors
  const connections = [
    {
      targetId: competitorEntities[0].id, // Salesforce
      type: 'COMPETITOR',
      strength: 0.9,
      sentimentScore: -0.3,
    },
    {
      targetId: competitorEntities[1].id, // HubSpot
      type: 'COMPETITOR',
      strength: 0.8,
      sentimentScore: -0.1,
    },
    {
      targetId: competitorEntities[2].id, // Apollo.io
      type: 'TECH_AFFINITY',
      strength: 0.7,
      sentimentScore: 0.2,
    },
    {
      targetId: competitorEntities[3].id, // Outreach
      type: 'COMPETITOR',
      strength: 0.6,
      sentimentScore: -0.2,
    },
    {
      targetId: competitorEntities[4].id, // Gong
      type: 'COMPETITOR',
      strength: 0.5,
      sentimentScore: 0.1,
    },
  ];

  for (const conn of connections) {
    await prisma.connection.create({
      data: {
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

  // Create sample signals
  const signals = [
    {
      timestamp: new Date('2024-08-01'),
      source: 'techcrunch',
      category: 'COMPETITIVE',
      type: 'FUNDING_ROUND',
      magnitude: 0.8,
      sentimentScore: 0.6,
      sentimentLabel: 'POSITIVE',
      summary: 'Hyperformant raises $5M Series A for AI-powered sales automation',
      details: {
        amount: '$5M',
        lead_investor: 'Tech Ventures',
        round: 'Series A',
      },
      impacts: [{ entityId: hyperformant.id, role: 'SUBJECT', weight: 1.0 }],
    },
    {
      timestamp: new Date('2024-08-05'),
      source: 'salesforce_news',
      category: 'COMPETITIVE',
      type: 'PRODUCT_LAUNCH',
      magnitude: 0.7,
      sentimentScore: -0.4,
      sentimentLabel: 'NEGATIVE',
      summary: 'Salesforce launches new AI automation features',
      details: {
        product: 'Einstein Automation',
        features: ['AI-powered workflows', 'Smart routing'],
      },
      impacts: [
        { entityId: competitorEntities[0].id, role: 'SUBJECT', weight: 1.0 },
        { entityId: hyperformant.id, role: 'TARGET', weight: 0.6 },
      ],
    },
    {
      timestamp: new Date('2024-08-08'),
      source: 'reddit',
      category: 'ENGAGEMENT',
      type: 'SOCIAL_POST',
      magnitude: 0.4,
      sentimentScore: 0.8,
      sentimentLabel: 'POSITIVE',
      summary: 'Positive customer feedback on Hyperformant automation',
      details: {
        platform: 'Reddit',
        subreddit: 'r/sales',
        upvotes: 156,
        comments: 23,
      },
      impacts: [{ entityId: hyperformant.id, role: 'SUBJECT', weight: 1.0 }],
    },
  ];

  for (const signal of signals) {
    const createdSignal = await prisma.signal.create({
      data: {
        timestamp: signal.timestamp,
        source: signal.source,
        category: signal.category,
        type: signal.type,
        magnitude: signal.magnitude,
        sentimentScore: signal.sentimentScore,
        sentimentLabel: signal.sentimentLabel,
        summary: signal.summary,
        details: signal.details,
        tags: ['demo', 'seed_data'],
      },
    });

    // Create signal impacts
    for (const impact of signal.impacts) {
      await prisma.signalImpact.create({
        data: {
          signalId: createdSignal.id,
          entityId: impact.entityId,
          role: impact.role,
          weight: impact.weight,
        },
      });
    }
  }

  console.log('✅ Created sample signals with impacts');

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