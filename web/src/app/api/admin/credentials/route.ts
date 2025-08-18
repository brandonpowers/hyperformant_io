/**
 * Data Source Credential Management API
 * Admin-only endpoints for managing encrypted credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { 
  encryptCredentialData, 
  decryptCredentialData, 
  validateCredentialData,
  sanitizeCredentials,
  type CredentialData 
} from '@/lib/encryption';
import { z } from 'zod';

const CreateCredentialSchema = z.object({
  dataSourceId: z.string().uuid(),
  authType: z.enum(['oauth2', 'bearer', 'apikey', 'basic', 'custom']),
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

/**
 * GET /api/admin/credentials
 * List all credential metadata (not the actual credentials)
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

    const credentials = await db.dataSourceCredential.findMany({
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Return metadata only, never the encrypted data
    const credentialMetadata = credentials.map(cred => ({
      id: cred.id,
      dataSourceId: cred.dataSourceId,
      dataSource: cred.dataSource,
      authType: cred.authType,
      isActive: cred.isActive,
      expiresAt: cred.expiresAt,
      lastUsed: cred.lastUsed,
      usageCount: cred.usageCount,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt,
    }));

    return NextResponse.json({
      credentials: credentialMetadata,
      total: credentials.length
    });

  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credentials' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/credentials
 * Create new encrypted credentials for a data source
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
    const validatedData = CreateCredentialSchema.parse(body);

    // Validate credential data structure
    if (!validateCredentialData(validatedData.credentials)) {
      return NextResponse.json(
        { error: 'Invalid credential data - at least one authentication method required' },
        { status: 400 }
      );
    }

    // Check if data source exists and doesn't already have credentials
    const dataSource = await db.dataSource.findUnique({
      where: { id: validatedData.dataSourceId },
      include: { credential: true }
    });

    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    if (dataSource.credential) {
      return NextResponse.json(
        { error: 'Credentials already exist for this data source' },
        { status: 409 }
      );
    }

    // Encrypt the credential data
    const encryptedData = encryptCredentialData(validatedData.credentials);

    // Create the credential record
    const credential = await db.dataSourceCredential.create({
      data: {
        dataSourceId: validatedData.dataSourceId,
        authType: validatedData.authType,
        encryptedData,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
      },
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
        id: credential.id,
        dataSourceId: credential.dataSourceId,
        dataSource: credential.dataSource,
        authType: credential.authType,
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

    console.error('Error creating credentials:', error);
    return NextResponse.json(
      { error: 'Failed to create credentials' },
      { status: 500 }
    );
  }
}