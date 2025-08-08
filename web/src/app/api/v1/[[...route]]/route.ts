import { apiApp } from '../../../../routers';

// Configure runtime - required for Next.js App Router
export const runtime = 'nodejs';

/**
 * Universal API Handler - Powered by Hono
 *
 * This is the main entry point for all API v1 routes.
 * It uses the Hono framework for reliable routing and middleware.
 *
 * All routers are defined in /src/routers/ and imported here.
 */

// API documentation will be added in future iteration

// Handler function for Next.js App Router with path reconstruction
async function handler(request: Request, context: { params: Promise<{ route?: string[] }> }) {
  try {
    // Await params as required by Next.js App Router
    const params = await context.params;
    
    // Reconstruct the path from the catch-all route params
    const routePath = params.route ? `/${params.route.join('/')}` : '/';
    
    // Create a new request with the correct path for Hono
    const url = new URL(request.url);
    // Pass the path directly to Hono (without /api/v1 prefix)
    url.pathname = routePath;
    
    const honoRequest = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      // Preserve the original request for NextAuth compatibility
      duplex: 'half' as any, // Required for streaming bodies
    });
    
    // Store the original request in the Hono request for NextAuth
    (honoRequest as any).originalRequest = request;
    
    return await apiApp.fetch(honoRequest);
  } catch (error) {
    console.error('API Handler error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Export handlers for Next.js App Router
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;

// Export the app for testing
export { apiApp };