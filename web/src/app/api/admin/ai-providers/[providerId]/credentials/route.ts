/**
 * AI Provider Credential Management API
 * Admin-only endpoints for managing AI provider credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { 
  encryptCredentialData, 
  validateCredentialData,
  type CredentialData 
} from '@/lib/encryption';
import { z } from 'zod';

const CreateCredentialSchema = z.object({
  credentials: z.object({
    apiKey: z.string().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    customHeaders: z.record(z.string()).optional(),
    customData: z.record(z.any()).optional(),
    tokenUrl: z.string().url().optional(),
    authUrl: z.string().url().optional(),
    scopes: z.array(z.string()).optional(),
    environment: z.enum(['sandbox', 'production']).optional(),
    provider: z.string().optional(),
    description: z.string().optional(),
  }),
  expiresAt: z.string().datetime().optional(),
});

const UpdateCredentialSchema = z.object({
  credentials: z.object({
    apiKey: z.string().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    customHeaders: z.record(z.string()).optional(),
    customData: z.record(z.any()).optional(),
    tokenUrl: z.string().url().optional(),
    authUrl: z.string().url().optional(),
    scopes: z.array(z.string()).optional(),
    environment: z.enum(['sandbox', 'production']).optional(),
    provider: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
});

interface RouteParams {
  params: {
    providerId: string;
  };
}

/**
 * GET /api/admin/ai-providers/[providerId]/credentials
 * Get credential metadata for AI provider (not the actual credentials)
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
      include: {
        credential: true
      }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    if (!provider.credential) {
      return NextResponse.json({
        hasCredentials: false,
        provider: {
          id: provider.id,
          name: provider.name,
          displayName: provider.displayName,
          authType: provider.authType,
        }
      });
    }

    // Return metadata only, never the encrypted data
    return NextResponse.json({
      hasCredentials: true,
      provider: {
        id: provider.id,
        name: provider.name,
        displayName: provider.displayName,
        authType: provider.authType,
      },
      credential: {
        id: provider.credential.id,
        isActive: provider.credential.isActive,
        expiresAt: provider.credential.expiresAt,
        lastUsed: provider.credential.lastUsed,
        usageCount: provider.credential.usageCount,
        createdAt: provider.credential.createdAt,
        updatedAt: provider.credential.updatedAt,
        isExpired: provider.credential.expiresAt ? 
          provider.credential.expiresAt < new Date() : false,
      }
    });

  } catch (error) {
    console.error('Error fetching AI provider credentials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI provider credentials' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-providers/[providerId]/credentials
 * Create new credentials for AI provider
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

    const body = await request.json();
    const validatedData = CreateCredentialSchema.parse(body);

    // Validate credential data structure
    if (!validateCredentialData(validatedData.credentials)) {
      return NextResponse.json(
        { error: 'Invalid credential data - at least one authentication method required' },
        { status: 400 }
      );
    }

    // Check if provider exists and doesn't already have credentials
    const provider = await db.aIProvider.findUnique({
      where: { id: params.providerId },
      include: { credential: true }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    if (provider.credential) {
      return NextResponse.json(
        { error: 'Credentials already exist for this provider' },
        { status: 409 }
      );
    }

    // Encrypt the credential data
    const encryptedData = encryptCredentialData(validatedData.credentials);

    // Create the credential record
    const credential = await db.aIProviderCredential.create({
      data: {
        providerId: params.providerId,
        encryptedData,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            displayName: true,
            authType: true,
          }
        }
      }
    });

    // Return metadata only
    return NextResponse.json({
      credential: {
        id: credential.id,
        providerId: credential.providerId,
        provider: credential.provider,
        isActive: credential.isActive,
        expiresAt: credential.expiresAt,
        createdAt: credential.createdAt,
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating AI provider credentials:', error);
    return NextResponse.json(
      { error: 'Failed to create AI provider credentials' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/ai-providers/[providerId]/credentials
 * Update credentials for AI provider
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
    const validatedData = UpdateCredentialSchema.parse(body);

    // Check if provider and credentials exist
    const provider = await db.aIProvider.findUnique({
      where: { id: params.providerId },
      include: { credential: true }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    if (!provider.credential) {
      return NextResponse.json(
        { error: 'No credentials found for this provider' },
        { status: 404 }
      );
    }

    let updateData: any = {};

    // Update basic fields
    if (validatedData.isActive !== undefined) {
      updateData.isActive = validatedData.isActive;
    }
    
    if (validatedData.expiresAt) {
      updateData.expiresAt = new Date(validatedData.expiresAt);
    }

    // Update credential data if provided
    if (validatedData.credentials) {
      if (!validateCredentialData(validatedData.credentials)) {
        return NextResponse.json(
          { error: 'Invalid credential data - at least one authentication method required' },
          { status: 400 }
        );
      }

      updateData.encryptedData = encryptCredentialData(validatedData.credentials);
    }

    // Update the credential
    const updatedCredential = await db.aIProviderCredential.update({
      where: { id: provider.credential.id },
      data: updateData,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            displayName: true,
            authType: true,
          }
        }
      }
    });

    // Return metadata only
    return NextResponse.json({
      credential: {
        id: updatedCredential.id,
        providerId: updatedCredential.providerId,
        provider: updatedCredential.provider,
        isActive: updatedCredential.isActive,
        expiresAt: updatedCredential.expiresAt,
        updatedAt: updatedCredential.updatedAt,
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating AI provider credentials:', error);
    return NextResponse.json(
      { error: 'Failed to update AI provider credentials' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/ai-providers/[providerId]/credentials
 * Delete credentials for AI provider
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

    // Check if provider and credentials exist
    const provider = await db.aIProvider.findUnique({
      where: { id: params.providerId },
      include: { credential: true }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    if (!provider.credential) {
      return NextResponse.json(
        { error: 'No credentials found for this provider' },
        { status: 404 }
      );
    }

    // Delete the credential
    await db.aIProviderCredential.delete({
      where: { id: provider.credential.id }
    });

    return NextResponse.json({
      message: 'AI provider credentials deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting AI provider credentials:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI provider credentials' },
      { status: 500 }
    );
  }
}