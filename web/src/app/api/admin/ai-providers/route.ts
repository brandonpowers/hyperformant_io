/**
 * AI Provider Management API
 * Admin-only endpoints for managing AI providers and models
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { z } from 'zod';

const CreateProviderSchema = z.object({
  name: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  baseUrl: z.string().url(),
  authType: z.enum(['bearer', 'apikey', 'oauth2']),
  capabilities: z.array(z.string()).min(1),
  website: z.string().url().optional(),
  documentation: z.string().url().optional(),
  pricingUrl: z.string().url().optional(),
});

/**
 * GET /api/admin/ai-providers
 * List all AI providers with their models
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const providers = await db.aIProvider.findMany({
      include: {
        models: {
          where: { isActive: true },
          orderBy: { qualityScore: 'desc' }
        },
        credential: {
          select: {
            id: true,
            isActive: true,
            expiresAt: true,
            lastUsed: true,
            usageCount: true,
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    });

    const providersWithStats = providers.map(provider => ({
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
      modelCount: provider.models.length,
      activeModelCount: provider.models.filter(m => m.isActive).length,
      hasCredentials: !!provider.credential,
      credentialStatus: provider.credential ? {
        isActive: provider.credential.isActive,
        expiresAt: provider.credential.expiresAt,
        lastUsed: provider.credential.lastUsed,
        usageCount: provider.credential.usageCount,
        isExpired: provider.credential.expiresAt ? 
          provider.credential.expiresAt < new Date() : false,
      } : null,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    }));

    return NextResponse.json({
      providers: providersWithStats,
      total: providers.length,
      activeCount: providers.filter(p => p.isActive).length,
    });

  } catch (error) {
    console.error('Error fetching AI providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI providers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-providers
 * Create new AI provider
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = CreateProviderSchema.parse(body);

    // Check if provider with this name already exists
    const existingProvider = await db.aIProvider.findUnique({
      where: { name: validatedData.name }
    });

    if (existingProvider) {
      return NextResponse.json(
        { error: 'Provider with this name already exists' },
        { status: 409 }
      );
    }

    // Create the provider
    const provider = await db.aIProvider.create({
      data: {
        name: validatedData.name,
        displayName: validatedData.displayName,
        baseUrl: validatedData.baseUrl,
        authType: validatedData.authType,
        capabilities: validatedData.capabilities,
        website: validatedData.website,
        documentation: validatedData.documentation,
        pricingUrl: validatedData.pricingUrl,
      },
      include: {
        models: true,
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
        id: provider.id,
        name: provider.name,
        displayName: provider.displayName,
        baseUrl: provider.baseUrl,
        authType: provider.authType,
        capabilities: provider.capabilities,
        isActive: provider.isActive,
        healthStatus: provider.healthStatus,
        website: provider.website,
        documentation: provider.documentation,
        pricingUrl: provider.pricingUrl,
        modelCount: provider.models.length,
        hasCredentials: !!provider.credential,
        createdAt: provider.createdAt,
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating AI provider:', error);
    return NextResponse.json(
      { error: 'Failed to create AI provider' },
      { status: 500 }
    );
  }
}