import { OpenAPIHono } from '@hono/zod-openapi';
import { PrismaClient } from '@prisma/client';
import { 
  CompanySchema, 
  CreateCompanySchema,
  CompanyParamsSchema,
} from '../schemas';
import { ApiError } from '../lib/api/errors';
import { ApiResponse } from '../lib/api/responses';
import { createAuthMiddleware } from '../lib/api/auth-middleware';

const prisma = new PrismaClient();

// Create Hono app with OpenAPI
export const companiesApp = new OpenAPIHono();

// Use the shared authentication middleware
const authMiddleware = createAuthMiddleware();

/**
 * Company access middleware - verifies user can access specific entity (company)
 */
const companyAccessMiddleware = async (c: any, next: any) => {
  const user = c.get('user');
  const companyId = c.req.param('id');

  const hasAccess = await prisma.entity.findFirst({
    where: {
      id: companyId,
      type: 'COMPANY', // Only allow access to company entities
      OR: [
        { createdByUserId: user.id },
        {
          members: {
            some: { userId: user.id },
          },
        },
      ],
    },
  });

  if (!hasAccess) {
    throw ApiError.forbidden('Access denied to this company');
  }

  await next();
};

/**
 * COMPANIES CRUD ROUTES
 */

// GET /companies - List user companies  
companiesApp.openapi({
  method: 'get',
  path: '/companies',
  summary: 'List user companies',
  description: 'Retrieve all companies the authenticated user has access to',
  tags: ['Companies'],
  security: [{ Bearer: [] }],
  responses: {
    200: { description: 'List of companies' },
  },
}, authMiddleware, async (c) => {
  const user = c.get('user');
  const query = c.req.valid('query') || {};
  
  // Build where clause for user access to company entities
  const where: any = {
    type: 'COMPANY', // Only get company entities
    OR: [
      { createdByUserId: user.id },
      {
        members: {
          some: { userId: user.id },
        },
      },
    ],
  };

  // Add search filters
  if (query.industryId) {
    where.industryId = query.industryId;
  }
  
  if (query.marketSegmentId) {
    where.marketSegmentId = query.marketSegmentId;
  }
  
  if (query.search) {
    where.OR = [
      ...where.OR,
      { name: { contains: query.search, mode: 'insensitive' } },
      { domain: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  // Execute query
  const companies = await prisma.entity.findMany({
    where,
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      industry: true,
      marketSegment: true,
      _count: {
        select: { reports: true, members: true },
      },
    },
    orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
  });

  return c.json(ApiResponse.success(companies));
});

// Add a regular Hono route that works alongside the OpenAPI route
companiesApp.get('/companies', authMiddleware, async (c) => {
  const user = c.get('user');
  
  // Build where clause for user access to company entities
  const where: any = {
    type: 'COMPANY',
    OR: [
      { createdByUserId: user.id },
      {
        members: {
          some: { userId: user.id },
        },
      },
    ],
  };

  // Execute query
  const companies = await prisma.entity.findMany({
    where,
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      industry: true,
      marketSegment: true,
      _count: {
        select: { reports: true, members: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return c.json(ApiResponse.success(companies));
});

// POST /companies - Create new company
companiesApp.openapi({
  method: 'post',
  path: '/companies',
  summary: 'Create a new company',
  description: 'Create a new company and add the authenticated user as admin',
  tags: ['Companies'],
  security: [{ Bearer: [] }],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: CreateCompanySchema,
      },
    },
  },
  responses: {
    201: { description: 'Company created successfully' },
  },
}, authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  
  // Basic validation
  if (!body.name || typeof body.name !== 'string') {
    throw ApiError.validation('Company name is required');
  }

  // Check for duplicate domain if provided
  if (body.domain) {
    const existing = await prisma.entity.findFirst({
      where: { 
        domain: body.domain,
        type: 'COMPANY',
      },
    });
    if (existing) {
      throw ApiError.conflict('Company with this domain already exists');
    }
  }

  // Create company entity with transaction
  const company = await prisma.$transaction(async (tx) => {
    const newCompany = await tx.entity.create({
      data: {
        ...body,
        type: 'COMPANY',
        foundedAt: body.foundedAt ? new Date(body.foundedAt) : null,
        createdByUserId: user.id,
        isUserCompany: true, // Mark as user company
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        industry: true,
        marketSegment: true,
        _count: {
          select: { reports: true, members: true },
        },
      },
    });

    // Create admin membership
    await tx.entityMember.create({
      data: {
        entityId: newCompany.id,
        userId: user.id,
        role: 'ADMIN',
      },
    });

    return newCompany;
  });

  return c.json(ApiResponse.created(company), 201);
});

// GET /companies/:id - Get specific company
companiesApp.openapi({
  method: 'get',
  path: '/companies/{id}',
  summary: 'Get company by ID',
  description: 'Retrieve a specific company by ID (user must have access)',
  tags: ['Companies'],
  security: [{ Bearer: [] }],
  request: {
    params: CompanyParamsSchema,
  },
  responses: {
    200: { description: 'Company details' },
  },
}, authMiddleware, companyAccessMiddleware, async (c) => {
  const id = c.req.param('id');
  
  const company = await prisma.entity.findUnique({
    where: { 
      id,
      type: 'COMPANY',
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      industry: true,
      marketSegment: true,
      reports: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: {
        select: { 
          reports: true, 
          members: true,
          metrics: true,
          impacts: true,
          outgoing: true,
          incoming: true,
        },
      },
    },
  });

  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  return c.json(ApiResponse.success(company));
});