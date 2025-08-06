import { NextResponse } from 'next/server';

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Hyperformant API',
    version: '1.0.0',
    description: 'AI-powered B2B automation and consulting pipeline system API',
    contact: {
      name: 'Hyperformant Support',
      url: 'https://hyperformant.io',
      email: 'support@hyperformant.io',
    },
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
      description: 'Development server',
    },
    {
      url: 'https://api.hyperformant.io',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and registration',
    },
    {
      name: 'Reports',
      description: 'Market Forces report generation and management',
    },
    {
      name: 'AI',
      description: 'AI intelligence and sentiment analysis',
    },
    {
      name: 'Marketing',
      description: 'Apollo.io integration and CRM operations',
    },
    {
      name: 'Billing',
      description: 'Payment processing and subscriptions',
    },
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description: 'Create a new user account with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'User email address',
                  },
                  password: {
                    type: 'string',
                    format: 'password',
                    minLength: 8,
                    description: 'User password (min 8 characters)',
                  },
                  name: {
                    type: 'string',
                    description: 'User full name',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'User ID',
                    },
                    email: {
                      type: 'string',
                      description: 'User email',
                    },
                    name: {
                      type: 'string',
                      description: 'User name',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid request data',
          },
          '409': {
            description: 'User already exists',
          },
        },
      },
    },
    '/v1/reports/market-forces': {
      post: {
        tags: ['Reports'],
        summary: 'Generate Market Forces report',
        description:
          'Trigger generation of a Market Forces Analysis report for a company',
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['companyId'],
                properties: {
                  companyId: {
                    type: 'string',
                    description: 'Target company ID',
                  },
                  reportType: {
                    type: 'string',
                    enum: ['preview', 'full'],
                    default: 'preview',
                    description: 'Type of report to generate',
                  },
                  urgency: {
                    type: 'string',
                    enum: ['normal', 'high'],
                    default: 'normal',
                    description: 'Processing priority',
                  },
                },
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Report generation accepted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    trackingId: {
                      type: 'string',
                      description: 'Report tracking ID',
                    },
                    status: {
                      type: 'string',
                      description: 'Processing status',
                    },
                    estimatedCompletion: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Estimated completion time',
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Forbidden - insufficient permissions',
          },
        },
      },
    },
    '/v1/ai/collect-sentiment': {
      post: {
        tags: ['AI'],
        summary: 'Collect market sentiment',
        description:
          'Trigger sentiment collection from multiple sources for specified companies',
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['companyIds'],
                properties: {
                  companyIds: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    description: 'List of company IDs to analyze',
                  },
                  urgency: {
                    type: 'string',
                    enum: ['normal', 'high'],
                    default: 'normal',
                    description: 'Processing priority',
                  },
                  sources: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: ['reddit', 'twitter', 'g2', 'hackernews'],
                    },
                    description: 'Specific sources to collect from',
                  },
                },
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Sentiment collection started',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jobId: {
                      type: 'string',
                      description: 'Collection job ID',
                    },
                    status: {
                      type: 'string',
                      description: 'Job status',
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
          },
        },
      },
    },
    '/v1/marketing/apollo/sync': {
      post: {
        tags: ['Marketing'],
        summary: 'Sync Apollo.io data',
        description: 'Trigger synchronization with Apollo.io CRM',
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fullSync: {
                    type: 'boolean',
                    default: false,
                    description: 'Perform full sync instead of incremental',
                  },
                  syncTypes: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: [
                        'contacts',
                        'companies',
                        'sequences',
                        'smartlists',
                      ],
                    },
                    description: 'Specific data types to sync',
                  },
                },
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Sync initiated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    syncId: {
                      type: 'string',
                      description: 'Sync operation ID',
                    },
                    status: {
                      type: 'string',
                      description: 'Sync status',
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
          },
          '403': {
            description: 'Admin access required',
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT authentication token',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
          },
          code: {
            type: 'string',
            description: 'Error code',
          },
        },
      },
      Company: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Company ID',
          },
          name: {
            type: 'string',
            description: 'Company name',
          },
          domain: {
            type: 'string',
            description: 'Company domain',
          },
          employeeCount: {
            type: 'integer',
            description: 'Number of employees',
          },
          revenue: {
            type: 'number',
            description: 'Annual revenue',
          },
          industry: {
            type: 'string',
            description: 'Industry sector',
          },
        },
      },
      Report: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Report ID',
          },
          companyId: {
            type: 'string',
            description: 'Target company ID',
          },
          type: {
            type: 'string',
            enum: ['preview', 'full'],
            description: 'Report type',
          },
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed'],
            description: 'Report status',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp',
          },
          completedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Completion timestamp',
          },
          downloadUrl: {
            type: 'string',
            description: 'PDF download URL',
          },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(openApiSpec);
}
