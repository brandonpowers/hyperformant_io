/**
 * AI Model Management API for specific providers
 * Admin-only endpoints for managing AI models within a provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { z } from 'zod';

const CreateModelSchema = z.object({
  modelId: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  version: z.string().optional(),
  type: z.string().min(1),
  capabilities: z.array(z.string()).min(1),
  contextWindow: z.number().int().positive().optional(),
  maxOutput: z.number().int().positive().optional(),
  supportsStreaming: z.boolean().default(false),
  supportsVision: z.boolean().default(false),
  supportsFunctions: z.boolean().default(false),
  costPer1kInput: z.number().positive().optional(),
  costPer1kOutput: z.number().positive().optional(),
  defaultParams: z.record(z.any()).optional(),
  recommendedFor: z.array(z.string()).default([]),
});

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
  };
}

/**
 * GET /api/admin/ai-providers/[providerId]/models
 * List all models for a specific provider
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

    // Verify provider exists
    const provider = await db.aIProvider.findUnique({
      where: { id: params.providerId },
      select: { id: true, name: true, displayName: true }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    const models = await db.aIModel.findMany({
      where: { providerId: params.providerId },
      include: {
        usageStats: {
          where: {
            date: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          },
          orderBy: { date: 'desc' },
          take: 7
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { qualityScore: 'desc' },
        { name: 'asc' }
      ]
    });

    const modelsWithStats = models.map(model => {
      const weeklyStats = model.usageStats.reduce((acc, stat) => ({
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

      const successRate = weeklyStats.totalRequests > 0 ? 
        (weeklyStats.totalSuccesses / weeklyStats.totalRequests) * 100 : 0;

      return {
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
        recommendedFor: model.recommendedFor,
        isActive: model.isActive,
        isDeprecated: model.isDeprecated,
        deprecationDate: model.deprecationDate,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        weeklyStats,
        successRate: Math.round(successRate * 100) / 100,
      };
    });

    return NextResponse.json({
      provider,
      models: modelsWithStats,
      total: models.length,
      activeCount: models.filter(m => m.isActive).length,
      deprecatedCount: models.filter(m => m.isDeprecated).length,
    });

  } catch (error) {
    console.error('Error fetching AI models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI models' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-providers/[providerId]/models
 * Create new AI model for provider
 */
export async function POST(
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

    // Verify provider exists
    const provider = await db.aIProvider.findUnique({
      where: { id: params.providerId }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = CreateModelSchema.parse(body);

    // Check if model with this modelId already exists for this provider
    const existingModel = await db.aIModel.findUnique({
      where: {
        providerId_modelId: {
          providerId: params.providerId,
          modelId: validatedData.modelId
        }
      }
    });

    if (existingModel) {
      return NextResponse.json(
        { error: 'Model with this ID already exists for this provider' },
        { status: 409 }
      );
    }

    // Create the model
    const model = await db.aIModel.create({
      data: {
        providerId: params.providerId,
        modelId: validatedData.modelId,
        name: validatedData.name,
        version: validatedData.version,
        type: validatedData.type,
        capabilities: validatedData.capabilities,
        contextWindow: validatedData.contextWindow,
        maxOutput: validatedData.maxOutput,
        supportsStreaming: validatedData.supportsStreaming,
        supportsVision: validatedData.supportsVision,
        supportsFunctions: validatedData.supportsFunctions,
        costPer1kInput: validatedData.costPer1kInput,
        costPer1kOutput: validatedData.costPer1kOutput,
        defaultParams: validatedData.defaultParams,
        recommendedFor: validatedData.recommendedFor,
      }
    });

    return NextResponse.json({
      model: {
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
        qualityScore: model.qualityScore,
        reliability: model.reliability,
        recommendedFor: model.recommendedFor,
        isActive: model.isActive,
        createdAt: model.createdAt,
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating AI model:', error);
    return NextResponse.json(
      { error: 'Failed to create AI model' },
      { status: 500 }
    );
  }
}