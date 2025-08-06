import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'Hyperformant API',
    version: '1.0.0',
    description: 'AI-powered B2B automation and consulting pipeline system',
    documentation: {
      redoc: '/api/docs',
      swagger: '/api/swagger',
      openapi: '/api/openapi.json',
    },
    endpoints: {
      authentication: {
        register: '/api/auth/register',
        login: 'Via NextAuth.js providers',
      },
      reports: {
        marketForces: '/api/v1/reports/market-forces',
      },
      ai: {
        collectSentiment: '/api/v1/ai/collect-sentiment',
      },
      marketing: {
        apolloSync: '/api/v1/marketing/apollo/sync',
      },
    },
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
}
