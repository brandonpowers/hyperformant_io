# Hyperformant Architecture (Current)

## 🎯 **Architecture Overview**

Hyperformant uses a **Next.js-first architecture** with PostgreSQL database and N8N orchestration for automation workflows.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   PostgreSQL    │    │      N8N        │
│                 │    │                 │    │                 │
│ • Frontend UI   │◄──►│ • User Data     │◄──►│ • Workflows     │
│ • API Routes    │    │ • Companies     │    │ • AI Agents     │
│ • Authentication│    │ • Reports       │    │ • Integrations  │
│ • Hono API      │    │ • Sessions      │    │ • Email/PDF     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Production Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Next.js App    │    │ Fly PostgreSQL  │    │   N8N Cloud     │
│                 │    │                 │    │                 │
│ • Vercel Deploy │◄──►│ • Managed DB    │◄──►│ • Cloud Hosted  │
│ • Auto-scaling  │    │ • Backups       │    │ • Workflows     │
│ • Edge Network  │    │ • Monitoring    │    │ • Integrations  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Component Details

### **1. Next.js Application** (`web/`)

**Frontend Responsibilities:**
- React dashboard and user interface
- NextAuth.js authentication system
- Company and report management UI
- Real-time data visualization

**Backend Responsibilities:**
- Hono-powered API routes at `/api/v1/*`
- Database operations via Prisma ORM
- User session management
- File upload/download handling

### **2. PostgreSQL Database**

**Database Schema:**
- User accounts and authentication
- Company and report data
- Audit logs and analytics
- Session storage for NextAuth.js

**Management:**
- Prisma ORM for type-safe database operations
- Database migrations via Prisma
- Shared access between Next.js and N8N

### **3. N8N Orchestration**

**Automation Workflows:**
- Apollo.io CRM integration and data sync
- AI agent coordination for market intelligence
- Email delivery with PDF report generation
- Social media sentiment analysis
- Scheduled data collection and processing

## Development Workflow

```bash
# 1. Start Next.js application
npm run dev

# 2. Run database migrations
npm run db:migrate

# 3. Open database studio (optional)
npm run db:studio
```

## Deployment

**Next.js App:**
```bash
# Deploy to Vercel (recommended)
vercel deploy

# Or build for self-hosting
npm run build
npm start
```

**Services:**
1. **hyperformant** - Next.js application on Vercel
2. **database** - PostgreSQL on Fly.io or managed provider
3. **n8n** - N8N Cloud for workflow orchestration

## Environment Configuration

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth.js session secret
- `NEXTAUTH_URL` - Application URL for OAuth callbacks
- `N8N_WEBHOOK_URL` - N8N webhook endpoint for integrations

**Database Connection:**
- Same `DATABASE_URL` used by both Next.js and N8N
- Prisma handles connection pooling and migrations
- N8N connects directly for workflow operations

## Technology Stack

- **Frontend & Backend**: Next.js full-stack framework
- **API Routing**: Hono framework with TypeScript
- **Authentication**: NextAuth.js with database sessions
- **Database**: PostgreSQL with Prisma ORM
- **Orchestration**: N8N Cloud workflows
- **Deployment**: Vercel (frontend), N8N Cloud (workflows)