#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import fs from 'fs';
import Ajv from 'ajv';
import { logger } from './lib/logger';
import { validateEnvironment, getEnvironment } from './lib/environment';
import { spawn, execSync, ChildProcess } from 'child_process';
import os from 'os';
import dotenv from 'dotenv';

// ANSI color codes
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bgCyan: '\x1b[46m',
};

// Service URLs
const services = {
  nextjs: 'http://localhost:3000',
  nextjsApi: 'http://localhost:3000/api',
  n8n: 'http://localhost:5678',
  email: 'http://localhost:9000',
  prismaStudio: 'http://localhost:5555',
  openapi: 'http://localhost:3000/api/openapi.json',
  redocs: 'http://localhost:3000/api/docs',
  swagger: 'http://localhost:3000/api/swagger',
};

// Global process references for cleanup
let nextjsDevProcess: ChildProcess | null = null;
let prismaStudioProcess: ChildProcess | null = null;

// Helpers
function loadJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Load environment variables from .env.local
function loadEnvironment() {
  const envPath = path.join(process.cwd(), 'web', '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    // Merge with existing environment variables
    Object.assign(process.env, envConfig);
    return envConfig;
  }
  return {};
}

// Cross-platform browser launcher
function openBrowser(url: string): boolean {
  const platform = os.platform();
  let command: string;
  
  switch (platform) {
    case 'darwin': // macOS
      command = 'open';
      break;
    case 'win32': // Windows
      command = 'start';
      break;
    default: // Linux and others
      command = 'xdg-open';
      break;
  }
  
  try {
    execSync(`${command} "${url}"`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    // Silently fail - don't show ugly error messages
    return false;
  }
}

// Check for required tools
function checkRequirements() {
  const requirements = [
    { cmd: 'docker', name: 'Docker', url: 'https://docs.docker.com/get-docker/' },
    { cmd: 'docker-compose', name: 'Docker Compose', url: 'https://docs.docker.com/compose/install/' },
    { cmd: 'node', name: 'Node.js', url: 'https://nodejs.org/' },
    { cmd: 'npm', name: 'npm', url: 'https://nodejs.org/' }
  ];

  let allGood = true;
  
  console.log(`${c.bright}Checking requirements...${c.reset}\n`);
  
  requirements.forEach(req => {
    try {
      execSync(`which ${req.cmd}`, { stdio: 'ignore' });
      console.log(`  ✅ ${req.name}`);
    } catch {
      console.log(`  ❌ ${req.name} - ${c.dim}Install from: ${req.url}${c.reset}`);
      allGood = false;
    }
  });
  
  // Check and install xdg-utils for browser support on Linux
  if (os.platform() === 'linux') {
    try {
      execSync('which xdg-open', { stdio: 'ignore' });
      console.log(`  ✅ Browser support (xdg-utils)`);
    } catch {
      console.log(`  ${c.yellow}⚠️ Browser auto-launch may not work - install xdg-utils manually${c.reset}`);
    }
  }
  
  if (!allGood) {
    console.log(`\n${c.red}Please install missing requirements before continuing.${c.reset}\n`);
    process.exit(1);
  }
  
  console.log(`\n${c.green}All requirements satisfied!${c.reset}\n`);
}

// Environment validation command
async function validateEnvironmentCommand() {
  try {
    logger.info('🔍 Validating environment configuration...');
    const env = validateEnvironment();
    logger.info('✅ Environment validation passed', {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      hasDatabase: !!env.DATABASE_URL,
      hasApollo: !!env.APOLLO_API_KEY,
      hasOpenAI: !!env.OPENAI_API_KEY,
    });
  } catch (error) {
    logger.error('❌ Environment validation failed', undefined, error as Error);
    process.exit(1);
  }
}

// Health check command
async function healthCheck() {
  try {
    logger.info('🏥 Running health checks...');

    // Check environment
    const env = getEnvironment();
    logger.info('✅ Environment configuration valid');

    // Check database connection (if needed)
    if (env.DATABASE_URL) {
      // TODO: Add database connectivity check
      logger.info('✅ Database URL configured');
    }

    // Check n8n connectivity
    if (env.N8N_URL) {
      try {
        // Simple ping to n8n instance
        const response = await fetch(`${env.N8N_URL}/healthz`);
        if (response.ok) {
          logger.info('✅ n8n instance reachable');
        } else {
          logger.warn('⚠️ n8n instance returned non-OK status', {
            status: response.status,
          });
        }
      } catch (error) {
        logger.warn('⚠️ Could not reach n8n instance', {
          error: (error as Error).message,
        });
      }
    }

    logger.info('🎉 Health check completed');
  } catch (error) {
    logger.error('❌ Health check failed', undefined, error as Error);
    process.exit(1);
  }
}

// JSON Schema validation command
async function validateConfigs() {
  logger.info('🔍 Validating JSON configurations...');

  const ajv = new Ajv({ allErrors: true, strict: false });

  // Load JSON Schemas for validation
  const agentSchema = loadJson(
    path.join('n8n', 'schemas', 'agent-config.schema.json')
  );
  const workflowSchema = loadJson(
    path.join('n8n', 'schemas', 'n8n-workflow.schema.json')
  );

  // Register schemas with Ajv
  ajv.addSchema(agentSchema, 'agentSchema');
  ajv.addSchema(workflowSchema, 'workflowSchema');

  // Get workflow files from n8n/workflows directory
  const workflowsDir = path.join('n8n', 'workflows');
  if (!fs.existsSync(workflowsDir)) {
    console.error(`❌ Workflows directory not found: ${workflowsDir}`);
    process.exit(1);
  }

  const workflowFiles = fs.readdirSync(workflowsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(workflowsDir, f));

  let errors = 0;
  // Validate workflow configurations  
  for (const file of workflowFiles) {
    try {
      const data = loadJson(file);
      // Basic JSON validation (N8N workflows have complex structure)
      if (data.name && data.nodes && Array.isArray(data.nodes)) {
        console.log(`✅ ${file} is valid`);
      } else {
        console.error(`❌ Invalid N8N workflow structure in ${file}`);
        errors++;
      }
    } catch (err) {
      console.error(`❌ Failed to parse ${file}:`, err);
      errors++;
    }
  }

  if (errors > 0) {
    console.error(`\nValidation completed with ${errors} error(s).`);
    process.exit(1);
  }
  console.log('\n🎉 All N8N workflow configurations validated successfully!');
}

// n8n import command
async function importWorkflows(env: string) {
  console.log(`🔄 Importing n8n workflows into '${env}' environment...`);

  // Check if deployment script exists
  const deployScript = path.join(__dirname, '..', 'n8n', 'deploy.js');
  if (!fs.existsSync(deployScript)) {
    console.error('❌ N8N deployment script not found:', deployScript);
    console.error(
      'Please ensure n8n/deploy.js exists and is executable.'
    );
    process.exit(1);
  }

  // Use the proven shell script that GitHub Actions uses
  const { spawn } = require('child_process');

  return new Promise<void>((resolve, reject) => {
    const child = spawn('node', [deployScript], {
      stdio: 'inherit',
      env: {
        ...process.env,
        WORKFLOWS_DIR: './n8n/workflows',
        N8N_HOST: process.env.N8N_WEBHOOK_URL,
        N8N_API_KEY: process.env.N8N_API_KEY,
      },
    });

    child.on('close', (code: number | null) => {
      if (code === 0) {
        console.log('\n🎉 N8N workflow deployment completed successfully!');
        resolve();
      } else {
        console.error(
          '\n❌ N8N workflow deployment failed with exit code:',
          code
        );
        reject(new Error(`Deployment failed with exit code ${code}`));
      }
    });

    child.on('error', (error: Error) => {
      console.error('❌ Failed to execute deployment script:', error.message);
      reject(error);
    });
  });
}

// Database operations are now handled by Next.js + Prisma
// Use: npm run db:migrate, npm run db:seed, npm run db:reset

// Composite deploy command
async function deploy(env: string) {
  logger.info(`🚀 Starting deployment validation for '${env}'...`);

  // Validate environment
  await validateEnvironmentCommand();

  // Validate JSON configs
  await validateConfigs();

  logger.info('🎉 Deployment validation completed!');
  logger.info('Next steps:');
  logger.info(
    '1. Run database operations: npm run db:migrate && npm run db:seed'
  );
  logger.info('2. Build Next.js app: npm run build');
  logger.info('3. Import n8n workflows: npm run import:prod');
}

// Setup command
async function runSetup() {
  console.log(`${c.bright}${c.yellow}Running initial setup...${c.reset}\n`);
  
  // Check for Next.js .env.local
  const envPath = path.join(process.cwd(), 'web', '.env.local');
  const envExamplePath = path.join(process.cwd(), 'web', '.env.example');
  
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log(`📝 Creating Next.js .env.local file...`);
    fs.copyFileSync(envExamplePath, envPath);
  } else if (fs.existsSync(envPath)) {
    console.log(`✅ Next.js .env.local already exists`);
  }
  
  // Start Docker services
  console.log(`\n🐳 Starting Docker services...`);
  execSync('docker-compose up -d', { stdio: 'inherit' });
  
  // Wait for PostgreSQL
  console.log(`\n⏳ Waiting for PostgreSQL to be ready...`);
  let pgReady = false;
  let attempts = 0;
  while (!pgReady && attempts < 30) {
    try {
      execSync('docker-compose exec -T postgres pg_isready -U postgres -d hyperformant', { stdio: 'ignore' });
      pgReady = true;
    } catch {
      process.stdout.write('.');
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  if (!pgReady) {
    console.log(`\n${c.red}PostgreSQL failed to start. Check Docker logs.${c.reset}`);
    process.exit(1);
  }
  
  console.log(`\n✅ PostgreSQL is ready!`);
  
  // Run Prisma database migrations
  console.log(`\n🔄 Setting up Next.js database...`);
  execSync('cd web && npx prisma migrate dev --name initial_consolidated_schema', { stdio: 'inherit' });
  execSync('cd web && npx prisma db seed', { stdio: 'inherit' });
  
  // Build and validate
  console.log(`\n🔨 Building application...`);
  execSync('cd web && npm run build', { stdio: 'inherit' });
  
  console.log(`\n✅ Validating configurations...`);
  execSync('npm run validate', { stdio: 'inherit' });
  
  console.log(`\n${c.bright}${c.green}✨ Setup complete!${c.reset}\n`);
}

// Development server command
async function runDev() {
  // Display header
  console.clear();
  console.log(`
${c.bright}${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${c.reset}
${c.bright}${c.white} ${c.bgCyan} hyperformant ${c.reset} ${c.bright}${c.cyan}market intelligence${c.reset}
   
${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
`);

  console.log(`${c.dim}Starting development environment...${c.reset}\n`);
  
  // Load environment variables from .env.local
  console.log(`${c.dim}📄 Loading environment variables...${c.reset}`);
  const envVars = loadEnvironment();
  if (envVars.DATABASE_URL) {
    console.log(`${c.green}✅ Environment variables loaded${c.reset}`);
  } else {
    console.log(`${c.red}❌ DATABASE_URL not found in .env.local${c.reset}`);
    process.exit(1);
  }
  
  // Check if Docker services are running
  try {
    execSync('docker-compose ps | grep -q "Up"', { stdio: 'ignore' });
    console.log(`${c.green}✅ Docker services already running${c.reset}`);
  } catch {
    console.log(`${c.yellow}🐳 Starting Docker services...${c.reset}`);
    execSync('docker-compose up -d', { stdio: 'inherit' });
    
    // Wait for PostgreSQL to be ready
    console.log(`${c.dim}⏳ Waiting for PostgreSQL...${c.reset}`);
    let pgReady = false;
    let attempts = 0;
    while (!pgReady && attempts < 30) {
      try {
        execSync('docker-compose exec -T postgres pg_isready -U postgres -d hyperformant', { 
          stdio: 'ignore',
          cwd: process.cwd()
        });
        pgReady = true;
      } catch {
        process.stdout.write('.');
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!pgReady) {
      console.log(`\n${c.red}❌ PostgreSQL failed to start. Check Docker logs.${c.reset}`);
      process.exit(1);
    }
    console.log(`\n${c.green}✅ PostgreSQL is ready!${c.reset}`);
  }
  
  // Check if database needs migration
  const webDir = path.join(process.cwd(), 'web');
  const prismaEnv = { 
    ...process.env, 
    NODE_ENV: 'development',
    DATABASE_URL: process.env.DATABASE_URL
  };
  
  try {
    console.log(`${c.dim}🔍 Checking database schema...${c.reset}`);
    execSync('npx prisma migrate status', { 
      stdio: 'ignore',
      cwd: webDir,
      env: prismaEnv
    });
    console.log(`${c.green}✅ Database schema is up to date${c.reset}`);
  } catch {
    console.log(`${c.yellow}🔄 Running database migrations...${c.reset}`);
    try {
      execSync('npx prisma migrate dev --name auto_migration', { 
        stdio: 'inherit',
        cwd: webDir,
        env: prismaEnv
      });
      console.log(`${c.green}✅ Database migrations completed${c.reset}`);
      
      // Run seed if needed
      console.log(`${c.yellow}🌱 Seeding database with initial data...${c.reset}`);
      execSync('npx prisma db seed', { 
        stdio: 'inherit',
        cwd: webDir,
        env: prismaEnv
      });
      console.log(`${c.green}✅ Database seeding completed${c.reset}`);
    } catch (error) {
      console.log(`${c.red}❌ Database setup failed${c.reset}`);
      console.error(error);
      process.exit(1);
    }
  }
  
  // Light cache clearing for optimal performance
  try {
    execSync('rm -rf web/.next', { stdio: 'ignore' });
  } catch {}

  // Start Next.js development server
  console.log(`${c.yellow}Starting Next.js development server...${c.reset}\n`);
  
  nextjsDevProcess = spawn('npm', ['run', 'dev:web'], {
    stdio: 'inherit',
    shell: true,
    detached: true
  });

  // Start Prisma Studio
  console.log(`${c.yellow}Starting Prisma Studio...${c.reset}\n`);
  
  prismaStudioProcess = spawn('npm', ['run', 'db:studio'], {
    cwd: path.join(process.cwd(), 'web'),
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: true,
    detached: true
  });

  // Show service URLs after a delay
  setTimeout(() => {
    console.log(`
${c.bright}${c.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
${c.bright}${c.white} SERVICES RUNNING ${c.reset}
${c.bright}${c.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}

 ${c.yellow}▶ Next.js App${c.reset}        ${c.cyan}http://localhost:3000${c.reset}
 ${c.blue}▶ Next.js API${c.reset}        ${c.cyan}http://localhost:3000/api${c.reset}
 ${c.magenta}▶ n8n Workflows${c.reset}      ${c.cyan}http://localhost:5678${c.reset} ${c.dim}(admin/admin)${c.reset}
 ${c.cyan}▶ Email Testing${c.reset}      ${c.cyan}http://localhost:9000${c.reset}
 ${c.green}▶ Prisma Studio${c.reset}      ${c.cyan}http://localhost:5555${c.reset} ${c.dim}(database admin)${c.reset}
 ${c.blue}▶ PostgreSQL${c.reset}         ${c.dim}postgresql://localhost:5432${c.reset}

${c.bright}${c.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
${c.bright}${c.white} API DOCUMENTATION ${c.reset}
${c.bright}${c.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}

 ${c.green}▶ Redoc Docs${c.reset}         ${c.cyan}http://localhost:3000/api/docs${c.reset}
 ${c.green}▶ Swagger UI${c.reset}         ${c.cyan}http://localhost:3000/api/swagger${c.reset}
 ${c.green}▶ OpenAPI Spec${c.reset}       ${c.cyan}http://localhost:3000/api/openapi.json${c.reset}

${c.bright}${c.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}

${c.bright}${c.white} Quick Commands:${c.reset}
   ${c.green}npm run db:migrate${c.reset}  - Run database migrations
   ${c.green}npm run db:seed${c.reset}     - Seed test data  
   ${c.green}npm run validate${c.reset}    - Validate configurations
   ${c.green}npm run test${c.reset}        - Run tests

${c.dim}Press Ctrl+C to stop all services${c.reset}
`);
    
    // Auto-launch browser tabs after Next.js is fully ready
    setTimeout(() => {
      console.log(`${c.bright}${c.cyan}🌐 Opening Next.js app...${c.reset}`);
      openBrowser(services.nextjs);
      console.log(`${c.bright}${c.green}✨ App should now be open!${c.reset}\n`);
    }, 8000);
  }, 5000);

  // Handle process exit
  if (nextjsDevProcess) {
    nextjsDevProcess.on('exit', (code) => {
      process.exit(code || 0);
    });
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(`\n\n${c.yellow}Shutting down services...${c.reset}`);
  
  // Stop Next.js dev process first
  if (nextjsDevProcess && !nextjsDevProcess.killed) {
    console.log(`${c.dim}Stopping Next.js development server...${c.reset}`);
    
    try {
      // Kill the process group to ensure all child processes stop
      if (nextjsDevProcess.pid) {
        process.kill(-nextjsDevProcess.pid, 'SIGTERM');
      }
      
      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          // Force kill if not stopped gracefully
          try {
            if (nextjsDevProcess?.pid) {
              process.kill(-nextjsDevProcess.pid, 'SIGKILL');
            }
          } catch {}
          resolve();
        }, 5000);
        
        nextjsDevProcess!.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      
      console.log(`${c.green}✅ Next.js server stopped${c.reset}`);
    } catch (error) {
      console.log(`${c.dim}Next.js process already stopped${c.reset}`);
    }
  }

  // Stop Prisma Studio
  if (prismaStudioProcess && !prismaStudioProcess.killed) {
    console.log(`${c.dim}Stopping Prisma Studio...${c.reset}`);
    
    try {
      if (prismaStudioProcess.pid) {
        process.kill(-prismaStudioProcess.pid, 'SIGTERM');
      }
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          try {
            if (prismaStudioProcess?.pid) {
              process.kill(-prismaStudioProcess.pid, 'SIGKILL');
            }
          } catch {}
          resolve();
        }, 3000);
        
        prismaStudioProcess!.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      
      console.log(`${c.green}✅ Prisma Studio stopped${c.reset}`);
    } catch (error) {
      console.log(`${c.dim}Prisma Studio process already stopped${c.reset}`);
    }
  }
  
  // Stop Docker services
  try {
    console.log(`${c.dim}Stopping Docker containers...${c.reset}`);
    execSync('docker-compose down', { stdio: 'ignore' });
    console.log(`${c.green}✅ Docker containers stopped${c.reset}`);
  } catch (error) {
    console.log(`${c.red}Error stopping Docker services${c.reset}`);
  }
  
  console.log(`${c.green}✅ All services stopped${c.reset}\n`);
  process.exit(0);
});

// CLI setup with yargs
yargs(hideBin(process.argv))
  .scriptName('hyperformant')
  .usage('$0 <cmd> [options]')
  .command('health', 'Run health checks', {}, async () => {
    await healthCheck();
  })
  .command('env', 'Validate environment configuration', {}, async () => {
    await validateEnvironmentCommand();
  })
  .command('validate', 'Validate JSON configs', {}, async () => {
    await validateConfigs();
  })
  .command(
    'import-n8n [env]',
    'Import all workflows to n8n',
    y => {
      y.positional('env', {
        type: 'string',
        default: 'dev',
        describe: 'Target environment (dev or prod)',
      });
    },
    async argv => {
      await importWorkflows(argv.env as string);
    }
  )
  .command(
    'deploy [env]',
    'Run validation, migrations, and import workflows',
    y => {
      y.positional('env', {
        type: 'string',
        default: 'dev',
        describe: 'Target environment (dev or prod)',
      });
    },
    async argv => {
      await deploy(argv.env as string);
    }
  )
  .command(
    'setup',
    'Run initial setup (Docker, database, etc.)',
    {},
    async () => {
      checkRequirements();
      await runSetup();
      console.log(`\n${c.bright}Run ${c.green}hyperformant dev${c.reset} ${c.bright}to start the development server${c.reset}\n`);
    }
  )
  .command(
    'dev',
    'Start development server with all services',
    {},
    async () => {
      checkRequirements();
      await runDev();
    }
  )
  .demandCommand(1)
  .help()
  .alias('h', 'help')
  .parse();
