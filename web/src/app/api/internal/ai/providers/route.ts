/**
 * Internal AI Provider Access API
 * Used by N8N workflows to get available AI providers and models
 * Requires internal API key authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
 * GET /api/internal/ai/providers
 * Get all active AI providers and their models for N8N workflows
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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const capability = searchParams.get('capability'); // text, chat, embeddings, vision, code, reasoning
    const modelType = searchParams.get('type'); // chat, completion, embedding, vision
    const taskType = searchParams.get('task'); // analysis, creative, coding, etc.

    // Build where clause for models
    let modelWhere: any = { isActive: true };
    
    if (modelType) {
      modelWhere.type = modelType;
    }
    
    if (capability) {
      modelWhere.capabilities = {
        has: capability
      };
    }
    
    if (taskType) {
      modelWhere.recommendedFor = {
        has: taskType
      };
    }

    const providers = await db.aIProvider.findMany({
      where: {
        isActive: true,
        healthStatus: {
          not: 'failing'
        }
      },
      include: {
        models: {
          where: modelWhere,
          orderBy: [
            { qualityScore: 'desc' },
            { reliability: 'desc' },
            { name: 'asc' }
          ]
        },
        credential: {
          select: {
            id: true,
            isActive: true,
            expiresAt: true,
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    });

    // Filter providers that have active credentials and matching models
    const availableProviders = providers
      .filter(provider => 
        provider.credential?.isActive && 
        (!provider.credential.expiresAt || provider.credential.expiresAt > new Date()) &&
        provider.models.length > 0
      )
      .map(provider => ({
        id: provider.id,
        name: provider.name,
        displayName: provider.displayName,
        baseUrl: provider.baseUrl,
        authType: provider.authType,
        capabilities: provider.capabilities,
        healthStatus: provider.healthStatus,
        lastHealthCheck: provider.lastHealthCheck,
        models: provider.models.map(model => ({
          id: model.id,
          modelId: model.modelId,
          name: model.name,
          version: model.version,
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
          isDeprecated: model.isDeprecated,
        }))
      }));

    // Calculate summary statistics
    const totalModels = availableProviders.reduce((sum, provider) => sum + provider.models.length, 0);
    const avgQualityScore = availableProviders.length > 0 ? 
      availableProviders.reduce((sum, provider) => 
        sum + provider.models.reduce((modelSum, model) => modelSum + model.qualityScore, 0) / provider.models.length
      , 0) / availableProviders.length : 0;

    return NextResponse.json({
      success: true,
      providers: availableProviders,
      summary: {
        totalProviders: availableProviders.length,
        totalModels,
        avgQualityScore: Math.round(avgQualityScore * 100) / 100,
        filters: {
          capability,
          modelType,
          taskType,
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'hyperformant-ai-registry',
      }
    });

  } catch (error) {
    console.error('Error fetching AI providers for N8N:', error);
    
    // Log attempted access for security monitoring
    console.warn('Failed AI provider access attempt', {
      ip: request.ip,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
      error: error.message
    });

    return NextResponse.json(
      { error: 'Failed to fetch AI providers' },
      { status: 500 }
    );
  }
}