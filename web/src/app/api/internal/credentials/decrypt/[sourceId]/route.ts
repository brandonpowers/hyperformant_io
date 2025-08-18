/**
 * Internal Credential Decryption API
 * Used by N8N workflows to get decrypted credentials
 * Requires internal API key authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decryptCredentialData, sanitizeCredentials } from '@/lib/encryption';

interface RouteParams {
  params: {
    sourceId: string;
  };
}

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
 * POST /api/internal/credentials/decrypt/[sourceId]
 * Decrypt and return credentials for N8N workflows
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verify internal authentication
    if (!verifyInternalAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid internal API key' },
        { status: 401 }
      );
    }

    const { sourceId } = params;

    // Find the data source and its credentials
    const dataSource = await db.dataSource.findUnique({
      where: { 
        OR: [
          { id: sourceId },
          { name: sourceId }
        ]
      },
      include: {
        credential: true
      }
    });

    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    if (!dataSource.credential) {
      return NextResponse.json(
        { error: 'No credentials configured for this data source' },
        { status: 404 }
      );
    }

    if (!dataSource.credential.isActive) {
      return NextResponse.json(
        { error: 'Credentials are inactive' },
        { status: 403 }
      );
    }

    // Check if credentials are expired
    if (dataSource.credential.expiresAt && dataSource.credential.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Credentials have expired' },
        { status: 403 }
      );
    }

    // Decrypt the credentials
    const decryptedCredentials = decryptCredentialData(dataSource.credential.encryptedData);

    // Update usage tracking
    await db.dataSourceCredential.update({
      where: { id: dataSource.credential.id },
      data: {
        lastUsed: new Date(),
        usageCount: {
          increment: 1
        }
      }
    });

    // Return decrypted credentials with metadata
    return NextResponse.json({
      success: true,
      dataSource: {
        id: dataSource.id,
        name: dataSource.name,
        type: dataSource.type,
        authType: dataSource.credential.authType,
      },
      credentials: decryptedCredentials,
      metadata: {
        expiresAt: dataSource.credential.expiresAt,
        lastUsed: new Date(),
        usageCount: dataSource.credential.usageCount + 1,
      }
    });

  } catch (error) {
    console.error('Error decrypting credentials:', error);
    
    // Log attempted access for security monitoring
    console.warn(`Failed credential access attempt for source: ${params.sourceId}`, {
      ip: request.ip,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
      error: error.message
    });

    return NextResponse.json(
      { error: 'Failed to decrypt credentials' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/internal/credentials/decrypt/[sourceId]
 * Get credential metadata without decrypting (for validation)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verify internal authentication
    if (!verifyInternalAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid internal API key' },
        { status: 401 }
      );
    }

    const { sourceId } = params;

    // Find the data source and its credentials
    const dataSource = await db.dataSource.findUnique({
      where: { 
        OR: [
          { id: sourceId },
          { name: sourceId }
        ]
      },
      include: {
        credential: true
      }
    });

    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    if (!dataSource.credential) {
      return NextResponse.json(
        { 
          hasCredentials: false,
          dataSource: {
            id: dataSource.id,
            name: dataSource.name,
            type: dataSource.type,
          }
        }
      );
    }

    // Return metadata only
    return NextResponse.json({
      hasCredentials: true,
      dataSource: {
        id: dataSource.id,
        name: dataSource.name,
        type: dataSource.type,
        authType: dataSource.credential.authType,
      },
      metadata: {
        isActive: dataSource.credential.isActive,
        expiresAt: dataSource.credential.expiresAt,
        lastUsed: dataSource.credential.lastUsed,
        usageCount: dataSource.credential.usageCount,
        isExpired: dataSource.credential.expiresAt ? 
          dataSource.credential.expiresAt < new Date() : false,
      }
    });

  } catch (error) {
    console.error('Error checking credentials:', error);
    return NextResponse.json(
      { error: 'Failed to check credentials' },
      { status: 500 }
    );
  }
}