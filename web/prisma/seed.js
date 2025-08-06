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

  // Create test company
  const testCompany = await prisma.company.upsert({
    where: { domain: 'example.com' },
    update: {},
    create: {
      name: 'Example Corp',
      domain: 'example.com',
      industry: 'Technology',
      employees: 50,
      revenue: '$1M-$10M',
      founded: new Date('2020-01-01'),
      description: 'A test company for development purposes',
      userId: adminUser.id,
    },
  });

  console.log('✅ Created test company:', testCompany.name);

  // Create sample report (skip if exists)
  const existingReport = await prisma.report.findFirst({
    where: { companyId: testCompany.id, title: 'Market Forces Analysis - Example Corp' }
  });
  
  if (!existingReport) {
    const sampleReport = await prisma.report.create({
      data: {
        title: 'Market Forces Analysis - Example Corp',
        type: 'PREVIEW',
        status: 'COMPLETED',
        content: 'Sample market forces analysis content...',
        companyId: testCompany.id,
        userId: adminUser.id,
      },
    });
    console.log('✅ Created sample report:', sampleReport.title);
  } else {
    console.log('✅ Sample report already exists');
  }

  // Create sample sentiment data (skip if exists)
  const existingSentiment = await prisma.sentimentData.findFirst({
    where: { companyId: testCompany.id, source: 'reddit' }
  });
  
  if (!existingSentiment) {
    await prisma.sentimentData.create({
      data: {
        companyId: testCompany.id,
        source: 'reddit',
        sentiment: 'positive',
        score: 0.8,
        content: 'Great product! Really helps with our workflow.',
        url: 'https://reddit.com/r/saas/comments/example',
      },
    });
    console.log('✅ Created sample sentiment data');
  } else {
    console.log('✅ Sample sentiment data already exists');
  }

  // Create sample daily metrics for today (upsert by date)
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for consistency
  
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

  console.log('🎉 Database seeded successfully!');
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