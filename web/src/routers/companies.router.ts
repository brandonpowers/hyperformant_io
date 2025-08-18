import { OpenAPIHono } from '@hono/zod-openapi';
import { PrismaClient } from '@prisma/client';
// Removed unused schemas since we're not using .openapi() anymore
import { ApiError } from '../lib/api/errors';
import { ApiResponse } from '../lib/api/responses';
import { createSafeAuthMiddleware } from '../lib/api/context-safety';

const prisma = new PrismaClient();

// Create Hono app with OpenAPI
export const companiesApp = new OpenAPIHono();

// Use the safe authentication middleware
const authMiddleware = createSafeAuthMiddleware();

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
// Using direct .get() method because .openapi() doesn't register handlers correctly
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
// Using direct .post() method because .openapi() doesn't register handlers correctly
companiesApp.post('/companies', authMiddleware, async (c) => {
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
// Using direct .get() method because .openapi() doesn't register handlers correctly
companiesApp.get('/companies/:id', authMiddleware, companyAccessMiddleware, async (c) => {
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
