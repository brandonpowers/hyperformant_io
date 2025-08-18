/**
 * Individual AI Model Management API
 * Admin-only endpoints for managing specific AI models
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { z } from 'zod';

const UpdateModelSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  version: z.string().optional(),
  type: z.string().min(1).optional(),
  capabilities: z.array(z.string()).min(1).optional(),
  contextWindow: z.number().int().positive().optional(),
  maxOutput: z.number().int().positive().optional(),
  supportsStreaming: z.boolean().optional(),
  supportsVision: z.boolean().optional(),
  supportsFunctions: z.boolean().optional(),
  costPer1kInput: z.number().positive().optional(),
  costPer1kOutput: z.number().positive().optional(),
  qualityScore: z.number().min(0).max(10).optional(),
  reliability: z.number().min(0).max(10).optional(),
  defaultParams: z.record(z.any()).optional(),
  recommendedFor: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isDeprecated: z.boolean().optional(),
  deprecationDate: z.string().datetime().optional(),
});

interface RouteParams {
  params: {
    providerId: string;
    modelId: string;
  };
}

/**
 * GET /api/admin/ai-providers/[providerId]/models/[modelId]
 * Get specific AI model with detailed usage statistics
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const model = await db.aIModel.findUnique({
      where: { id: params.modelId },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            displayName: true,
            isActive: true,
          }
        },
        usageStats: {
          orderBy: { date: 'desc' },
          take: 30 // Last 30 days
        }
      }
    });

    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Verify model belongs to the specified provider
    if (model.providerId !== params.providerId) {
      return NextResponse.json(
        { error: 'Model does not belong to specified provider' },
        { status: 400 }
      );
    }

    // Calculate comprehensive usage statistics
    const totalStats = model.usageStats.reduce((acc, stat) => ({
      totalRequests: acc.totalRequests + stat.requestCount,
      totalSuccesses: acc.totalSuccesses + stat.successCount,
      totalErrors: acc.totalErrors + stat.errorCount,
      totalCost: acc.totalCost + stat.totalCost,
      totalTokens: acc.totalTokens + stat.totalTokensUsed,
    }), {
      totalRequests: 0,
      totalSuccesses: 0,
      totalErrors: 0,
      totalCost: 0,
      totalTokens: 0,
    });

    const successRate = totalStats.totalRequests > 0 ? 
      (totalStats.totalSuccesses / totalStats.totalRequests) * 100 : 0;

    const avgCostPerRequest = totalStats.totalRequests > 0 ?
      totalStats.totalCost / totalStats.totalRequests : 0;

    // Calculate daily averages for last 7 days
    const last7Days = model.usageStats.slice(0, 7);
    const dailyAverages = last7Days.length > 0 ? {
      avgDailyRequests: last7Days.reduce((sum, stat) => sum + stat.requestCount, 0) / last7Days.length,
      avgDailyCost: last7Days.reduce((sum, stat) => sum + stat.totalCost, 0) / last7Days.length,
      avgDailyTokens: last7Days.reduce((sum, stat) => sum + stat.totalTokensUsed, 0) / last7Days.length,
    } : {
      avgDailyRequests: 0,
      avgDailyCost: 0,
      avgDailyTokens: 0,
    };

    return NextResponse.json({
      model: {
        id: model.id,
        providerId: model.providerId,
        provider: model.provider,
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
        isActive: model.isActive,
        isDeprecated: model.isDeprecated,
        deprecationDate: model.deprecationDate,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        stats: {
          ...totalStats,
          successRate: Math.round(successRate * 100) / 100,
          avgCostPerRequest: Math.round(avgCostPerRequest * 10000) / 10000,
          dailyAverages,
          usageHistory: model.usageStats.map(stat => ({
            date: stat.date,
            requests: stat.requestCount,
            successes: stat.successCount,
            errors: stat.errorCount,
            cost: stat.totalCost,
            tokens: stat.totalTokensUsed,
            avgLatency: stat.avgLatencyMs,
            avgQuality: stat.avgQualityScore,
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching AI model:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI model' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/ai-providers/[providerId]/models/[modelId]
 * Update AI model
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateModelSchema.parse(body);

    // Check if model exists and belongs to provider
    const existingModel = await db.aIModel.findUnique({
      where: { id: params.modelId }
    });

    if (!existingModel) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    if (existingModel.providerId !== params.providerId) {
      return NextResponse.json(
        { error: 'Model does not belong to specified provider' },
        { status: 400 }
      );
    }

    // Prepare update data
    let updateData: any = { ...validatedData };

    // Handle deprecation date
    if (validatedData.deprecationDate) {
      updateData.deprecationDate = new Date(validatedData.deprecationDate);
    }

    // Update the model
    const updatedModel = await db.aIModel.update({
      where: { id: params.modelId },
      data: updateData,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            displayName: true,
          }
        }
      }
    });

    return NextResponse.json({
      model: {
        id: updatedModel.id,
        providerId: updatedModel.providerId,
        provider: updatedModel.provider,
        modelId: updatedModel.modelId,
        name: updatedModel.name,
        version: updatedModel.version,
        type: updatedModel.type,
        capabilities: updatedModel.capabilities,
        contextWindow: updatedModel.contextWindow,
        maxOutput: updatedModel.maxOutput,
        supportsStreaming: updatedModel.supportsStreaming,
        supportsVision: updatedModel.supportsVision,
        supportsFunctions: updatedModel.supportsFunctions,
        costPer1kInput: updatedModel.costPer1kInput,
        costPer1kOutput: updatedModel.costPer1kOutput,
        qualityScore: updatedModel.qualityScore,
        reliability: updatedModel.reliability,
        recommendedFor: updatedModel.recommendedFor,
        isActive: updatedModel.isActive,
        isDeprecated: updatedModel.isDeprecated,
        deprecationDate: updatedModel.deprecationDate,
        updatedAt: updatedModel.updatedAt,
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating AI model:', error);
    return NextResponse.json(
      { error: 'Failed to update AI model' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/ai-providers/[providerId]/models/[modelId]
 * Delete AI model and all associated usage data
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Check if model exists and belongs to provider
    const model = await db.aIModel.findUnique({
      where: { id: params.modelId },
      include: {
        usageStats: true
      }
    });

    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    if (model.providerId !== params.providerId) {
      return NextResponse.json(
        { error: 'Model does not belong to specified provider' },
        { status: 400 }
      );
    }

    // Delete the model (cascade will handle usage stats)
    await db.aIModel.delete({
      where: { id: params.modelId }
    });

    return NextResponse.json({
      message: 'Model deleted successfully',
      deletedUsageStats: model.usageStats.length,
    });

  } catch (error) {
    console.error('Error deleting AI model:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI model' },
      { status: 500 }
    );
  }
}