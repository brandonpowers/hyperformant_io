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
import { AgentExecutor } from './lib/agents/agent-executor';

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

// Service URLs (will be updated dynamically)
let services = {
  nextjs: 'http://localhost:3000',
  nextjsApi: 'http://localhost:3000/api/v1',
  n8n: 'http://localhost:5678',
  infisical: 'http://localhost:8080',
  email: 'http://localhost:9000',
  prismaStudio: 'http://localhost:5555',
};

// Global process references for cleanup
let nextjsDevProcess: ChildProcess | null = null;
let prismaStudioProcess: ChildProcess | null = null;

// Function to update service URLs when ports change
function updateServiceUrls(nextjsPort: number) {
  services.nextjs = `http://localhost:${nextjsPort}`;
  services.nextjsApi = `http://localhost:${nextjsPort}/api/v1`;
}

// Function to display service URLs
function showServiceUrls() {
  console.log(`
${c.bright}${c.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
${c.bright}${c.white} SERVICES RUNNING ${c.reset}
${c.bright}${c.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}

 ${c.yellow}▶ Next.js App${c.reset}        ${c.cyan}${services.nextjs}${c.reset}
 ${c.blue}▶ Next.js API${c.reset}        ${c.cyan}${services.nextjsApi}${c.reset}
 ${c.magenta}▶ n8n Workflows${c.reset}      ${c.cyan}${services.n8n}${c.reset} ${c.dim}(admin/admin)${c.reset}
 ${c.green}▶ Infisical Secrets${c.reset}  ${c.cyan}${services.infisical}${c.reset} ${c.dim}(secret management)${c.reset}
 ${c.cyan}▶ Email Testing${c.reset}      ${c.cyan}${services.email}${c.reset}
 ${c.green}▶ Prisma Studio${c.reset}      ${c.cyan}${services.prismaStudio}${c.reset} ${c.dim}(database admin)${c.reset}
 ${c.blue}▶ PostgreSQL${c.reset}         ${c.dim}postgresql://localhost:5432${c.reset}
 ${c.red}▶ Redis${c.reset}              ${c.dim}redis://localhost:6379${c.reset}

${c.bright}${c.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
${c.bright}${c.white} API ENDPOINTS ${c.reset}
${c.bright}${c.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}

 ${c.green}▶ Docs${c.reset}               ${c.cyan}${services.nextjsApi}/docs${c.reset}
 ${c.green}▶ OpenAPI${c.reset}            ${c.cyan}${services.nextjsApi}/openapi.json${c.reset}
 ${c.green}▶ Health Check${c.reset}       ${c.cyan}${services.nextjsApi}/health${c.reset}
  
${c.bright}${c.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}

${c.bright}${c.white} Quick Commands:${c.reset}
   ${c.green}npm run db:migrate${c.reset}  - Run database migrations
   ${c.green}npm run db:seed${c.reset}     - Seed test data  
   ${c.green}npm run validate${c.reset}    - Validate configurations
   ${c.green}npm run test${c.reset}        - Run tests
   
${c.bright}${c.white} Secret Management:${c.reset}
   ${c.green}hyperformant secrets setup${c.reset}   - Set up Infisical
   ${c.green}hyperformant secrets status${c.reset}  - Check secret status
   ${c.green}hyperformant secrets migrate${c.reset} - Migrate secrets

${c.dim}Press Ctrl+C to stop all services${c.reset}
`);

  // Auto-launch browser tabs after showing URLs
  setTimeout(() => {
    console.log(`${c.bright}${c.cyan}🌐 Opening Next.js app...${c.reset}`);
    openBrowser(services.nextjs);
    console.log(
      `${c.bright}${c.green}✨ App should now be open!${c.reset}\n`
    );
  }, 3000);
}

// Helpers
function loadJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Load environment variables from .env.local
function loadEnvironment(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env.local');
  const webEnvPath = path.join(process.cwd(), 'web', '.env.local');
  
  let envConfig: Record<string, string> = {};
  
  // Load root .env.local first
  if (fs.existsSync(envPath)) {
    envConfig = dotenv.parse(fs.readFileSync(envPath));
  }
  
  // Load web .env.local and merge (web takes precedence for web-specific vars)
  if (fs.existsSync(webEnvPath)) {
    const webConfig = dotenv.parse(fs.readFileSync(webEnvPath));
    envConfig = { ...envConfig, ...webConfig };
  }
  
  // Merge with existing environment variables
  Object.assign(process.env, envConfig);
  return envConfig;
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

// Check if Docker daemon is running
function isDockerRunning(): boolean {
  try {
    execSync('docker version --format "{{.Server.Version}}"', {
      stdio: 'ignore',
      timeout: 2000, // 2 second timeout to avoid hanging
    });
    return true;
  } catch {
    return false;
  }
}

// Get platform-specific Docker start instructions
function getDockerStartInstructions(): string {

  const instructions = `
${c.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
${c.bright}${c.red}❌ Docker daemon is not running${c.reset}

Please start Docker using one of the following methods:

${c.bright}${c.cyan}Windows (Docker Desktop):${c.reset}
  1. Open Docker Desktop from the Start Menu or System Tray
  2. Wait for Docker to fully start (icon turns from orange to white/green)
  3. Run this command again

${c.bright}${c.cyan}WSL2 (Windows Subsystem for Linux):${c.reset}
  !!! Install docker within your Linux shell in WSL2 !!!
  !!! Docker for Windows + WSL2 performs poorly      !!!

  ${c.dim}# Start Docker service${c.reset}
  ${c.green}sudo service docker start${c.reset}

${c.bright}${c.cyan}Linux:${c.reset}
  ${c.dim}# Start Docker service${c.reset}
  ${c.green}sudo systemctl start docker${c.reset}
  
  ${c.dim}# Enable Docker to start on boot (optional)${c.reset}
  ${c.green}sudo systemctl enable docker${c.reset}
  
  ${c.dim}# Add your user to docker group to avoid sudo (optional)${c.reset}
  ${c.green}sudo usermod -aG docker $USER${c.reset}
  ${c.dim}# Then log out and back in for changes to take effect${c.reset}

${c.bright}${c.cyan}macOS (Docker Desktop):${c.reset}
  1. Open Docker Desktop from Applications or Spotlight
  2. Wait for Docker to fully start (icon in menu bar shows "Docker Desktop is running")
  3. Run this command again

${c.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
`;

  return instructions;
}

// Check for required tools
function checkRequirements() {
  const requirements = [
    {
      cmd: 'docker',
      name: 'Docker',
      url: 'https://docs.docker.com/get-docker/',
    },
    {
      cmd: 'docker compose',
      name: 'Docker Compose',
      url: 'https://docs.docker.com/compose/install/',
    },
    { cmd: 'node', name: 'Node.js', url: 'https://nodejs.org/' },
    { cmd: 'npm', name: 'npm', url: 'https://nodejs.org/' },
  ];

  const optionalTools = [
    {
      cmd: 'infisical',
      name: 'Infisical CLI',
      url: 'https://infisical.com/docs/cli/overview',
      purpose: 'secret injection'
    },
  ];

  let allGood = true;

  console.log(`${c.bright}Checking requirements...${c.reset}\n`);

  requirements.forEach(req => {
    try {
      // Special handling for docker compose (subcommand)
      if (req.cmd === 'docker compose') {
        execSync('docker compose version', { stdio: 'ignore' });
      } else {
        execSync(`which ${req.cmd}`, { stdio: 'ignore' });
      }
      console.log(`  ✅ ${req.name}`);
    } catch {
      console.log(
        `  ❌ ${req.name} - ${c.dim}Install from: ${req.url}${c.reset}`
      );
      allGood = false;
    }
  });

  // Check optional tools
  console.log(`\n${c.bright}Checking optional tools...${c.reset}\n`);
  
  optionalTools.forEach(tool => {
    try {
      execSync(`which ${tool.cmd}`, { stdio: 'ignore' });
      console.log(`  ✅ ${tool.name} - ${c.green}${tool.purpose} enabled${c.reset}`);
    } catch {
      console.log(`  ${c.yellow}⚠️ ${tool.name} - ${c.dim}${tool.purpose} will use fallback${c.reset}`);
      console.log(`    ${c.dim}Install from: ${tool.url}${c.reset}`);
    }
  });

  // Check and install xdg-utils for browser support on Linux
  if (os.platform() === 'linux') {
    try {
      execSync('which xdg-open', { stdio: 'ignore' });
      console.log(`  ✅ Browser support (xdg-utils)`);
    } catch {
      console.log(
        `  ${c.yellow}⚠️ Browser auto-launch may not work - install xdg-utils manually${c.reset}`
      );
    }
  }

  if (!allGood) {
    console.log(
      `\n${c.red}Please install missing requirements before continuing.${c.reset}\n`
    );
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

  const workflowFiles = fs
    .readdirSync(workflowsDir)
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
async function importWorkflows(env: string, options: any = {}) {
  const isLocal = options.local || env === 'local';
  const deployTarget = isLocal ? 'local' : env;
  
  console.log(`🔄 Importing n8n workflows to '${deployTarget}' ${isLocal ? 'instance' : 'environment'}...`);

  // Check if deployment script exists
  const deployScript = path.join(__dirname, '..', 'n8n', 'scripts', 'deploy-workflows.ts');
  if (!fs.existsSync(deployScript)) {
    console.error('❌ N8N deployment script not found:', deployScript);
    console.error('Please ensure n8n/scripts/deploy-workflows.ts exists.');
    process.exit(1);
  }

  // Load environment variables
  loadEnvironment();

  // Use ts-node to run the TypeScript deployment script
  const { spawn } = await import('child_process');

  return new Promise<void>((resolve, reject) => {
    const envVars = {
      ...process.env,
    };

    // Set N8N host URL based on deployment target
    if (isLocal) {
      // For local deployment, use localhost or custom host
      envVars.N8N_HOST_URL = options.host || process.env.N8N_HOST || 'http://localhost:5678';
      envVars.N8N_API_KEY = process.env.N8N_API_KEY || '';
    } else {
      // For cloud deployment, use configured cloud URL
      envVars.N8N_HOST_URL = process.env.N8N_HOST_URL || process.env.N8N_WEBHOOK_URL || process.env.N8N_HOST || 'https://hyperformant.app.n8n.cloud';
      envVars.N8N_API_KEY = process.env.N8N_API_KEY || '';
    }

    console.log(`📍 Deploying to: ${envVars.N8N_HOST_URL}`);

    // Run the TypeScript deployment script with ts-node
    const child = spawn('npx', ['ts-node', deployScript], {
      stdio: 'inherit',
      env: envVars,
      cwd: process.cwd(),
    });

    child.on('close', (code: number | null) => {
      if (code === 0) {
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

// Infisical management functions
async function waitForService(serviceName: string, healthCheck: () => Promise<boolean>, maxAttempts: number = 30): Promise<boolean> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      if (await healthCheck()) {
        return true;
      }
    } catch {
      // Continue waiting
    }
    process.stdout.write('.');
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

async function setupInfisical() {
  console.log(`${c.bright}${c.green}🔐 Setting up Infisical Secret Management...${c.reset}\n`);

  // Wait for Infisical to be ready
  console.log(`${c.dim}⏳ Waiting for Infisical to start...${c.reset}`);
  
  const infisicalReady = await waitForService('Infisical', async () => {
    try {
      const response = await fetch('http://localhost:8080/api/status');
      return response.ok;
    } catch {
      return false;
    }
  });

  if (!infisicalReady) {
    console.log(`\n${c.red}❌ Infisical failed to start. Check Docker logs.${c.reset}`);
    process.exit(1);
  }

  console.log(`\n${c.green}✅ Infisical is ready!${c.reset}\n`);

  // Show setup instructions
  console.log(`${c.bright}${c.cyan}📋 Infisical Setup Instructions:${c.reset}\n`);
  console.log(`1. ${c.yellow}Open Infisical:${c.reset} ${c.cyan}http://localhost:8080${c.reset}`);
  console.log(`2. ${c.yellow}Create admin account:${c.reset} admin@hyperformant.io`);
  console.log(`3. ${c.yellow}Create organization:${c.reset} 'Hyperformant'`);
  console.log(`4. ${c.yellow}Create project:${c.reset} 'hyperformant-secrets'`);
  console.log(`5. ${c.yellow}Create environments:${c.reset} development, staging, production`);
  console.log(`6. ${c.yellow}Generate service tokens${c.reset} for each environment\n`);

  console.log(`${c.bright}${c.magenta}🔑 Next Steps:${c.reset}\n`);
  console.log(`${c.dim}After creating service tokens, add them to .env.local:${c.reset}`);
  console.log(`   ${c.green}INFISICAL_TOKEN_DEV=<development-service-token>${c.reset}`);
  console.log(`   ${c.green}INFISICAL_TOKEN_STAGING=<staging-service-token>${c.reset}`);
  console.log(`   ${c.green}INFISICAL_TOKEN_PROD=<production-service-token>${c.reset}\n`);

  console.log(`${c.dim}Then run:${c.reset} ${c.cyan}hyperformant secrets migrate${c.reset} ${c.dim}to migrate existing secrets${c.reset}\n`);

  // Open Infisical in browser
  setTimeout(() => {
    console.log(`${c.bright}${c.cyan}🌐 Opening Infisical...${c.reset}`);
    openBrowser('http://localhost:8080');
  }, 2000);
}

async function migrateSecretsToInfisical() {
  console.log(`${c.bright}${c.yellow}🔄 Migrating secrets to Infisical...${c.reset}\n`);

  // Check if Infisical CLI is available
  try {
    execSync('which infisical', { stdio: 'ignore' });
  } catch {
    console.log(`${c.red}❌ Infisical CLI not found${c.reset}`);
    console.log(`${c.dim}Please install Infisical CLI first:${c.reset}`);
    console.log(`${c.green}curl -1sLf https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh | sudo -E bash${c.reset}`);
    console.log(`${c.green}sudo apt-get update && sudo apt-get install infisical${c.reset}\n`);
    return;
  }

  // Load current environment variables
  const envConfig = loadEnvironment();
  
  // Check for Infisical service token
  const infisicalToken = envConfig.INFISICAL_TOKEN_DEV;
  if (!infisicalToken) {
    console.log(`${c.red}❌ INFISICAL_TOKEN_DEV not found in environment${c.reset}`);
    console.log(`${c.dim}Please set up Infisical first with: hyperformant secrets setup${c.reset}`);
    return;
  }

  // Secrets to migrate
  const secretsToMigrate = [
    { key: 'OPENAI_API_KEY', description: 'OpenAI API Key for GPT models' },
    { key: 'ANTHROPIC_API_KEY', description: 'Anthropic API Key for Claude models' },
    { key: 'GOOGLE_AI_API_KEY', description: 'Google AI API Key for Gemini models' },
    { key: 'APOLLO_API_KEY', description: 'Apollo.io API Key for CRM integration' },
    { key: 'PLAUSIBLE_API_KEY', description: 'Plausible Analytics API Key' },
    { key: 'RESEND_API_KEY', description: 'Resend Email Service API Key' },
  ];

  console.log(`${c.dim}Checking current secrets...${c.reset}\n`);
  
  const foundSecrets = [];
  const missingSecrets = [];
  
  for (const secret of secretsToMigrate) {
    const value = envConfig[secret.key];
    if (value && value.trim() !== '') {
      foundSecrets.push({ ...secret, value });
      console.log(`  ✅ ${secret.key} - ${c.dim}${secret.description}${c.reset}`);
    } else {
      missingSecrets.push(secret);
      console.log(`  ${c.yellow}⚠️ ${secret.key} - ${c.dim}not found (will skip)${c.reset}`);
    }
  }

  if (foundSecrets.length === 0) {
    console.log(`\n${c.yellow}No secrets found to migrate.${c.reset}`);
    console.log(`${c.dim}Add your API keys to .env.local first, then run migration again.${c.reset}\n`);
    return;
  }

  console.log(`\n${c.bright}${c.cyan}🚀 Migrating ${foundSecrets.length} secrets to Infisical...${c.reset}\n`);

  let successCount = 0;
  let failureCount = 0;

  // Generate INTERNAL_API_KEY if it doesn't exist
  if (!envConfig.INTERNAL_API_KEY) {
    console.log(`${c.dim}Generating INTERNAL_API_KEY...${c.reset}`);
    try {
      const crypto = require('crypto');
      const internalApiKey = crypto.randomBytes(32).toString('hex');
      execSync(`infisical secrets set INTERNAL_API_KEY="${internalApiKey}" --env=development`, { stdio: 'inherit' });
      console.log(`  ${c.green}✅ INTERNAL_API_KEY generated and stored${c.reset}`);
      successCount++;
    } catch (error) {
      console.log(`  ${c.red}❌ Failed to generate INTERNAL_API_KEY${c.reset}`);
      failureCount++;
    }
  }

  // Migrate existing secrets
  for (const secret of foundSecrets) {
    console.log(`${c.dim}Migrating ${secret.key}...${c.reset}`);
    try {
      execSync(`infisical secrets set ${secret.key}="${secret.value}" --env=development`, { stdio: 'inherit' });
      console.log(`  ${c.green}✅ ${secret.key} migrated successfully${c.reset}`);
      successCount++;
    } catch (error) {
      console.log(`  ${c.red}❌ Failed to migrate ${secret.key}${c.reset}`);
      failureCount++;
    }
  }

  // Report results
  console.log(`\n${c.bright}${c.green}🎉 Migration Complete!${c.reset}`);
  console.log(`  Successful: ${c.green}${successCount}${c.reset}`);
  if (failureCount > 0) {
    console.log(`  Failed: ${c.red}${failureCount}${c.reset}`);
  }

  console.log(`\n${c.bright}${c.white}📋 Next Steps:${c.reset}`);
  console.log(`1. ${c.cyan}Open Infisical Dashboard:${c.reset} http://localhost:8080`);
  console.log(`2. ${c.cyan}Verify secrets:${c.reset} Check that all secrets were added`);
  console.log(`3. ${c.cyan}Test your app:${c.reset} Restart with npm run dev`);
  console.log(`4. ${c.cyan}Remove from .env.local:${c.reset} Comment out migrated secrets\n`);

  if (missingSecrets.length > 0) {
    console.log(`${c.yellow}⚠️ Add these optional secrets manually in Infisical UI:${c.reset}`);
    for (const secret of missingSecrets) {
      console.log(`   - ${secret.key}: ${secret.description}`);
    }
    console.log('');
  }
}

async function checkInfisicalStatus() {
  console.log(`${c.bright}${c.cyan}🔍 Checking Infisical status...${c.reset}\n`);

  try {
    // Check if Infisical container is running
    const containerStatus = execSync('docker compose ps infisical', { encoding: 'utf8' });
    if (containerStatus.includes('Up')) {
      console.log(`${c.green}✅ Infisical container is running${c.reset}`);
      
      // Check if Infisical API is responding
      try {
        const response = await fetch('http://localhost:8080/api/status');
        if (response.ok) {
          console.log(`${c.green}✅ Infisical API is responding${c.reset}`);
          
          // Check for service tokens
          const envConfig = loadEnvironment();
          const tokens = ['INFISICAL_TOKEN_DEV', 'INFISICAL_TOKEN_STAGING', 'INFISICAL_TOKEN_PROD'];
          let tokenCount = 0;
          
          tokens.forEach(token => {
            if (envConfig[token]) {
              console.log(`${c.green}✅ ${token} configured${c.reset}`);
              tokenCount++;
            } else {
              console.log(`${c.yellow}⚠️ ${token} not configured${c.reset}`);
            }
          });
          
          if (tokenCount === 0) {
            console.log(`\n${c.yellow}🔑 No service tokens configured. Run: hyperformant secrets setup${c.reset}`);
          } else {
            console.log(`\n${c.green}🎉 Infisical is ready with ${tokenCount}/3 environments configured${c.reset}`);
          }
          
        } else {
          console.log(`${c.red}❌ Infisical API returned status: ${response.status}${c.reset}`);
        }
      } catch (error) {
        console.log(`${c.red}❌ Cannot reach Infisical API: ${(error as Error).message}${c.reset}`);
      }
    } else {
      console.log(`${c.red}❌ Infisical container is not running${c.reset}`);
      console.log(`${c.dim}Start with: docker compose up -d infisical${c.reset}`);
    }
  } catch (error) {
    console.log(`${c.red}❌ Failed to check Infisical container status${c.reset}`);
    console.log(`${c.dim}Error: ${(error as Error).message}${c.reset}`);
  }
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
  execSync('docker compose up -d', { stdio: 'inherit' });

  // Wait for PostgreSQL
  console.log(`\n⏳ Waiting for PostgreSQL to be ready...`);
  const pgReady = await waitForService('PostgreSQL', async () => {
    try {
      execSync('docker compose exec -T postgres pg_isready -U postgres -d hyperformant', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  });

  if (!pgReady) {
    console.log(`\n${c.red}PostgreSQL failed to start. Check Docker logs.${c.reset}`);
    process.exit(1);
  }

  console.log(`\n✅ PostgreSQL is ready!`);

  // Wait for Redis
  console.log(`\n⏳ Waiting for Redis to be ready...`);
  const redisReady = await waitForService('Redis', async () => {
    try {
      execSync('docker compose exec -T redis redis-cli ping', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  });

  if (!redisReady) {
    console.log(`\n${c.red}Redis failed to start. Check Docker logs.${c.reset}`);
    process.exit(1);
  }

  console.log(`\n✅ Redis is ready!`);

  // Run Prisma database migrations
  console.log(`\n🔄 Setting up Next.js database...`);
  execSync(
    'cd web && npx prisma migrate dev --name initial_consolidated_schema',
    { stdio: 'inherit' }
  );
  execSync('cd web && npx prisma db seed', { stdio: 'inherit' });

  // Set up Infisical
  await setupInfisical();

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

  // Check if Docker daemon is running
  console.log(`${c.dim}🐳 Checking Docker daemon...${c.reset}`);
  if (!isDockerRunning()) {
    console.log(getDockerStartInstructions());
    process.exit(1);
  }
  console.log(`${c.green}✅ Docker daemon is running${c.reset}`);

  // Check if Docker services are running
  try {
    execSync('docker compose ps | grep -q "Up"', { stdio: 'ignore' });
    console.log(`${c.green}✅ Docker services already running${c.reset}`);
  } catch {
    console.log(`${c.yellow}🐳 Starting Docker services...${c.reset}`);
    try {
      execSync('docker compose up -d', { stdio: 'inherit' });
    } catch (error) {
      console.log(`\n${c.red}❌ Failed to start Docker services${c.reset}`);
      console.log(
        `${c.dim}Please check your docker-compose.yml configuration${c.reset}`
      );
      process.exit(1);
    }

    // Wait for PostgreSQL to be ready
    console.log(`${c.dim}⏳ Waiting for PostgreSQL...${c.reset}`);
    let pgReady = false;
    let attempts = 0;
    while (!pgReady && attempts < 30) {
      try {
        execSync(
          'docker compose exec -T postgres pg_isready -U postgres -d hyperformant',
          {
            stdio: 'ignore',
            cwd: process.cwd(),
          }
        );
        pgReady = true;
      } catch {
        process.stdout.write('.');
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!pgReady) {
      console.log(
        `\n${c.red}❌ PostgreSQL failed to start. Check Docker logs.${c.reset}`
      );
      process.exit(1);
    }
    console.log(`\n${c.green}✅ PostgreSQL is ready!${c.reset}`);
  }

  // Check if database needs migration
  const webDir = path.join(process.cwd(), 'web');
  const prismaEnv = {
    ...process.env,
    NODE_ENV: 'development',
    DATABASE_URL: process.env.DATABASE_URL,
  };

  try {
    console.log(`${c.dim}🔍 Checking database schema...${c.reset}`);
    execSync('npx prisma migrate status', {
      stdio: 'ignore',
      cwd: process.cwd(),
      env: prismaEnv,
    });
    console.log(`${c.green}✅ Database schema is up to date${c.reset}`);
  } catch {
    console.log(`${c.yellow}🔄 Running database migrations...${c.reset}`);
    try {
      execSync('npx prisma migrate dev --name auto_migration', {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: prismaEnv,
      });
      console.log(`${c.green}✅ Database migrations completed${c.reset}`);

      // Run seed if needed
      console.log(
        `${c.yellow}🌱 Seeding database with initial data...${c.reset}`
      );
      execSync('npx prisma db seed', {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: prismaEnv,
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
  } catch {
    // Ignore errors if .next directory doesn't exist
  }

  // Check if Infisical CLI is available and configured
  let useInfisical = false;
  try {
    execSync('which infisical', { stdio: 'ignore' });
    // Check if Infisical is initialized for this project
    const infisicalConfigPath = path.join(process.cwd(), '.infisical.json');
    if (fs.existsSync(infisicalConfigPath)) {
      useInfisical = true;
      console.log(`${c.green}🔐 Infisical CLI configured - using secret injection${c.reset}`);
    } else {
      console.log(`${c.yellow}⚠️ Infisical CLI not initialized - using .env.local fallback${c.reset}`);
      console.log(`${c.dim}   Run 'infisical init' to connect to Infisical project${c.reset}`);
    }
  } catch {
    console.log(`${c.yellow}⚠️ Infisical CLI not found - using .env.local fallback${c.reset}`);
    console.log(`${c.dim}   Install Infisical CLI for automatic secret injection${c.reset}`);
  }

  // Start Next.js development server
  console.log(`${c.yellow}Starting Next.js development server...${c.reset}\n`);

  let nextjsReady = false;
  const npmScript = useInfisical ? 'dev' : 'dev:fallback';

  nextjsDevProcess = spawn('npm', ['run', npmScript], {
    stdio: 'pipe',
    shell: true,
    detached: true,
    cwd: path.join(process.cwd(), 'web'),
  });

  // Capture Next.js output to detect port changes
  if (nextjsDevProcess.stdout) {
    nextjsDevProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      process.stdout.write(output); // Still show the output
      
      // Look for port information in Next.js output
      const portMatch = output.match(/Local:\s+http:\/\/localhost:(\d+)/);
      if (portMatch) {
        const detectedPort = parseInt(portMatch[1]);
        updateServiceUrls(detectedPort);
      }
      
      // Check if Next.js is ready
      if (output.includes('✓ Ready in') && !nextjsReady) {
        nextjsReady = true;
        // Show service URLs after Next.js is ready and we've detected the port
        setTimeout(() => showServiceUrls(), 1000);
      }
    });
  }

  if (nextjsDevProcess.stderr) {
    nextjsDevProcess.stderr.on('data', (data: Buffer) => {
      process.stderr.write(data.toString());
    });
  }

  // Start Prisma Studio
  console.log(`${c.yellow}Starting Prisma Studio...${c.reset}\n`);

  prismaStudioProcess = spawn('npm', ['run', 'db:studio'], {
    //cwd: path.join(process.cwd(), 'web'),
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: true,
    detached: true,
  });

  // If Next.js doesn't start properly, show default URLs as fallback
  setTimeout(() => {
    if (!nextjsReady) {
      console.log(`${c.yellow}⚠️ Next.js seems to be taking longer than expected...${c.reset}`);
      showServiceUrls(); // Show with default ports if detection fails
    }
  }, 10000);

  // Handle process exit
  if (nextjsDevProcess) {
    nextjsDevProcess.on('exit', code => {
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
      await new Promise<void>(resolve => {
        const timeout = setTimeout(() => {
          // Force kill if not stopped gracefully
          try {
            if (nextjsDevProcess?.pid) {
              process.kill(-nextjsDevProcess.pid, 'SIGKILL');
            }
          } catch {
            // Process might have already exited
          }
          resolve();
        }, 5000);

        nextjsDevProcess?.on('exit', () => {
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
      await new Promise<void>(resolve => {
        const timeout = setTimeout(() => {
          try {
            if (prismaStudioProcess?.pid) {
              process.kill(-prismaStudioProcess.pid, 'SIGKILL');
            }
          } catch {
            // Process might have already exited
          }
          resolve();
        }, 3000);

        prismaStudioProcess?.on('exit', () => {
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
    execSync('docker compose down', { stdio: 'ignore' });
    console.log(`${c.green}✅ Docker containers stopped${c.reset}`);
  } catch (error) {
    console.log(`${c.red}Error stopping Docker services${c.reset}`);
  }

  console.log(`${c.green}✅ All services stopped${c.reset}\n`);
  process.exit(0);
});

// Agent command implementations
async function listAgents() {
  try {
    const agentExecutor = new AgentExecutor();
    const agents = await agentExecutor.listAgents();
    
    if (agents.length === 0) {
      console.log(`${c.yellow}No agents found in agents/ directory${c.reset}`);
      return;
    }

    console.log(`${c.bright}${c.green}Available Agents:${c.reset}\n`);
    
    for (const agentName of agents) {
      try {
        const config = await agentExecutor.loadAgent(agentName);
        console.log(`${c.cyan}▶ ${agentName}${c.reset}`);
        console.log(`  ${c.dim}${config.description}${c.reset}`);
        if (config.schedule) {
          console.log(`  ${c.dim}Schedule: ${config.schedule}${c.reset}`);
        }
        console.log('');
      } catch (error) {
        console.log(`${c.red}▶ ${agentName} ${c.dim}(configuration error)${c.reset}`);
      }
    }
    
    await agentExecutor.cleanup();
  } catch (error) {
    logger.error('Failed to list agents', undefined, error as Error);
    process.exit(1);
  }
}

async function runAgent(agentName: string, options: any = {}) {
  try {
    const agentExecutor = new AgentExecutor();
    
    console.log(`${c.bright}${c.cyan}🤖 Starting agent: ${agentName}${c.reset}\n`);
    
    const execution = await agentExecutor.runAgent(agentName, {
      test_mode: options.testMode || false,
      batch_size: options.batchSize || undefined,
      ...options
    });
    
    if (execution.status === 'completed') {
      console.log(`${c.green}✅ Agent completed successfully${c.reset}`);
      console.log(`${c.dim}Execution ID: ${execution.id}${c.reset}`);
      console.log(`${c.dim}Duration: ${execution.completedAt!.getTime() - execution.startedAt.getTime()}ms${c.reset}\n`);
      
      if (execution.stepResults && Object.keys(execution.stepResults).length > 0) {
        console.log(`${c.bright}Step Results:${c.reset}`);
        for (const [stepName, result] of Object.entries(execution.stepResults)) {
          if (typeof result === 'object' && result !== null) {
            console.log(`  ${c.cyan}${stepName}:${c.reset} ${JSON.stringify(result, null, 2).substring(0, 100)}...`);
          } else {
            console.log(`  ${c.cyan}${stepName}:${c.reset} ${result}`);
          }
        }
      }
    } else {
      console.log(`${c.red}❌ Agent failed${c.reset}`);
      console.log(`${c.dim}Error: ${execution.error}${c.reset}`);
      process.exit(1);
    }
    
    await agentExecutor.cleanup();
  } catch (error) {
    logger.error(`Failed to run agent: ${agentName}`, undefined, error as Error);
    process.exit(1);
  }
}

async function deployAgent(agentName: string, options: any = {}) {
  try {
    console.log(`${c.bright}${c.yellow}📦 Deploying agent: ${agentName}${c.reset}\n`);
    
    const agentExecutor = new AgentExecutor();
    
    // Validate agent configuration
    const config = await agentExecutor.loadAgent(agentName);
    console.log(`${c.green}✅ Agent configuration valid${c.reset}`);
    
    // If agent has a schedule, it will be deployed for scheduled execution
    if (config.schedule) {
      console.log(`${c.cyan}📅 Agent scheduled: ${config.schedule}${c.reset}`);
      
      if (options.activateSchedule) {
        await agentExecutor.scheduleAgents();
        console.log(`${c.green}✅ Agent scheduled and activated${c.reset}`);
        
        // Keep the process running to maintain schedules
        console.log(`${c.dim}Press Ctrl+C to stop scheduled agents${c.reset}\n`);
        
        process.on('SIGINT', async () => {
          console.log(`\n${c.yellow}Stopping scheduled agents...${c.reset}`);
          await agentExecutor.cleanup();
          process.exit(0);
        });
        
        // Keep process alive
        setInterval(() => {}, 1000);
      }
    } else {
      console.log(`${c.dim}Agent has no schedule - deploy completed${c.reset}`);
    }
    
    if (!options.activateSchedule) {
      await agentExecutor.cleanup();
    }
    
  } catch (error) {
    logger.error(`Failed to deploy agent: ${agentName}`, undefined, error as Error);
    process.exit(1);
  }
}

async function runOrchestrator(options: any = {}) {
  try {
    const agentExecutor = new AgentExecutor();
    
    console.log(`${c.bright}${c.magenta}🎯 Starting orchestrator${c.reset}`);
    console.log(`${c.dim}Mode: ${options.mode || 'daily'}${c.reset}`);
    if (options.testMode) {
      console.log(`${c.yellow}⚠️ Test mode enabled${c.reset}`);
    }
    console.log('');
    
    await agentExecutor.runOrchestrator(options.mode || 'daily', {
      test_mode: options.testMode || false,
      batch_size: options.batchSize || undefined,
      ...options
    });
    
    console.log(`${c.green}🎉 Orchestration completed${c.reset}\n`);
    
    await agentExecutor.cleanup();
  } catch (error) {
    logger.error('Orchestration failed', undefined, error as Error);
    process.exit(1);
  }
}

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
      y.option('local', {
        type: 'boolean',
        default: false,
        describe: 'Deploy to local N8N instance instead of cloud',
      });
      y.option('host', {
        type: 'string',
        describe: 'Local N8N host URL (default: http://localhost:5678)',
      });
    },
    async argv => {
      await importWorkflows(argv.env as string, {
        local: argv.local,
        host: argv.host,
      });
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
      console.log(
        `\n${c.bright}Run ${c.green}hyperformant dev${c.reset} ${c.bright}to start the development server${c.reset}\n`
      );
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
  .command(
    'secrets',
    'Secret management commands (Infisical)',
    yargs => {
      return yargs
        .command(
          'setup',
          'Set up Infisical secret management',
          {},
          async () => {
            await setupInfisical();
          }
        )
        .command(
          'status',
          'Check Infisical status and configuration',
          {},
          async () => {
            await checkInfisicalStatus();
          }
        )
        .command(
          'migrate',
          'Migrate secrets from environment to Infisical',
          {},
          async () => {
            await migrateSecretsToInfisical();
          }
        )
        .demandCommand(1, 'Please specify a secrets command')
        .help();
    }
  )
  .command(
    'agent',
    'Agent management commands',
    yargs => {
      return yargs
        .command(
          'list',
          'List all available agents',
          {},
          async () => {
            await listAgents();
          }
        )
        .command(
          'run <agent-name>',
          'Run a specific agent',
          y => {
            y.positional('agent-name', {
              type: 'string',
              describe: 'Name of the agent to run',
            });
            y.option('test-mode', {
              type: 'boolean',
              default: false,
              describe: 'Run agent in test mode',
            });
            y.option('batch-size', {
              type: 'number',
              describe: 'Override default batch size',
            });
          },
          async argv => {
            await runAgent(argv.agentName as string, {
              testMode: argv.testMode,
              batchSize: argv.batchSize,
            });
          }
        )
        .command(
          'deploy <agent-name>',
          'Deploy an agent (validate configuration and optionally activate schedule)',
          y => {
            y.positional('agent-name', {
              type: 'string',
              describe: 'Name of the agent to deploy',
            });
            y.option('activate-schedule', {
              type: 'boolean',
              default: false,
              describe: 'Activate scheduled execution after deployment',
            });
          },
          async argv => {
            await deployAgent(argv.agentName as string, {
              activateSchedule: argv.activateSchedule,
            });
          }
        )
        .command(
          'orchestrate',
          'Run the orchestrator to coordinate multiple agents',
          y => {
            y.option('mode', {
              type: 'string',
              default: 'daily',
              describe: 'Orchestration mode (daily, manual, etc.)',
            });
            y.option('test-mode', {
              type: 'boolean',
              default: false,
              describe: 'Run orchestrator in test mode',
            });
            y.option('batch-size', {
              type: 'number',
              describe: 'Override default batch size for agents',
            });
          },
          async argv => {
            await runOrchestrator({
              mode: argv.mode,
              testMode: argv.testMode,
              batchSize: argv.batchSize,
            });
          }
        )
        .demandCommand(1, 'Please specify an agent command')
        .help();
    }
  )
  .demandCommand(1)
  .help()
  .alias('h', 'help')
  .parse();
