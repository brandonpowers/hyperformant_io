/**
 * Agent Execution System
 * 
 * Provides a minimal, modular system for running YAML-defined agents
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { logger } from '../logger';
import { PrismaClient } from '@prisma/client';
import * as cron from 'node-cron';

export interface AgentConfig {
  name: string;
  version: string;
  description: string;
  schedule?: string;
  dependencies?: string[];
  timeout?: number;
  retry?: {
    attempts: number;
    delay: number;
  };
  environment?: {
    required?: string[];
    optional?: string[];
  };
  config?: Record<string, any>;
  steps: AgentStep[];
  notifications?: {
    on_success?: NotificationConfig[];
    on_failure?: NotificationConfig[];
  };
}

export interface AgentStep {
  name: string;
  type: string;
  description?: string;
  condition?: string;
  endpoint?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  query?: string;
  operation?: string;
  table?: string;
  input?: any;
  output?: string;
  iterate?: string;
  script?: string;
  level?: string;
  message?: string;
  [key: string]: any;
}

export interface NotificationConfig {
  type: string;
  level?: string;
  message?: string;
  condition?: string;
}

export interface AgentExecution {
  id: string;
  agentName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  results?: Record<string, any>;
  stepResults?: Record<string, any>;
}

export class AgentExecutor {
  private prisma: PrismaClient;
  private agentsDir: string;
  private runningAgents: Map<string, AgentExecution> = new Map();
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  constructor(agentsDir: string = 'agents') {
    this.prisma = new PrismaClient();
    this.agentsDir = path.resolve(agentsDir);
  }

  /**
   * Load agent configuration from YAML file
   */
  async loadAgent(agentName: string): Promise<AgentConfig> {
    const agentPath = path.join(this.agentsDir, `${agentName}.agent.yaml`);
    
    if (!fs.existsSync(agentPath)) {
      throw new Error(`Agent configuration not found: ${agentPath}`);
    }

    try {
      const agentContent = fs.readFileSync(agentPath, 'utf8');
      const agentConfig = yaml.load(agentContent) as AgentConfig;
      
      this.validateAgentConfig(agentConfig);
      return agentConfig;
    } catch (error) {
      throw new Error(`Failed to load agent configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all available agents
   */
  async listAgents(): Promise<string[]> {
    if (!fs.existsSync(this.agentsDir)) {
      return [];
    }

    return fs.readdirSync(this.agentsDir)
      .filter(file => file.endsWith('.agent.yaml'))
      .map(file => file.replace('.agent.yaml', ''));
  }

  /**
   * Execute a single agent
   */
  async runAgent(agentName: string, params: Record<string, any> = {}): Promise<AgentExecution> {
    const agentConfig = await this.loadAgent(agentName);
    const executionId = `${agentName}-${Date.now()}`;
    
    logger.info(`Starting agent execution: ${agentName}`, { executionId });

    const execution: AgentExecution = {
      id: executionId,
      agentName,
      status: 'running',
      startedAt: new Date(),
      stepResults: {}
    };

    this.runningAgents.set(executionId, execution);

    try {
      // Validate environment variables
      this.validateEnvironment(agentConfig);

      // Execute agent steps
      for (const step of agentConfig.steps) {
        logger.info(`Executing step: ${step.name}`, { agentName, executionId });
        
        const stepResult = await this.executeStep(step, execution, params);
        execution.stepResults![step.name] = stepResult;

        if (step.output) {
          execution.stepResults![step.output] = stepResult;
        }
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.results = { success: true, steps: Object.keys(execution.stepResults!) };

      logger.info(`Agent execution completed: ${agentName}`, { 
        executionId, 
        duration: execution.completedAt.getTime() - execution.startedAt.getTime() 
      });

      // Send success notifications
      await this.sendNotifications(agentConfig.notifications?.on_success, execution);

    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.error = error instanceof Error ? error.message : String(error);

      logger.error(`Agent execution failed: ${agentName}`, { 
        executionId, 
        error: error instanceof Error ? error.message : String(error)
      });

      // Send failure notifications  
      await this.sendNotifications(agentConfig.notifications?.on_failure, execution, error instanceof Error ? error : new Error(String(error)));
    }

    return execution;
  }

  /**
   * Execute orchestrator (run multiple agents with dependencies)
   */
  async runOrchestrator(mode: string = 'daily', options: Record<string, any> = {}): Promise<void> {
    logger.info('Starting orchestrator', { mode, options });

    const orchestratorConfig = await this.loadAgent('orchestrator');
    
    // Execute orchestrator agent which will coordinate other agents
    await this.runAgent('orchestrator', { mode, ...options });
  }

  /**
   * Schedule agents based on their cron schedules
   */
  async scheduleAgents(): Promise<void> {
    const agents = await this.listAgents();
    
    for (const agentName of agents) {
      const agentConfig = await this.loadAgent(agentName);
      
      if (agentConfig.schedule) {
        logger.info(`Scheduling agent: ${agentName}`, { schedule: agentConfig.schedule });
        
        const task = cron.schedule(agentConfig.schedule, async () => {
          logger.info(`Scheduled execution starting: ${agentName}`);
          await this.runAgent(agentName);
        });

        this.scheduledJobs.set(agentName, task);
        task.start();
      }
    }

    logger.info(`Scheduled ${this.scheduledJobs.size} agents`);
  }

  /**
   * Get execution status
   */
  getExecution(executionId: string): AgentExecution | undefined {
    return this.runningAgents.get(executionId);
  }

  /**
   * List all running executions
   */
  getRunningExecutions(): AgentExecution[] {
    return Array.from(this.runningAgents.values())
      .filter(exec => exec.status === 'running');
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: AgentStep, execution: AgentExecution, params: Record<string, any>): Promise<any> {
    // Evaluate condition if present
    if (step.condition && !this.evaluateCondition(step.condition, execution, params)) {
      logger.info(`Step skipped due to condition: ${step.name}`);
      return null;
    }

    switch (step.type) {
      case 'api-call':
        return await this.executeApiCall(step);
      
      case 'database-query':
        return await this.executeDatabaseQuery(step);
      
      case 'database-operation':
        return await this.executeDatabaseOperation(step);
      
      case 'data-transform':
        return await this.executeDataTransform(step, execution);
      
      case 'webhook-call':
        return await this.executeWebhookCall(step);
      
      case 'log':
        return await this.executeLog(step, execution);
      
      case 'wait':
        return await this.executeWait(step);
      
      case 'agent-execution':
        return await this.executeAgentCall(step);
      
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executeApiCall(step: AgentStep): Promise<any> {
    const url = step.endpoint!;
    const method = step.method || 'GET';
    const headers = step.headers || {};
    
    logger.info(`API call: ${method} ${url}`);
    
    const response = await fetch(url, {
      method,
      headers,
      body: step.body ? JSON.stringify(step.body) : undefined
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async executeDatabaseQuery(step: AgentStep): Promise<any> {
    const query = step.query!;
    logger.info(`Database query: ${query.substring(0, 100)}...`);
    
    const result = await this.prisma.$queryRawUnsafe(query);
    return result;
  }

  private async executeDatabaseOperation(step: AgentStep): Promise<any> {
    const { operation, table, input } = step;
    
    if (!table) {
      throw new Error('Table name is required for database operations');
    }
    
    logger.info(`Database operation: ${operation} on ${table}`);
    
    // This is a simplified implementation - would need more robust handling
    switch (operation) {
      case 'insert':
        // Handle batch insert
        if (Array.isArray(input)) {
          return await (this.prisma as any)[table].createMany({ data: input });
        } else {
          return await (this.prisma as any)[table].create({ data: input });
        }
      
      case 'update':
        return await (this.prisma as any)[table].updateMany({
          where: step.where || {},
          data: step.set || input
        });
      
      case 'upsert':
        // This would need more sophisticated handling for batch upserts
        return await (this.prisma as any)[table].upsert({
          where: step.conflict_target ? { [step.conflict_target]: input[step.conflict_target] } : {},
          create: input,
          update: input
        });
      
      default:
        throw new Error(`Unknown database operation: ${operation}`);
    }
  }

  private async executeDataTransform(step: AgentStep, execution: AgentExecution): Promise<any> {
    const script = step.script!;
    const input = this.resolveInput(step.input, execution);
    
    // Create a safe execution context
    const context = {
      input,
      execution,
      Date,
      Math,
      JSON,
      console: logger
    };
    
    // This is a simplified implementation - would need proper sandboxing in production
    const func = new Function('input', 'execution', 'Date', 'Math', 'JSON', 'console', script);
    return func(input, execution, Date, Math, JSON, logger);
  }

  private async executeWebhookCall(step: AgentStep): Promise<any> {
    const url = step.endpoint!;
    const method = step.method || 'POST';
    const headers = step.headers || { 'Content-Type': 'application/json' };
    
    logger.info(`Webhook call: ${method} ${url}`);
    
    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(step.body)
    });

    if (!response.ok) {
      throw new Error(`Webhook call failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async executeLog(step: AgentStep, execution: AgentExecution): Promise<any> {
    const level = step.level || 'info';
    const message = this.resolveTemplate(step.message!, execution);
    
    (logger as any)[level](message, { agentName: execution.agentName, executionId: execution.id });
    return { logged: true, message };
  }

  private async executeWait(step: AgentStep): Promise<any> {
    const duration = step.duration * 1000; // Convert to milliseconds
    logger.info(`Waiting ${step.duration} seconds`);
    
    await new Promise(resolve => setTimeout(resolve, duration));
    return { waited: duration };
  }

  private async executeAgentCall(step: AgentStep): Promise<any> {
    const agentName = step.agent!;
    logger.info(`Executing sub-agent: ${agentName}`);
    
    const subExecution = await this.runAgent(agentName);
    return { 
      agent_id: subExecution.id,
      status: subExecution.status,
      executed: true
    };
  }

  private validateAgentConfig(config: AgentConfig): void {
    if (!config.name || !config.version || !config.steps) {
      throw new Error('Agent configuration must have name, version, and steps');
    }

    if (!Array.isArray(config.steps) || config.steps.length === 0) {
      throw new Error('Agent must have at least one step');
    }
  }

  private validateEnvironment(config: AgentConfig): void {
    const required = config.environment?.required || [];
    
    for (const envVar of required) {
      if (!process.env[envVar]) {
        throw new Error(`Required environment variable missing: ${envVar}`);
      }
    }
  }

  private evaluateCondition(condition: string, execution: AgentExecution, params: Record<string, any>): boolean {
    // Simplified condition evaluation - would need more robust implementation
    // For now, just check if it's a truthy string
    return condition === 'true' || condition.includes('env.');
  }

  private resolveInput(inputExpr: any, execution: AgentExecution): any {
    if (typeof inputExpr === 'string' && inputExpr.startsWith('{{')) {
      // Template resolution - simplified implementation
      return execution.stepResults;
    }
    return inputExpr;
  }

  private resolveTemplate(template: string, execution: AgentExecution): string {
    // Simple template resolution - would need more sophisticated implementation
    return template
      .replace(/\{\{\s*execution\.agentName\s*\}\}/g, execution.agentName)
      .replace(/\{\{\s*execution\.id\s*\}\}/g, execution.id);
  }

  private async sendNotifications(notifications: NotificationConfig[] = [], execution: AgentExecution, error?: Error): Promise<void> {
    for (const notification of notifications) {
      try {
        if (notification.type === 'log') {
          const level = notification.level || 'info';
          const message = this.resolveTemplate(notification.message!, execution);
          (logger as any)[level](message, { 
            agentName: execution.agentName, 
            executionId: execution.id,
            error: error?.message 
          });
        }
        // Additional notification types (slack, email, etc.) would be implemented here
      } catch (err) {
        logger.error('Failed to send notification', { error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Stop all scheduled jobs
    for (const [agentName, task] of this.scheduledJobs) {
      task.stop();
      logger.info(`Stopped scheduled agent: ${agentName}`);
    }
    this.scheduledJobs.clear();

    // Disconnect Prisma
    await this.prisma.$disconnect();
  }
}