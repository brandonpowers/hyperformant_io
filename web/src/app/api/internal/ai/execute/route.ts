/**
 * Internal AI Execution API
 * Used by N8N workflows to execute AI tasks with dynamic model selection
 * Requires internal API key authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiEngine, type AITaskRequest } from '@/lib/ai-engine';
import { z } from 'zod';

const AITaskSchema = z.object({
  taskType: z.enum(['analysis', 'creative', 'coding', 'reasoning', 'embedding', 'vision', 'chat']),
  content: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  maxCost: z.number().positive().optional(),
  maxLatency: z.number().int().positive().optional(),
  capabilities: z.array(z.string()).optional(),
  modelPreferences: z.object({
    providerId: z.string().optional(),
    modelId: z.string().optional(),
    minQualityScore: z.number().min(0).max(10).optional(),
    minReliability: z.number().min(0).max(10).optional(),
  }).optional(),
  parameters: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Verify internal API key
 */
function verifyInternalAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.INTERNAL_API_KEY;
  
  if (!expectedKey) {
    console.error('INTERNAL_API_KEY not configured');
    return false;
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const providedKey = authHeader.substring(7); // Remove 'Bearer ' prefix
  return providedKey === expectedKey;
}

/**
 * POST /api/internal/ai/execute
 * Execute AI task with dynamic model selection
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal authentication
    if (!verifyInternalAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid internal API key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const taskRequest = AITaskSchema.parse(body) as AITaskRequest;

    // Execute the AI task
    const response = await aiEngine.execute(taskRequest);

    // Log successful execution for monitoring
    console.log(`AI task executed successfully`, {
      taskType: taskRequest.taskType,
      priority: taskRequest.priority,
      model: response.model.name,
      provider: response.model.provider,
      latencyMs: response.usage.latencyMs,
      cost: response.usage.cost,
      success: response.success,
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('AI execution error:', error);
    
    // Determine if this is a validation error or execution error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request data', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    // Log failed execution for monitoring
    console.warn('AI task execution failed', {
      error: error.message,
      ip: request.ip,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'AI execution failed',
        metadata: {
          timestamp: new Date().toISOString(),
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/internal/ai/execute/recommendations
 * Get model recommendations for a task without executing
 */
export async function GET(request: NextRequest) {
  try {
    // Verify internal authentication
    if (!verifyInternalAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid internal API key' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    const taskRequest: AITaskRequest = {
      taskType: searchParams.get('taskType') as any || 'analysis',
      content: searchParams.get('content') || 'sample content',
      priority: searchParams.get('priority') as any || 'medium',
      maxCost: searchParams.get('maxCost') ? parseFloat(searchParams.get('maxCost')!) : undefined,
      maxLatency: searchParams.get('maxLatency') ? parseInt(searchParams.get('maxLatency')!) : undefined,
      capabilities: searchParams.get('capabilities')?.split(',') || [],
    };

    // Get recommendations
    const recommendations = await aiEngine.getRecommendations(taskRequest);

    return NextResponse.json({
      success: true,
      taskRequest,
      recommendations: recommendations.map(model => ({
        id: model.id,
        providerId: model.providerId,
        modelId: model.modelId,
        name: model.name,
        provider: model.provider.displayName,
        type: model.type,
        capabilities: model.capabilities,
        qualityScore: model.qualityScore,
        reliability: model.reliability,
        costPer1kInput: model.costPer1kInput,
        costPer1kOutput: model.costPer1kOutput,
        avgLatencyMs: model.avgLatencyMs,
        recommendedFor: model.recommendedFor,
        score: model.score,
      })),
      total: recommendations.length,
      metadata: {
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('AI recommendations error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to get AI recommendations',
        metadata: {
          timestamp: new Date().toISOString(),
        }
      },
      { status: 500 }
    );
  }
}