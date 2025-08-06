#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// ANSI color codes
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Configuration
const config = {
  apiKey: process.env.N8N_API_KEY,
  workflowsDir: process.env.WORKFLOWS_DIR || './n8n/workflows',
  n8nHost: process.env.N8N_HOST || 'https://hyperformant.app.n8n.cloud',
};

// Extract instance name from host URL
const instanceName = config.n8nHost.replace('https://', '').replace('.app.n8n.cloud', '');
const apiUrl = `https://${instanceName}.app.n8n.cloud/api/v1`;

// Header
console.log(`
${c.bright}${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${c.reset}
${c.bright}${c.white}   🚀 N8N Workflow Deployment${c.reset}
   
${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
`);

// Validate configuration
if (!config.apiKey) {
  console.error(`${c.red}❌ Error: N8N_API_KEY environment variable is required${c.reset}`);
  console.log(`\n${c.dim}Set it with: export N8N_API_KEY="your-api-key"${c.reset}\n`);
  process.exit(1);
}

console.log(`📁 Workflows directory: ${c.cyan}${config.workflowsDir}${c.reset}`);
console.log(`🌐 N8N Host: ${c.cyan}${config.n8nHost}${c.reset}`);
console.log(`🔧 N8N API URL: ${c.cyan}${apiUrl}${c.reset}\n`);

// Check workflows directory
if (!fs.existsSync(config.workflowsDir)) {
  console.error(`${c.red}❌ Error: Workflows directory not found: ${config.workflowsDir}${c.reset}`);
  process.exit(1);
}

// Get workflow files
const workflowFiles = fs.readdirSync(config.workflowsDir)
  .filter(file => file.endsWith('.json'))
  .map(file => path.join(config.workflowsDir, file));

if (workflowFiles.length === 0) {
  console.error(`${c.red}❌ Error: No workflow JSON files found in ${config.workflowsDir}${c.reset}`);
  process.exit(1);
}

console.log(`📋 Found ${c.bright}${workflowFiles.length}${c.reset} workflow files to deploy\n`);

// Clean workflow data (remove N8N export metadata)
function cleanWorkflowData(workflow) {
  const cleaned = { ...workflow };
  
  // Remove read-only fields
  delete cleaned.id;
  delete cleaned.createdAt;
  delete cleaned.updatedAt;
  delete cleaned.triggerCount;
  delete cleaned.versionId;
  delete cleaned.tags;
  
  return cleaned;
}

// Deploy workflow via HTTPS
function deployWorkflow(workflowFile) {
  return new Promise((resolve, reject) => {
    const workflowName = path.basename(workflowFile, '.json');
    console.log(`📦 Processing: ${c.bright}${workflowName}${c.reset}`);
    
    // Read and clean workflow
    let workflowData;
    try {
      const rawData = fs.readFileSync(workflowFile, 'utf8');
      const parsedData = JSON.parse(rawData);
      workflowData = cleanWorkflowData(parsedData);
    } catch (error) {
      console.log(`  ❌ Failed to read/parse workflow file`);
      console.log(`  ${c.dim}Error: ${error.message}${c.reset}`);
      return resolve({ success: false, name: workflowName });
    }
    
    // Prepare request
    const postData = JSON.stringify(workflowData);
    const url = new URL(`${apiUrl}/workflows`);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    console.log(`  ➕ Creating/updating workflow...`);
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`  ${c.green}✅ Success!${c.reset}`);
          
          try {
            const response = JSON.parse(data);
            if (response.id) {
              console.log(`  📌 Workflow ID: ${c.dim}${response.id}${c.reset}`);
            }
          } catch {}
          
          resolve({ success: true, name: workflowName });
        } else {
          console.log(`  ${c.red}❌ Failed (HTTP ${res.statusCode})${c.reset}`);
          
          try {
            const error = JSON.parse(data);
            console.log(`  ${c.dim}Error: ${error.message || data}${c.reset}`);
          } catch {
            console.log(`  ${c.dim}Error: ${data}${c.reset}`);
          }
          
          resolve({ success: false, name: workflowName });
        }
        console.log();
      });
    });
    
    req.on('error', (error) => {
      console.log(`  ${c.red}❌ Request failed${c.reset}`);
      console.log(`  ${c.dim}Error: ${error.message}${c.reset}\n`);
      resolve({ success: false, name: workflowName });
    });
    
    req.write(postData);
    req.end();
  });
}

// Deploy all workflows
async function deployAllWorkflows() {
  const results = [];
  
  for (const workflowFile of workflowFiles) {
    const result = await deployWorkflow(workflowFile);
    results.push(result);
  }
  
  // Summary
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  console.log(`${c.bright}📊 Deployment Summary:${c.reset}`);
  console.log(`  ${c.green}✅ Successful: ${successCount}${c.reset}`);
  console.log(`  ${c.red}❌ Failed: ${failCount}${c.reset}`);
  console.log(`  📁 Total: ${results.length}\n`);
  
  if (failCount > 0) {
    console.log(`${c.yellow}⚠️  Some workflows failed to deploy${c.reset}`);
    process.exit(1);
  } else {
    console.log(`${c.bright}${c.green}🎉 All workflows deployed successfully!${c.reset}\n`);
    console.log(`${c.bright}📋 Next steps:${c.reset}`);
    console.log(`  1. Visit your N8N dashboard: ${c.cyan}${config.n8nHost}${c.reset}`);
    console.log(`  2. Verify workflows are active`);
    console.log(`  3. Test workflow executions\n`);
  }
}

// Run deployment
deployAllWorkflows().catch(error => {
  console.error(`${c.red}Unexpected error: ${error.message}${c.reset}`);
  process.exit(1);
});