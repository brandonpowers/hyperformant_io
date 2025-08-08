# Hyperformant API Architecture

## 🎯 Overview

Hyperformant implements a **unified API architecture** using Next.js and Hono framework that provides clean, authenticated endpoints for all operations. This delivers a single, professional API surface for both internal use and external partner integrations.

**Current Architecture** (Implemented):
- **Unified Next.js API**: Single API surface at `api.hyperformant.io/v1/*` 
- **Hono Framework**: Reliable routing and middleware for API endpoints
- **NextAuth.js Integration**: Session-based authentication for all endpoints

## Architecture Components

### Next.js + Hono API Layer

**Responsibilities:**
- User authentication via NextAuth.js
- Company and report CRUD operations
- Dashboard data aggregation
- File upload/download operations
- System health and information endpoints

### N8N Orchestration Layer

**Responsibilities:**
- External API integrations (Apollo.io, social media APIs)
- AI agent coordination and processing
- Market Forces report generation
- Email delivery and notifications
- Scheduled workflows and automation

### Database Layer

**PostgreSQL via Prisma:**
- Consolidated schema accessible by both Next.js and N8N
- Real-time data sync between frontend and automation workflows
- Comprehensive audit logging and data integrity

## API Endpoints

### Core Endpoints

**System Endpoints:**
- `GET /api/v1/health` - System health check
- `GET /api/v1/info` - API information and available endpoints

**Companies API:**
- `GET /api/v1/companies` - List user companies (authenticated)
- `POST /api/v1/companies` - Create new company (authenticated)
- `GET /api/v1/companies/:id` - Get specific company (authenticated + access control)

### Authentication

All `/api/v1/*` endpoints require authentication via NextAuth.js sessions:
- Session-based authentication using cookies
- User validation against database
- Proper access control for company-specific operations

### Error Handling

Consistent error response format:
```json
{
  "error": {
    "code": "ERROR_TYPE",
    "message": "Human readable message"
  }
}
```

Common error codes:
- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Access denied
- `NOT_FOUND` (404) - Resource not found
- `VALIDATION_ERROR` (400) - Invalid input data
- `CREATE_ERROR` (500) - Failed to create resource

## Future Architecture (Monorepo Migration)

**Recommended Next Phase:**
```
hyperformant/
├── apps/
│   ├── web/           # Next.js frontend
│   └── api/           # Independent Hono API server  
├── packages/
│   ├── schemas/       # Shared Zod schemas
│   └── auth/          # Shared auth utilities
└── turbo.json         # Turborepo configuration
```

Benefits:
- Independent API deployment
- Clean separation of concerns
- Better scalability and monitoring
- Partner-friendly API versioning

## Development Commands

```bash
# Start development server
npm run dev

# Build application
npm run build

# Database operations
npm run db:migrate     # Run Prisma migrations
npm run db:seed        # Run database seeds
npm run db:studio      # Open Prisma Studio
```

## Technology Stack

- **Frontend & API**: Next.js full-stack framework
- **API Routing**: Hono framework with TypeScript
- **Authentication**: NextAuth.js with database sessions
- **Database**: PostgreSQL with Prisma ORM
- **Orchestration**: N8N Cloud workflows
- **External APIs**: Apollo.io, social media APIs, AI models
- **Email**: Resend for transactional emails
- **Deployment**: Vercel (frontend), N8N Cloud (workflows)