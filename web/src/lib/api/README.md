# Hyperformant API Middleware Documentation

This directory contains the shared middleware and utilities for the Hyperformant API. All middleware is designed to work seamlessly with Hono and Next.js App Router.

## 📁 Structure

```
src/lib/api/
├── auth-middleware.ts      # Authentication and authorization
├── validation-middleware.ts # Request validation with Zod
├── database.ts            # Database connection and utilities
├── logging-middleware.ts  # Request logging and monitoring
├── errors.ts             # Error handling and custom errors
├── responses.ts          # Standardized API responses
├── router-template.ts    # Template for new routers
└── README.md            # This documentation
```

## 🔐 Authentication Middleware

### `createAuthMiddleware()`
Validates NextAuth JWT sessions and sets user context.

```typescript
import { createAuthMiddleware } from '../lib/api/auth-middleware';

const authMiddleware = createAuthMiddleware();

// Usage
app.get('/protected-route', authMiddleware, async (c) => {
  const user = c.get('user'); // { id, name, email, isAdmin }
  // Your protected logic here
});
```

### `createAdminMiddleware()`
Requires admin privileges (must be used after `authMiddleware`).

```typescript
import { createAdminMiddleware } from '../lib/api/auth-middleware';

const adminMiddleware = createAdminMiddleware();

// Usage
app.get('/admin-only', authMiddleware, adminMiddleware, async (c) => {
  // Only admins can access this route
});
```

## ✅ Validation Middleware

### Request Validation
Validates request body, query parameters, and path parameters using Zod schemas.

```typescript
import { 
  createValidationMiddleware,
  validateBody,
  validateQuery,
  validateParams,
  getValidatedBody,
} from '../lib/api/validation-middleware';

// Validate request body
app.post('/users', validateBody(CreateUserSchema), async (c) => {
  const body = getValidatedBody(c); // Typed and validated
  // Implementation
});

// Validate query parameters
app.get('/users/search', validateQuery(UserSearchSchema), async (c) => {
  const query = getValidatedQuery(c); // Typed and validated
  // Implementation
});

// Validate path parameters
app.get('/users/:id', validateParams(UserParamsSchema), async (c) => {
  const params = getValidatedParams(c); // Typed and validated
  // Implementation
});

// Validate multiple parts of request
const validation = createValidationMiddleware({
  body: CreateUserSchema,
  query: PaginationSchema,
  params: UserParamsSchema,
});

app.post('/users/:id/update', validation, async (c) => {
  const body = getValidatedBody(c);
  const query = getValidatedQuery(c);
  const params = getValidatedParams(c);
  // Implementation
});
```

## 🗄️ Database Utilities

### Shared Database Instance
```typescript
import { db, getDb, withTransaction } from '../lib/api/database';

// Direct usage
const users = await db.user.findMany();

// From context (if using database middleware)
app.get('/users', async (c) => {
  const database = getDb(c);
  const users = await database.user.findMany();
});

// Transactions
const result = await withTransaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  const profile = await tx.profile.create({ 
    data: { userId: user.id, ...profileData } 
  });
  return { user, profile };
});
```

### Database Middleware
```typescript
import { createDatabaseMiddleware } from '../lib/api/database';

const dbMiddleware = createDatabaseMiddleware();

// Apply to all routes in router
app.use('*', dbMiddleware);
```

### Error Handling
```typescript
import { handleDatabaseError } from '../lib/api/database';

try {
  await db.user.create({ data: userData });
} catch (error) {
  const dbError = handleDatabaseError(error);
  
  if (dbError.type === 'UNIQUE_CONSTRAINT') {
    throw ApiError.duplicate(dbError.message);
  }
  
  throw ApiError.server(dbError.message);
}
```

## 📝 Logging Middleware

### Request Logging
```typescript
import { createLoggingMiddleware } from '../lib/api/logging-middleware';

const loggingMiddleware = createLoggingMiddleware({
  logRequests: true,
  logResponses: true,
  logErrors: true,
  excludePaths: ['/health', '/ping'], // Skip health checks
});

// Apply globally
app.use('*', loggingMiddleware);
```

### Error Logging
```typescript
import { createErrorLoggingMiddleware } from '../lib/api/logging-middleware';

const errorLoggingMiddleware = createErrorLoggingMiddleware();

// Apply globally for comprehensive error tracking
app.use('*', errorLoggingMiddleware);
```

### Development Debug
```typescript
import { createDebugMiddleware } from '../lib/api/logging-middleware';

// Only logs in development
const debugMiddleware = createDebugMiddleware();
app.use('*', debugMiddleware);
```

## 🚨 Error Handling

### Standard Error Types
```typescript
import { ApiError } from '../lib/api/errors';

// Pre-defined error types
throw ApiError.validation('Invalid input', { field: 'email' });
throw ApiError.unauthorized('Please log in');
throw ApiError.forbidden('Admin access required');
throw ApiError.notFound('User not found');
throw ApiError.duplicate('Email already exists');
throw ApiError.server('Something went wrong');

// Custom error
throw new ApiError(418, 'TEAPOT_ERROR', 'I am a teapot');
```

### Global Error Handler
The global error handler in `/src/routers/index.ts` automatically handles:
- `ApiError` instances
- Prisma database errors
- Zod validation errors
- Unknown errors

## 📊 Response Formatting

### Standard Responses
```typescript
import { ApiResponse } from '../lib/api/responses';

// Success responses
return c.json(ApiResponse.success(data));
return c.json(ApiResponse.created(newResource), 201);
return c.json(ApiResponse.accepted('task-123'));

// Response format:
{
  "data": { /* your data */ },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0"
  }
}
```

## 🏗️ Creating New Routers

### 1. Use the Template
Copy `/src/lib/api/router-template.ts` and customize it for your resource.

### 2. Standard Router Setup
```typescript
import { OpenAPIHono } from '@hono/zod-openapi';
import { createAuthMiddleware } from '../lib/api/auth-middleware';
import { validateBody } from '../lib/api/validation-middleware';
import { db } from '../lib/api/database';
import { createLoggingMiddleware } from '../lib/api/logging-middleware';
import { ApiError } from '../lib/api/errors';
import { ApiResponse } from '../lib/api/responses';

export const yourResourceApp = new OpenAPIHono();

// Set up middleware
const authMiddleware = createAuthMiddleware();
const loggingMiddleware = createLoggingMiddleware();

// Apply global middleware
yourResourceApp.use('*', loggingMiddleware);

// Define routes
yourResourceApp.get('/your-resource', authMiddleware, async (c) => {
  const user = c.get('user');
  // Implementation
});
```

### 3. Mount in Main Router
```typescript
// In /src/routers/index.ts
import { yourResourceApp } from './your-resource.router';

apiApp.route('/', yourResourceApp);
```

## 🧪 Testing

### Testing with Authentication
```typescript
// Mock authenticated user
const mockAuthMiddleware = async (c: any, next: any) => {
  c.set('user', { id: 'test-user', name: 'Test User', email: 'test@example.com' });
  await next();
};

// Replace auth middleware in tests
app.get('/test-route', mockAuthMiddleware, routeHandler);
```

### Testing Validation
```typescript
// Test validation middleware
const request = new Request('/test', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ invalid: 'data' }),
});

const response = await app.fetch(request);
expect(response.status).toBe(400);
```

## 🚀 Performance Best Practices

### 1. Database Optimization
- Use `select` to limit returned fields
- Use `include` carefully to avoid N+1 queries
- Use transactions for multi-step operations
- Implement proper indexing in Prisma schema

### 2. Middleware Order
Apply middleware in this order for optimal performance:
```typescript
app.use('*', loggingMiddleware);      // 1. Logging (for all requests)
app.use('*', corsMiddleware);         // 2. CORS (if needed)
app.use('/api/*', authMiddleware);    // 3. Auth (only for protected routes)
app.use('/api/*', rateLimitMiddleware); // 4. Rate limiting
app.use('*', validationMiddleware);   // 5. Validation (per route)
```

### 3. Caching
- Use Redis for session caching
- Implement HTTP caching headers
- Cache expensive database queries

## 🔒 Security Considerations

### 1. Authentication
- Always use `authMiddleware` for protected routes
- Validate JWT tokens properly
- Handle session expiration gracefully

### 2. Input Validation
- Validate all inputs with Zod schemas
- Sanitize user inputs
- Use parameterized queries (Prisma handles this)

### 3. Rate Limiting
- Implement rate limiting for public endpoints
- Use different limits for authenticated users
- Monitor and alert on unusual traffic patterns

## 📈 Monitoring

### 1. Request Logging
- All requests are logged with timing information
- Errors are logged with full context
- Slow requests (>1s) are flagged

### 2. Database Health
```typescript
import { dbHealthCheck } from '../lib/api/database';

// Health check endpoint
app.get('/health', async (c) => {
  const dbHealthy = await dbHealthCheck();
  
  return c.json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    database: dbHealthy,
    timestamp: new Date().toISOString(),
  });
});
```

## 🔄 Migration Guide

### From Individual Middleware to Shared
1. Replace inline middleware with imports from `../lib/api/*`
2. Update route definitions to use shared middleware
3. Test all routes to ensure consistent behavior
4. Update any custom error handling to use `ApiError`

### Example Migration
```typescript
// Before
const authMiddleware = async (c: any, next: any) => {
  // Custom auth logic...
};

// After
import { createAuthMiddleware } from '../lib/api/auth-middleware';
const authMiddleware = createAuthMiddleware();
```

## 🆘 Troubleshooting

### Common Issues

1. **"Cannot find user in context"**
   - Ensure `authMiddleware` is applied before accessing `c.get('user')`

2. **"Validation failed"**
   - Check that your Zod schema matches the expected input
   - Ensure `validateBody/Query/Params` is applied to the route

3. **"Database connection error"**
   - Check that Prisma client is properly initialized
   - Verify database connection string in environment variables

4. **"Middleware not applying"**
   - Check middleware order (global middleware first)
   - Ensure middleware is imported and applied correctly

### Debug Mode
Set `NODE_ENV=development` to enable:
- Detailed request logging
- Database query logging
- Debug middleware output

---

## 📚 Additional Resources

- [Hono Documentation](https://hono.dev/)
- [Zod Documentation](https://zod.dev/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [NextAuth.js Documentation](https://next-auth.js.org/)

For questions or issues, please refer to the troubleshooting section above or check the project's main documentation.