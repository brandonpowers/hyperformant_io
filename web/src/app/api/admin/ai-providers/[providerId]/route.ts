/**
 * Individual AI Provider Management API
 * Admin-only endpoints for managing specific AI providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { z } from 'zod';

const UpdateProviderSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  baseUrl: z.string().url().optional(),
  authType: z.enum(['bearer', 'apikey', 'oauth2']).optional(),
  capabilities: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
  website: z.string().url().optional(),
  documentation: z.string().url().optional(),
  pricingUrl: z.string().url().optional(),
});

interface RouteParams {
  params: {
    providerId: string;
  };
}

/**
 * GET /api/admin/ai-providers/[providerId]
 * Get specific AI provider with models and credentials
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

    const provider = await db.aIProvider.findUnique({
      where: { id: params.providerId },
      include: {
        models: {
          include: {
            usageStats: {
              where: {
                date: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
              },
              orderBy: { date: 'desc' }
            }
          },
          orderBy: [
            { isActive: 'desc' },
            { qualityScore: 'desc' }
          ]
        },
        credential: {
          select: {
            id: true,
            isActive: true,
            expiresAt: true,
            lastUsed: true,
            usageCount: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Calculate usage statistics
    const modelsWithStats = provider.models.map(model => {
      const recentUsage = model.usageStats.reduce((acc, stat) => ({
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
        defaultParams: model.defaultParams,
        recommendedFor: model.recommendedFor,
        isActive: model.isActive,
        isDeprecated: model.isDeprecated,
        deprecationDate: model.deprecationDate,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        recentUsage,
      };
    });

    return NextResponse.json({
      provider: {
        id: provider.id,
        name: provider.name,
        displayName: provider.displayName,
        baseUrl: provider.baseUrl,
        authType: provider.authType,
        capabilities: provider.capabilities,
        isActive: provider.isActive,
        healthStatus: provider.healthStatus,
        lastHealthCheck: provider.lastHealthCheck,
        website: provider.website,
        documentation: provider.documentation,
        pricingUrl: provider.pricingUrl,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
        models: modelsWithStats,
        credential: provider.credential ? {
          ...provider.credential,
          isExpired: provider.credential.expiresAt ? 
            provider.credential.expiresAt < new Date() : false,
        } : null,
      }
    });

  } catch (error) {
    console.error('Error fetching AI provider:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI provider' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/ai-providers/[providerId]
 * Update AI provider
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
    const validatedData = UpdateProviderSchema.parse(body);

    // Check if provider exists
    const existingProvider = await db.aIProvider.findUnique({
      where: { id: params.providerId }
    });

    if (!existingProvider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Update the provider
    const updatedProvider = await db.aIProvider.update({
      where: { id: params.providerId },
      data: validatedData,
      include: {
        models: {
          where: { isActive: true },
          select: {
            id: true,
            modelId: true,
            name: true,
            type: true,
            isActive: true,
          }
        },
        credential: {
          select: {
            id: true,
            isActive: true,
            expiresAt: true,
          }
        }
      }
    });

    return NextResponse.json({
      provider: {
        id: updatedProvider.id,
        name: updatedProvider.name,
        displayName: updatedProvider.displayName,
        baseUrl: updatedProvider.baseUrl,
        authType: updatedProvider.authType,
        capabilities: updatedProvider.capabilities,
        isActive: updatedProvider.isActive,
        healthStatus: updatedProvider.healthStatus,
        website: updatedProvider.website,
        documentation: updatedProvider.documentation,
        pricingUrl: updatedProvider.pricingUrl,
        updatedAt: updatedProvider.updatedAt,
        modelCount: updatedProvider.models.length,
        hasCredentials: !!updatedProvider.credential,
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating AI provider:', error);
    return NextResponse.json(
      { error: 'Failed to update AI provider' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/ai-providers/[providerId]
 * Delete AI provider and all associated data
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

    // Check if provider exists
    const provider = await db.aIProvider.findUnique({
      where: { id: params.providerId },
      include: {
        models: true,
        credential: true,
      }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Delete the provider (cascade will handle models and credentials)
    await db.aIProvider.delete({
      where: { id: params.providerId }
    });

    return NextResponse.json({
      message: 'Provider deleted successfully',
      deletedModels: provider.models.length,
      deletedCredentials: provider.credential ? 1 : 0,
    });

  } catch (error) {
    console.error('Error deleting AI provider:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI provider' },
      { status: 500 }
    );
  }
}