/**
 * Dynamic AI Execution Engine
 * Intelligently selects and executes AI models based on task requirements
 */

import { db } from '@/lib/db';
import { decryptCredentialData } from '@/lib/encryption';
import { secretManager } from '@/lib/infisical';

export interface AITaskRequest {
  taskType: 'analysis' | 'creative' | 'coding' | 'reasoning' | 'embedding' | 'vision' | 'chat';
  content: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  maxCost?: number; // Maximum cost in USD
  maxLatency?: number; // Maximum latency in ms
  capabilities?: string[]; // Required capabilities
  modelPreferences?: {
    providerId?: string;
    modelId?: string;
    minQualityScore?: number;
    minReliability?: number;
  };
  parameters?: Record<string, any>; // Model-specific parameters
  metadata?: Record<string, any>; // Task metadata for logging
}

export interface AITaskResponse {
  success: boolean;
  response?: string;
  model: {
    id: string;
    providerId: string;
    modelId: string;
    name: string;
    provider: string;
  };
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cost?: number;
    latencyMs: number;
  };
  metadata: {
    taskId: string;
    timestamp: string;
    qualityScore?: number;
  };
  error?: string;
}

export interface ModelCandidate {
  id: string;
  providerId: string;
  modelId: string;
  name: string;
  provider: {
    id: string;
    name: string;
    displayName: string;
    baseUrl: string;
    authType: string;
  };
  type: string;
  capabilities: string[];
  contextWindow?: number;
  maxOutput?: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsFunctions: boolean;
  costPer1kInput?: number;
  costPer1kOutput?: number;
  avgLatencyMs?: number;
  qualityScore: number;
  reliability: number;
  defaultParams?: Record<string, any>;
  recommendedFor: string[];
  isActive: boolean;
  isDeprecated: boolean;
  credentials?: any;
  score: number; // Calculated selection score
}

/**
 * AI Engine class for dynamic model selection and execution
 */
export class AIEngine {
  private async getAvailableModels(taskRequest: AITaskRequest): Promise<ModelCandidate[]> {
    // Build where clause based on task requirements
    const whereClause: any = {
      isActive: true,
      isDeprecated: false,
      provider: {
        isActive: true,
        healthStatus: {
          not: 'failing'
        },
        credential: {
          isActive: true,
          expiresAt: {
            OR: [
              null,
              { gt: new Date() }
            ]
          }
        }
      }
    };

    // Filter by task type
    if (taskRequest.taskType) {
      whereClause.OR = [
        { recommendedFor: { has: taskRequest.taskType } },
        { type: this.getModelTypeForTask(taskRequest.taskType) }
      ];
    }

    // Filter by required capabilities
    if (taskRequest.capabilities?.length) {
      whereClause.capabilities = {
        hasEvery: taskRequest.capabilities
      };
    }

    // Filter by model preferences
    if (taskRequest.modelPreferences?.providerId) {
      whereClause.providerId = taskRequest.modelPreferences.providerId;
    }

    if (taskRequest.modelPreferences?.modelId) {
      whereClause.modelId = taskRequest.modelPreferences.modelId;
    }

    if (taskRequest.modelPreferences?.minQualityScore) {
      whereClause.qualityScore = {
        gte: taskRequest.modelPreferences.minQualityScore
      };
    }

    if (taskRequest.modelPreferences?.minReliability) {
      whereClause.reliability = {
        gte: taskRequest.modelPreferences.minReliability
      };
    }

    const models = await db.aIModel.findMany({
      where: whereClause,
      include: {
        provider: {
          include: {
            credential: true
          }
        }
      },
      orderBy: [
        { qualityScore: 'desc' },
        { reliability: 'desc' },
        { costPer1kInput: 'asc' }
      ]
    });

    // Transform and decrypt credentials
    const candidates: ModelCandidate[] = [];
    
    for (const model of models) {
      try {
        let credentials = null;
        if (model.provider.credential) {
          credentials = decryptCredentialData(model.provider.credential.encryptedData);
        }

        const candidate: ModelCandidate = {
          id: model.id,
          providerId: model.providerId,
          modelId: model.modelId,
          name: model.name,
          provider: {
            id: model.provider.id,
            name: model.provider.name,
            displayName: model.provider.displayName,
            baseUrl: model.provider.baseUrl,
            authType: model.provider.authType,
          },
          type: model.type,
          capabilities: model.capabilities,
          contextWindow: model.contextWindow,
          maxOutput: model.maxOutput,
          supportsStreaming: model.supportsStreaming,
          supportsVision: model.supportsVision,
          supportsFunctions: model.supportsFunctions,
          costPer1kInput: model.costPer1kInput,
          costPer1kOutput: model.costPer1kOutput,
          avgLatencyMs: model.avgLatencyMs,
          qualityScore: model.qualityScore,
          reliability: model.reliability,
          defaultParams: model.defaultParams,
          recommendedFor: model.recommendedFor,
          isActive: model.isActive,
          isDeprecated: model.isDeprecated,
          credentials,
          score: 0 // Will be calculated
        };

        candidates.push(candidate);
      } catch (error) {
        console.error(`Failed to decrypt credentials for model ${model.id}:`, error);
      }
    }

    return candidates;
  }

  private getModelTypeForTask(taskType: string): string {
    const typeMap: Record<string, string> = {
      'analysis': 'chat',
      'creative': 'chat',
      'coding': 'chat',
      'reasoning': 'chat',
      'embedding': 'embedding',
      'vision': 'vision',
      'chat': 'chat'
    };
    return typeMap[taskType] || 'chat';
  }

  private scoreModel(model: ModelCandidate, taskRequest: AITaskRequest): number {
    let score = 0;

    // Base quality score (0-10 → 0-40 points)
    score += model.qualityScore * 4;

    // Reliability score (0-10 → 0-30 points)
    score += model.reliability * 3;

    // Task type alignment (0-20 points)
    if (model.recommendedFor.includes(taskRequest.taskType)) {
      score += 20;
    } else if (model.type === this.getModelTypeForTask(taskRequest.taskType)) {
      score += 10;
    }

    // Capability alignment (0-10 points)
    if (taskRequest.capabilities?.length) {
      const matchedCapabilities = taskRequest.capabilities.filter(cap => 
        model.capabilities.includes(cap)
      ).length;
      score += (matchedCapabilities / taskRequest.capabilities.length) * 10;
    }

    // Cost efficiency (0-15 points, lower cost = higher score)
    if (model.costPer1kInput && taskRequest.maxCost) {
      const estimatedTokens = Math.min(taskRequest.content.length / 4, model.contextWindow || 4000);
      const estimatedCost = (estimatedTokens / 1000) * model.costPer1kInput;
      if (estimatedCost <= taskRequest.maxCost) {
        score += 15 * (1 - (estimatedCost / taskRequest.maxCost));
      }
    } else if (model.costPer1kInput) {
      // Prefer lower cost models
      const costScore = Math.max(0, 15 - (model.costPer1kInput * 1000));
      score += costScore;
    }

    // Latency preference (0-10 points, lower latency = higher score)
    if (model.avgLatencyMs && taskRequest.maxLatency) {
      if (model.avgLatencyMs <= taskRequest.maxLatency) {
        score += 10 * (1 - (model.avgLatencyMs / taskRequest.maxLatency));
      }
    } else if (model.avgLatencyMs) {
      // Prefer faster models
      const latencyScore = Math.max(0, 10 - (model.avgLatencyMs / 1000));
      score += latencyScore;
    }

    // Priority adjustments
    if (taskRequest.priority === 'critical') {
      // Prioritize reliability and quality for critical tasks
      score += model.reliability * 2;
      score += model.qualityScore;
    } else if (taskRequest.priority === 'low') {
      // Prioritize cost efficiency for low priority tasks
      if (model.costPer1kInput) {
        score += Math.max(0, 10 - (model.costPer1kInput * 2000));
      }
    }

    return Math.round(score);
  }

  private async executeWithModel(
    model: ModelCandidate, 
    taskRequest: AITaskRequest
  ): Promise<AITaskResponse> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // Merge default parameters with request parameters
      const parameters = {
        ...model.defaultParams,
        ...taskRequest.parameters
      };

      // Execute the AI request based on provider
      const result = await this.callProviderAPI(model, taskRequest.content, parameters);
      
      const latencyMs = Date.now() - startTime;

      // Track usage in database
      await this.trackModelUsage(model, result, latencyMs);

      return {
        success: true,
        response: result.response,
        model: {
          id: model.id,
          providerId: model.providerId,
          modelId: model.modelId,
          name: model.name,
          provider: model.provider.displayName,
        },
        usage: {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          totalTokens: result.totalTokens,
          cost: result.cost,
          latencyMs,
        },
        metadata: {
          taskId,
          timestamp: new Date().toISOString(),
          qualityScore: model.qualityScore,
        }
      };

    } catch (error) {
      const latencyMs = Date.now() - startTime;
      
      // Track failed usage
      await this.trackModelUsage(model, null, latencyMs, error as Error);

      return {
        success: false,
        model: {
          id: model.id,
          providerId: model.providerId,
          modelId: model.modelId,
          name: model.name,
          provider: model.provider.displayName,
        },
        usage: {
          latencyMs,
        },
        metadata: {
          taskId,
          timestamp: new Date().toISOString(),
        },
        error: (error as Error).message
      };
    }
  }

  private async callProviderAPI(
    model: ModelCandidate, 
    content: string, 
    parameters: Record<string, any>
  ): Promise<{
    response: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cost?: number;
  }> {
    // This is a simplified implementation. In production, you'd have
    // specific implementations for each provider (OpenAI, Anthropic, Google, etc.)
    
    const { provider, credentials } = model;
    
    // Estimate tokens (rough approximation)
    const estimatedInputTokens = Math.ceil(content.length / 4);
    
    switch (provider.name.toLowerCase()) {
      case 'openai':
        return await this.callOpenAI(model, content, parameters, credentials);
      
      case 'anthropic':
        return await this.callAnthropic(model, content, parameters, credentials);
      
      case 'google':
        return await this.callGoogleAI(model, content, parameters, credentials);
      
      default:
        throw new Error(`Provider ${provider.name} not implemented`);
    }
  }

  private async callOpenAI(
    model: ModelCandidate,
    content: string,
    parameters: Record<string, any>,
    credentials: any
  ): Promise<any> {
    // Get OpenAI API key from Infisical with fallback to credentials
    const apiKey = await secretManager.getSecret('OPENAI_API_KEY') || credentials?.apiKey;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found in Infisical or credentials');
    }

    // Placeholder implementation for OpenAI
    // In production, use the OpenAI SDK with proper error handling
    throw new Error('OpenAI implementation pending - requires OpenAI SDK integration');
  }

  private async callAnthropic(
    model: ModelCandidate,
    content: string,
    parameters: Record<string, any>,
    credentials: any
  ): Promise<any> {
    // Get Anthropic API key from Infisical with fallback to credentials
    const apiKey = await secretManager.getSecret('ANTHROPIC_API_KEY') || credentials?.apiKey;
    
    if (!apiKey) {
      throw new Error('Anthropic API key not found in Infisical or credentials');
    }

    // Placeholder implementation for Anthropic
    // In production, use the Anthropic SDK with proper error handling
    throw new Error('Anthropic implementation pending - requires Anthropic SDK integration');
  }

  private async callGoogleAI(
    model: ModelCandidate,
    content: string,
    parameters: Record<string, any>,
    credentials: any
  ): Promise<any> {
    // Get Google AI API key from Infisical with fallback to credentials
    const apiKey = await secretManager.getSecret('GOOGLE_AI_API_KEY') || credentials?.apiKey;
    
    if (!apiKey) {
      throw new Error('Google AI API key not found in Infisical or credentials');
    }

    // Placeholder implementation for Google AI
    // In production, use the Google AI SDK with proper error handling
    throw new Error('Google AI implementation pending - requires Google AI SDK integration');
  }

  private async trackModelUsage(
    model: ModelCandidate,
    result: any | null,
    latencyMs: number,
    error?: Error
  ): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const usageData = {
        modelId: model.id,
        date: today,
        requestCount: { increment: 1 },
        successCount: { increment: error ? 0 : 1 },
        errorCount: { increment: error ? 1 : 0 },
        totalTokensUsed: { increment: result?.totalTokens || 0 },
        totalCost: { increment: result?.cost || 0 },
        avgLatencyMs: latencyMs,
      };

      await db.aIModelUsage.upsert({
        where: {
          modelId_date: {
            modelId: model.id,
            date: today,
          }
        },
        update: usageData,
        create: {
          modelId: model.id,
          date: today,
          requestCount: 1,
          successCount: error ? 0 : 1,
          errorCount: error ? 1 : 0,
          totalTokensUsed: result?.totalTokens || 0,
          totalCost: result?.cost || 0,
          avgLatencyMs: latencyMs,
        }
      });

      // Update model's average latency
      if (!error && result) {
        await db.aIModel.update({
          where: { id: model.id },
          data: {
            avgLatencyMs: latencyMs // In production, calculate rolling average
          }
        });
      }

    } catch (trackingError) {
      console.error('Failed to track model usage:', trackingError);
    }
  }

  /**
   * Main execution method - selects best model and executes task
   */
  public async execute(taskRequest: AITaskRequest): Promise<AITaskResponse> {
    try {
      // Get available models
      const candidates = await this.getAvailableModels(taskRequest);
      
      if (candidates.length === 0) {
        throw new Error('No suitable AI models available for this task');
      }

      // Score and rank models
      const scoredCandidates = candidates.map(model => ({
        ...model,
        score: this.scoreModel(model, taskRequest)
      })).sort((a, b) => b.score - a.score);

      // Try models in order of score until one succeeds
      for (const model of scoredCandidates) {
        const response = await this.executeWithModel(model, taskRequest);
        
        if (response.success) {
          return response;
        }
        
        // Log failure and continue to next model
        console.warn(`Model ${model.name} failed for task ${taskRequest.taskType}:`, response.error);
      }

      // All models failed
      throw new Error('All available AI models failed to complete the task');

    } catch (error) {
      console.error('AI Engine execution failed:', error);
      throw error;
    }
  }

  /**
   * Get model recommendations for a task without executing
   */
  public async getRecommendations(taskRequest: AITaskRequest): Promise<ModelCandidate[]> {
    const candidates = await this.getAvailableModels(taskRequest);
    
    return candidates.map(model => ({
      ...model,
      score: this.scoreModel(model, taskRequest)
    })).sort((a, b) => b.score - a.score);
  }
}

// Export singleton instance
export const aiEngine = new AIEngine();