/**
 * Individual Credential Management API
 * Admin-only endpoints for managing specific credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { 
  encryptCredentialData, 
  decryptCredentialData, 
  validateCredentialData,
  sanitizeCredentials 
} from '@/lib/encryption';
import { z } from 'zod';

const UpdateCredentialSchema = z.object({
  authType: z.enum(['oauth2', 'bearer', 'apikey', 'basic', 'custom']).optional(),
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
    credentialId: string;
  };
}

/**
 * GET /api/admin/credentials/[credentialId]
 * Get credential metadata (not the actual credentials)
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

    const credential = await db.dataSourceCredential.findUnique({
      where: { id: params.credentialId },
      include: {
        dataSource: {
          select: {
            id: true,
            name: true,
            displayName: true,
            type: true,
            category: true,
            isActive: true,
          }
        }
      }
    });

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Return metadata only, never the encrypted data
    return NextResponse.json({
      credential: {
        id: credential.id,
        dataSourceId: credential.dataSourceId,
        dataSource: credential.dataSource,
        authType: credential.authType,
        isActive: credential.isActive,
        expiresAt: credential.expiresAt,
        lastUsed: credential.lastUsed,
        usageCount: credential.usageCount,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
      }
    });

  } catch (error) {
    console.error('Error fetching credential:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credential' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/credentials/[credentialId]
 * Update credential data
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

    // Check if credential exists
    const existingCredential = await db.dataSourceCredential.findUnique({
      where: { id: params.credentialId }
    });

    if (!existingCredential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    let updateData: any = {};

    // Update basic fields
    if (validatedData.authType) {
      updateData.authType = validatedData.authType;
    }
    
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
    const updatedCredential = await db.dataSourceCredential.update({
      where: { id: params.credentialId },
      data: updateData,
      include: {
        dataSource: {
          select: {
            id: true,
            name: true,
            displayName: true,
            type: true,
          }
        }
      }
    });

    // Return metadata only
    return NextResponse.json({
      credential: {
        id: updatedCredential.id,
        dataSourceId: updatedCredential.dataSourceId,
        dataSource: updatedCredential.dataSource,
        authType: updatedCredential.authType,
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

    console.error('Error updating credential:', error);
    return NextResponse.json(
      { error: 'Failed to update credential' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/credentials/[credentialId]
 * Delete credential
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

    // Check if credential exists
    const credential = await db.dataSourceCredential.findUnique({
      where: { id: params.credentialId }
    });

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Delete the credential
    await db.dataSourceCredential.delete({
      where: { id: params.credentialId }
    });

    return NextResponse.json({
      message: 'Credential deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting credential:', error);
    return NextResponse.json(
      { error: 'Failed to delete credential' },
      { status: 500 }
    );
  }
}