# CRITICAL: Route Handler Registration Issue Fix

## Problem
The `.openapi()` method from `@hono/zod-openapi` does NOT properly register route handlers in our setup. Routes defined with `.openapi()` appear in the OpenAPI specification but return 404 when called because no actual handler is registered with Hono.

## Root Cause
The OpenAPIHono `.openapi()` method is intended for documentation generation but in our configuration, it fails to register the actual HTTP route handlers with the underlying Hono router.

## Symptoms
- Routes show up in `/api/v1/openapi.json` 
- Routes return 404 when called
- Logging shows requests reaching the router but no handler found
- Authentication middleware never executes (hence no user in logs)

## Solution
**ALWAYS use direct Hono methods (`.get()`, `.post()`, `.put()`, `.delete()`) instead of `.openapi()`**

### Before (BROKEN):
```typescript
companiesApp.openapi(
  {
    method: 'get',
    path: '/companies',
    // ... OpenAPI spec
  },
  authMiddleware,
  async (c) => {
    // Handler code
  }
);
```

### After (WORKING):
```typescript
companiesApp.get('/companies', authMiddleware, async (c) => {
  // Handler code
});
```

## Prevention
1. **Never use `.openapi()` for route registration**
2. **Always test routes immediately after creation**
3. **Use direct HTTP method calls (`.get()`, `.post()`, etc.)**
4. **For documentation, use JSDoc comments or separate OpenAPI generation**

## Files Fixed
- `/src/routers/companies.router.ts` - Converted all `.openapi()` calls to direct methods

## Test
Route should return 401 (auth required) instead of 404 (not found):
```bash
curl http://localhost:3000/api/v1/companies
# Should return: {"error":{"code":"UNAUTHORIZED","message":"No valid session found"}}
# NOT: 404 Not Found
```

## This Issue Has Occurred Multiple Times
This is a recurring issue that breaks the company dropdown. The fix is always the same: convert `.openapi()` calls to direct Hono method calls.

**DO NOT use `.openapi()` method for route registration in this codebase.**