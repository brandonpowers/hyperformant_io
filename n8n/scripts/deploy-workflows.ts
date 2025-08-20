/**
 * N8N Workflow Deployment Script
 * 
 * Deploys Hyperformant data collection workflows to N8N instance.
 */

import fs from 'fs';
import path from 'path';

// N8N API configuration
const N8N_BASE_URL = process.env.N8N_HOST_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';


interface WorkflowData {
  name: string;
  nodes: any[];
  connections: any;
  pinData?: any;
  settings?: any;
  staticData?: any;
  tags?: any[];
  active?: boolean;
}

class N8NDeployment {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey || '';
    console.log(`🔑 Using N8N API Key: ${this.apiKey ? 'Configured' : 'Not found'}`);
  }

  /**
   * Import a workflow from JSON file to N8N
   */
  async importWorkflow(workflowPath: string, activate: boolean = false): Promise<any> {
    try {
      console.log(`📄 Loading workflow from: ${workflowPath}`);
      
      // Read workflow file
      const workflowJson = fs.readFileSync(workflowPath, 'utf8');
      const workflowData: WorkflowData = JSON.parse(workflowJson);
      
      console.log(`🔄 Importing workflow: ${workflowData.name}`);

      // Clean the workflow data for API compatibility (remove read-only and extra fields)
      const cleanWorkflowData = {
        name: workflowData.name,
        nodes: workflowData.nodes,
        connections: workflowData.connections,
        settings: workflowData.settings || { executionOrder: "v1" },
        staticData: workflowData.staticData || null,
        ...(workflowData.pinData && Object.keys(workflowData.pinData).length > 0 && { pinData: workflowData.pinData })
      };

      // Check if workflow already exists
      const existingWorkflows = await this.getWorkflows();
      const existingWorkflow = existingWorkflows.find(
        (w: any) => w.name === workflowData.name
      );

      let result;
      
      if (existingWorkflow) {
        console.log(`📝 Updating existing workflow: ${workflowData.name}`);
        
        // Update existing workflow with PUT (N8N 1.107.4 requirement)
        result = await this.request(
          'PUT',
          `/api/v1/workflows/${existingWorkflow.id}`,
          cleanWorkflowData
        );
      } else {
        console.log(`✨ Creating new workflow: ${workflowData.name}`);
        
        // Create new workflow
        result = await this.request('POST', '/api/v1/workflows', cleanWorkflowData);
      }

      // Handle activation separately if requested
      if (activate && !result.active) {
        console.log(`⚡ Activating workflow: ${workflowData.name}`);
        try {
          // Try activating with the standard approach
          await this.activateWorkflow(result.id);
          console.log(`✅ Workflow activated successfully`);
        } catch (error) {
          console.log(`⚠️ Could not activate workflow: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      console.log(`✅ Successfully deployed: ${workflowData.name} (ID: ${result.id})`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to import workflow from ${workflowPath}:`, error);
      throw error;
    }
  }

  /**
   * Get all workflows from N8N
   */
  async getWorkflows(): Promise<any[]> {
    try {
      const response = await this.request('GET', '/api/v1/workflows');
      return response.data || response;
    } catch (error) {
      console.error('❌ Failed to get workflows:', error);
      return [];
    }
  }

  /**
   * Activate a workflow by ID
   */
  async activateWorkflow(workflowId: string): Promise<void> {
    try {
      // Try different activation endpoints for N8N 1.107.4
      // First try the toggle endpoint
      await this.request('POST', `/api/v1/workflows/${workflowId}/activate`, {});
    } catch (error) {
      // If that fails, try updating with active: true (if allowed)
      throw new Error(`Activation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Test workflow webhook endpoint
   */
  async testWebhook(webhookPath: string, testData: any = {}): Promise<any> {
    try {
      console.log(`🧪 Testing webhook: ${webhookPath}`);
      
      const response = await fetch(`${this.baseUrl}/webhook/${webhookPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Webhook test successful: ${webhookPath}`);
      return result;
      
    } catch (error) {
      console.error(`❌ Webhook test failed: ${webhookPath}`, error);
      throw error;
    }
  }

  /**
   * Make HTTP request to N8N API
   */
  private async request(method: string, path: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'X-N8N-API-KEY': this.apiKey })
      }
    };

    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`N8N API Error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return await response.json();
  }
}

/**
 * Deploy all workflows from n8n/workflows directory
 */
async function deployAllWorkflows() {
  console.log('🚀 Deploying Hyperformant N8N Workflows...\n');

  const deployment = new N8NDeployment(N8N_BASE_URL, N8N_API_KEY);
  const workflowsDir = path.join(__dirname, '../workflows');
  
  try {
    // Check if workflows directory exists
    if (!fs.existsSync(workflowsDir)) {
      console.error(`❌ Workflows directory not found: ${workflowsDir}`);
      process.exit(1);
    }

    // Get all workflow JSON files
    const workflowFiles = fs.readdirSync(workflowsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(workflowsDir, file));

    if (workflowFiles.length === 0) {
      console.log('ℹ️ No workflow files found to deploy');
      return;
    }

    console.log(`📦 Found ${workflowFiles.length} workflow(s) to deploy:\n`);

    // Deploy each workflow
    const results = [];
    for (const workflowFile of workflowFiles) {
      try {
        const result = await deployment.importWorkflow(workflowFile, true);
        results.push({ file: workflowFile, success: true, result });
        console.log('');
      } catch (error) {
        results.push({ file: workflowFile, success: false, error });
        console.log('');
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`📊 Deployment Summary:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log('');

    if (failed > 0) {
      console.log('❌ Failed deployments:');
      results.filter(r => !r.success).forEach(r => {
        const errorMessage = r.error instanceof Error ? r.error.message : String(r.error);
        console.log(`   - ${path.basename(r.file)}: ${errorMessage}`);
      });
      console.log('');
    }

    // Test webhook endpoints
    console.log('🧪 Testing webhook endpoints...\n');
    
    try {
      await deployment.testWebhook('apollo-sync', { 
        test: true, 
        trigger: 'manual',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.log('⚠️ Apollo sync webhook not yet available (normal for first deployment)');
    }

    console.log('🎉 N8N deployment completed!');
    console.log(`🌐 Access N8N Editor: ${N8N_BASE_URL}`);

  } catch (error) {
    console.error('💥 Deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment if called directly
if (require.main === module) {
  deployAllWorkflows()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default deployAllWorkflows;