/**
 * Apollo.io Webhook Handler
 * 
 * Processes real-time webhook events from Apollo.io for:
 * - Sequence replies and engagement
 * - Contact updates and status changes
 * - Organization discoveries and updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { createApolloDataProcessor, type ApolloWebhookEvent } from '@/lib/data-sources/apollo';
import { createDataSourceManager } from '@/lib/data-sources';

// Initialize Prisma client
const prisma = new PrismaClient();
const apolloProcessor = createApolloDataProcessor(prisma);
const dataSourceManager = createDataSourceManager(prisma);

/**
 * Verify Apollo.io webhook signature (optional but recommended)
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return true; // Skip verification if not configured
  
  // Apollo.io uses HMAC-SHA256 for webhook signatures
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 Received Apollo.io webhook');
    
    // Get request body
    const payload = await request.text();
    const data = JSON.parse(payload) as ApolloWebhookEvent;
    
    // Verify webhook signature if secret is configured
    const headersList = headers();
    const signature = headersList.get('x-apollo-signature');
    const webhookSecret = process.env.APOLLO_WEBHOOK_SECRET;
    
    if (webhookSecret && !verifyWebhookSignature(payload, signature || '', webhookSecret)) {
      console.error('❌ Invalid Apollo.io webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Create ingestion run for tracking
    const dataSource = await prisma.dataSource.findFirst({
      where: { type: 'APOLLO_WEBHOOK' }
    });

    if (!dataSource) {
      console.error('❌ Apollo.io webhook data source not configured');
      return NextResponse.json({ error: 'Data source not configured' }, { status: 500 });
    }

    const ingestionRun = await dataSourceManager.createIngestionRun(
      dataSource.id,
      {
        webhook_type: data.type,
        contact_id: data.data.contact?.id,
        organization_id: data.data.organization?.id,
        timestamp: data.data.timestamp
      }
    );

    try {
      // Process the webhook event
      await apolloProcessor.processWebhookEvent(data);

      // Update ingestion run as successful
      await dataSourceManager.updateIngestionRun(
        ingestionRun.id,
        'SUCCESS',
        1, // itemsIn
        1  // itemsOut
      );

      // Store webhook event for audit trail
      await prisma.apolloWebhookEvent.create({
        data: {
          eventType: data.type,
          payload: data,
          processed: true
        }
      });

      console.log(`✅ Successfully processed Apollo.io webhook: ${data.type}`);
      
      return NextResponse.json({ 
        success: true, 
        processed: true,
        runId: ingestionRun.id
      });

    } catch (processingError) {
      console.error('❌ Error processing Apollo.io webhook:', processingError);

      // Update ingestion run as failed
      await dataSourceManager.updateIngestionRun(
        ingestionRun.id,
        'FAILED',
        1, // itemsIn
        0, // itemsOut
        processingError.message
      );

      // Store failed webhook event for debugging
      await prisma.apolloWebhookEvent.create({
        data: {
          eventType: data.type,
          payload: data,
          processed: false
        }
      });

      return NextResponse.json({ 
        error: 'Processing failed', 
        runId: ingestionRun.id 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Apollo.io webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * Handle GET requests for webhook verification (if Apollo.io requires it)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = searchParams.get('hub.verify_token');
  
  // Verify the webhook endpoint (if Apollo.io uses challenge verification)
  if (challenge && verifyToken === process.env.APOLLO_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  
  return NextResponse.json({ 
    message: 'Apollo.io webhook endpoint',
    timestamp: new Date().toISOString()
  });
}