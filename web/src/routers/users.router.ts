import { OpenAPIHono } from '@hono/zod-openapi';
import { PrismaClient } from '@prisma/client';
import {
  UserSchema,
  UserProfileSchema,
  UpdateProfileSchema,
  ChangePasswordSchema,
  UserQuerySchema,
  UserParamsSchema,
  UpdateUserRoleSchema,
  UserPreferencesSchema,
} from '../schemas';
import { ApiError } from '../lib/api/errors';
import { ApiResponse } from '../lib/api/responses';
import { 
  createSafeAuthMiddleware,
  createSafeAdminMiddleware 
} from '../lib/api/context-safety';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

// Create Hono app with OpenAPI
export const usersApp = new OpenAPIHono();

// Use the shared authentication middleware
const authMiddleware = createSafeAuthMiddleware();
const adminMiddleware = createSafeAdminMiddleware();

/**
 * USER ROUTES
 */

// GET /users - List users (admin only)
usersApp.openapi(
  {
    method: 'get',
    path: '/users',
    summary: 'List users',
    description: 'Retrieve list of users (admin only)',
    tags: ['Users'],
    security: [{ Bearer: [] }],
    request: {
      query: UserQuerySchema,
    },
    responses: {
      200: { description: 'List of users' },
    },
  },
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const query = c.req.valid('query');
    const { page, limit, search, isAdmin, isActive, sortBy, sortOrder } = query;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (typeof isAdmin === 'boolean') {
      where.isAdmin = isAdmin;
    }
    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    // Execute query with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          isAdmin: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return c.json(
      ApiResponse.success({
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      }),
    );
  },
);

// GET /users/me - Get current user profile
usersApp.openapi(
  {
    method: 'get',
    path: '/users/me',
    summary: 'Get current user profile',
    description: 'Get detailed profile of the authenticated user',
    tags: ['Users'],
    security: [{ Bearer: [] }],
    responses: {
      200: { description: 'User profile' },
    },
  },
  authMiddleware,
  async (c) => {
    const user = c.get('user');

    // Get full user profile
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAdmin: true,
        emailVerified: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      throw ApiError.notFound('User profile not found');
    }

    return c.json(ApiResponse.success(profile));
  },
);

// PUT /users/me - Update current user profile
usersApp.openapi(
  {
    method: 'put',
    path: '/users/me',
    summary: 'Update user profile',
    description: 'Update the authenticated user profile',
    tags: ['Users'],
    security: [{ Bearer: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: UpdateProfileSchema,
        },
      },
    },
    responses: {
      200: { description: 'Profile updated successfully' },
    },
  },
  authMiddleware,
  async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const { name, email, image } = body;

    // Check if email is already taken by another user
    if (email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== user.id) {
        throw ApiError.duplicate('Email already taken');
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        email,
        image: image || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAdmin: true,
        emailVerified: true,
        updatedAt: true,
      },
    });

    return c.json(ApiResponse.success(updatedUser));
  },
);

// POST /users/me/change-password - Change user password
usersApp.openapi(
  {
    method: 'post',
    path: '/users/me/change-password',
    summary: 'Change password',
    description: 'Change the authenticated user password',
    tags: ['Users'],
    security: [{ Bearer: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: ChangePasswordSchema,
        },
      },
    },
    responses: {
      200: { description: 'Password changed successfully' },
    },
  },
  authMiddleware,
  async (c) => {
    const user = c.get('user');
    const { currentPassword, newPassword } = await c.req.json();

    // Get current user with password
    const userWithPassword = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, password: true },
    });

    if (!userWithPassword?.password) {
      throw ApiError.validation('Current password not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcryptjs.compare(
      currentPassword,
      userWithPassword.password,
    );

    if (!isCurrentPasswordValid) {
      throw ApiError.validation('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcryptjs.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword },
    });

    return c.json(
      ApiResponse.success({
        message: 'Password changed successfully',
      }),
    );
  },
);

// GET /users/:id - Get user by ID (admin only)
usersApp.openapi(
  {
    method: 'get',
    path: '/users/{id}',
    summary: 'Get user by ID',
    description: 'Get specific user by ID (admin only)',
    tags: ['Users'],
    security: [{ Bearer: [] }],
    request: {
      params: UserParamsSchema,
    },
    responses: {
      200: { description: 'User details' },
    },
  },
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const { id } = c.req.valid('params');

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAdmin: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return c.json(ApiResponse.success(user));
  },
);

// PUT /users/:id/role - Update user role (admin only)
usersApp.openapi(
  {
    method: 'put',
    path: '/users/{id}/role',
    summary: 'Update user role',
    description: 'Update user admin status and active status (admin only)',
    tags: ['Users'],
    security: [{ Bearer: [] }],
    request: {
      params: UserParamsSchema,
    },
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: UpdateUserRoleSchema,
        },
      },
    },
    responses: {
      200: { description: 'User role updated successfully' },
    },
  },
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const { id } = c.req.valid('params');
    const body = await c.req.json();
    const currentUser = c.get('user');

    // Prevent admin from deactivating themselves
    if (id === currentUser.id && body.isActive === false) {
      throw ApiError.validation('Cannot deactivate your own account');
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isAdmin: body.isAdmin,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return c.json(ApiResponse.success(updatedUser));
  },
);

// GET /users/me/preferences - Get user preferences
usersApp.openapi(
  {
    method: 'get',
    path: '/users/me/preferences',
    summary: 'Get user preferences',
    description: 'Get current user preferences and settings',
    tags: ['Users'],
    security: [{ Bearer: [] }],
    responses: {
      200: { description: 'User preferences' },
    },
  },
  authMiddleware,
  async (c) => {
    // TODO: Implement user preferences storage
    // For now, return default preferences
    const defaultPreferences = {
      theme: 'system',
      notifications: {
        email: true,
        push: false,
        marketing: false,
      },
      dashboard: {
        defaultView: 'grid',
        itemsPerPage: 20,
      },
    };

    return c.json(ApiResponse.success(defaultPreferences));
  },
);

// PUT /users/me/preferences - Update user preferences
usersApp.openapi(
  {
    method: 'put',
    path: '/users/me/preferences',
    summary: 'Update user preferences',
    description: 'Update current user preferences and settings',
    tags: ['Users'],
    security: [{ Bearer: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: UserPreferencesSchema,
        },
      },
    },
    responses: {
      200: { description: 'Preferences updated successfully' },
    },
  },
  authMiddleware,
  async (c) => {
    const preferences = await c.req.json();

    // TODO: Store preferences in database
    // For now, just return the preferences back
    return c.json(ApiResponse.success(preferences));
  },
);
