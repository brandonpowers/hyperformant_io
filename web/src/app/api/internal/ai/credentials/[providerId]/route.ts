/**
 * Internal AI Provider Credential Decryption API
 * Used by N8N workflows to get decrypted AI provider credentials
 * Requires internal API key authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decryptCredentialData } from '@/lib/encryption';

interface RouteParams {
  params: {
    providerId: string;
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
 * POST /api/internal/ai/credentials/[providerId]
 * Decrypt and return AI provider credentials for N8N workflows
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

    const { providerId } = params;

    // Find the AI provider and its credentials
    const provider = await db.aIProvider.findUnique({
      where: { 
        OR: [
          { id: providerId },
          { name: providerId }
        ]
      },
      include: {
        credential: true
      }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'AI provider not found' },
        { status: 404 }
      );
    }

    if (!provider.credential) {
      return NextResponse.json(
        { error: 'No credentials configured for this AI provider' },
        { status: 404 }
      );
    }

    if (!provider.credential.isActive) {
      return NextResponse.json(
        { error: 'AI provider credentials are inactive' },
        { status: 403 }
      );
    }

    // Check if credentials are expired
    if (provider.credential.expiresAt && provider.credential.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'AI provider credentials have expired' },
        { status: 403 }
      );
    }

    // Decrypt the credentials
    const decryptedCredentials = decryptCredentialData(provider.credential.encryptedData);

    // Update usage tracking
    await db.aIProviderCredential.update({
      where: { id: provider.credential.id },
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
      provider: {
        id: provider.id,
        name: provider.name,
        displayName: provider.displayName,
        baseUrl: provider.baseUrl,
        authType: provider.authType,
        capabilities: provider.capabilities,
        healthStatus: provider.healthStatus,
      },
      credentials: decryptedCredentials,
      metadata: {
        expiresAt: provider.credential.expiresAt,
        lastUsed: new Date(),
        usageCount: provider.credential.usageCount + 1,
        providerHealth: provider.healthStatus,
      }
    });

  } catch (error) {
    console.error('Error decrypting AI provider credentials:', error);
    
    // Log attempted access for security monitoring
    console.warn(`Failed AI credential access attempt for provider: ${params.providerId}`, {
      ip: request.ip,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
      error: error.message
    });

    return NextResponse.json(
      { error: 'Failed to decrypt AI provider credentials' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/internal/ai/credentials/[providerId]
 * Get AI provider credential metadata without decrypting (for validation)
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

    const { providerId } = params;

    // Find the AI provider and its credentials
    const provider = await db.aIProvider.findUnique({
      where: { 
        OR: [
          { id: providerId },
          { name: providerId }
        ]
      },
      include: {
        credential: true
      }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'AI provider not found' },
        { status: 404 }
      );
    }

    if (!provider.credential) {
      return NextResponse.json(
        { 
          hasCredentials: false,
          provider: {
            id: provider.id,
            name: provider.name,
            displayName: provider.displayName,
            authType: provider.authType,
            capabilities: provider.capabilities,
            healthStatus: provider.healthStatus,
          }
        }
      );
    }

    // Return metadata only
    return NextResponse.json({
      hasCredentials: true,
      provider: {
        id: provider.id,
        name: provider.name,
        displayName: provider.displayName,
        baseUrl: provider.baseUrl,
        authType: provider.authType,
        capabilities: provider.capabilities,
        healthStatus: provider.healthStatus,
      },
      metadata: {
        isActive: provider.credential.isActive,
        expiresAt: provider.credential.expiresAt,
        lastUsed: provider.credential.lastUsed,
        usageCount: provider.credential.usageCount,
        isExpired: provider.credential.expiresAt ? 
          provider.credential.expiresAt < new Date() : false,
      }
    });

  } catch (error) {
    console.error('Error checking AI provider credentials:', error);
    return NextResponse.json(
      { error: 'Failed to check AI provider credentials' },
      { status: 500 }
    );
  }
}