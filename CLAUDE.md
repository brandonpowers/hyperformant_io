# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hyperformant is an AI-powered B2B automation and consulting pipeline system that combines CRM integration, research automation, and revenue generation workflows. The system employs a multi-agent architecture with specialized AI agents orchestrated through N8N Cloud workflows.

**Business Model**: Prospect Discovery → Multi-Channel Outreach → Free Report (24h) → Premium Report Upsell → Consulting Services

## Development Commands

```bash
# Build and validation
npm run build          # Build Next.js application
npm run validate       # Validate all JSON configurations against schemas

# Database operations (via Next.js + Prisma)
npm run db:migrate     # Run database migrations via Prisma
npm run db:seed        # Run database seeds with system configuration
npm run db:studio      # Open Prisma Studio for database management

# Deployment
npm run import:dev     # Import N8N workflows to dev environment
npm run import:prod    # Import N8N workflows to production
npm run deploy:dev     # Full deployment to dev (validate + migrate + import)
npm run deploy:prod    # Full deployment to production
npm start             # Alias for deploy:dev
```

## Architecture Overview - Unified API Design with N8N Wrapper Layer

### 🎯 **Unified API Architecture** (IMPLEMENTED)

**Core Principle**: **Single API surface** that wraps all N8N webhooks in clean Next.js API routes, providing a unified developer experience.

### **Next.js API Routes** (Port 3000/api) - Complete API Surface

**Unified Responsibilities:**
- **User Management & Authentication**: NextAuth.js integration, registration, subscriptions, permissions  
- **Core Data Operations**: CRUD operations for companies, reports, market data via Prisma
- **Frontend Integration**: Dashboard queries, report viewing, user preferences
- **N8N Wrapper Endpoints**: All N8N webhooks wrapped in authenticated Next.js API routes
- **Payment Processing**: LemonSqueezy integration, subscription management, global tax compliance
- **File Management**: Upload/download, storage integration
- **API Documentation**: Auto-generated OpenAPI specs with beautiful Redoc + Swagger UI

### **N8N Orchestration Layer** (Background) - Wrapped by Next.js

**Background Responsibilities:**
- **External API Integrations**: Apollo.io, Reddit, Twitter, G2, HackerNews APIs
- **AI Agent Coordination**: Multi-model AI processing (GPT-4o, Claude, Gemini)  
- **Market Forces PDF Generation**: Automated report creation and email delivery
- **Scheduled Workflows**: Sentiment collection, Apollo sync, daily metrics
- **Complex Business Logic**: Market intelligence analysis, competitor vulnerability detection
- **Webhook Processing**: Apollo.io webhooks, payment notifications

### **🆕 API Wrapper Pattern** (NEW IMPLEMENTATION)

All N8N webhooks are now accessible via clean Next.js API routes:

```typescript
// Next.js API Route → N8N Webhook Flow
POST /api/v1/reports/market-forces
├── 1. Authenticate user (NextAuth.js)
├── 2. Validate input (Zod validation) 
├── 3. Create database record (Prisma)
├── 4. Trigger N8N webhook (Background)
└── 5. Return 202 Accepted with tracking ID

POST /api/v1/ai/collect-sentiment  
├── 1. Authenticate user (NextAuth.js)
├── 2. Validate company IDs (Zod validation)
├── 3. Trigger N8N intelligence workflow (Background)
└── 4. Return execution status

POST /api/v1/marketing/apollo/sync
├── 1. Authenticate admin user (NextAuth.js)
├── 2. Trigger N8N Apollo sync (Background)  
└── 3. Return sync status
```

### AI Agent Team Structure (N8N Orchestrated)

AI agents are implemented as N8N workflows with specialized business logic:

- **Oracle Agent** - Master orchestrator for hyperformant-specific business decisions
- **Apollo Integration Agent** - Orchestrates Apollo.io native features with Market Forces targeting
- **Market Intelligence Agent** - Consumer sentiment analysis for competitor vulnerability detection
- **Company Research Agent** - Deep financial analysis with Apollo.io enrichment
- **Data Quality Agent** - Data validation and Apollo.io sync monitoring

### Technology Stack

- **Frontend & Backend**: Next.js full-stack framework (React + Node.js + Prisma)
- **Authentication**: NextAuth.js with database sessions and JWT tokens
- **Orchestration Platform**: N8N Cloud workflows for complex automations
- **Database**: PostgreSQL via Prisma - consolidated schema for all application data
- **CRM Platform**: Apollo.io (275M+ contacts, native segmentation, sequences, analytics)
- **Market Intelligence**: Multi-source sentiment analysis (Reddit, Twitter/X, G2, HackerNews APIs)
- **PDF Generation**: React-PDF with dual approach (N8N for Market Forces, Next.js for dashboards)
- **Email Delivery**: Resend with HTML templates and PDF attachments
- **Analytics**: Plausible Analytics (privacy-first web analytics) + PostHog (product analytics and feature flags)
- **Business Intelligence**: Metabase (open-source BI and data visualization)
- **Payments**: LemonSqueezy (merchant of record, global tax compliance, subscription management)
- **AI Models**: OpenAI (GPT-4o series), Anthropic (Claude 4 series), Google AI (Gemini 2.5 series)
- **CLI Tools**: TypeScript/Node.js with Yargs CLI framework
- **Validation**: Ajv for JSON schema validation

### Market Disruption Intelligence Data Flow

1. **Prospect Discovery**: Apollo.io Smart Lists targeting early-stage SaaS companies (5-50 employees, $500K-$10M ARR)
2. **Competitive Intelligence**: Market Intelligence Agent processes Reddit, Twitter, G2, HackerNews for competitor vulnerabilities and customer sentiment
3. **Personalized Outreach**: Apollo.io Sequences with AI-generated competitive intelligence insights and vulnerability messaging
4. **Market Forces Analysis**: AI-generated 3-page preview reports highlighting customer rebellion, market blind spots, and M&A predictions
5. **Revenue Conversion**: $497 full reports delivered via Resend email with professional PDF attachments
6. **Optimization Loop**: Real-time A/B testing and performance monitoring with statistical significance detection

## Development Workflow

### Next.js Framework Best Practices

**CRITICAL: Always Use Next.js First-Party Solutions**

Before implementing any custom solution, check if Next.js provides a built-in approach:

- **Routing**: Use Next.js App Router with `app/` directory structure and page.tsx files
- **Authentication**: Use NextAuth.js with Prisma adapter for database sessions
- **Database**: Use Prisma Client with Next.js API routes for data operations
- **State Management**: Use React Query/TanStack Query for server state, Zustand for client state
- **API Endpoints**: Use Next.js API routes in `app/api/` directory with route handlers
- **File Uploads**: Use Next.js built-in file upload patterns with proper middleware
- **Email**: Use Resend or NodeMailer with Next.js API routes for transactional emails
- **Background Jobs**: Use Next.js API routes with queue systems like BullMQ or pg-boss
- **Client Router**: Use Next.js `next/navigation` (`useRouter`, `Link`, `useParams`)

**Implementation Priority:**
1. **Check Next.js Documentation** - Always start with official Next.js patterns
2. **Use Next.js Generators** - Leverage create-next-app and built-in tooling
3. **Follow Next.js Conventions** - App Router, file-based routing, server components
4. **Extend Next.js Properly** - When customization needed, extend Next.js patterns, don't replace them

### Hybrid API Development Strategy

**Decision Framework**: Determine whether logic belongs in Next.js Backend or N8N based on:

- **Next.js Backend**: User-facing features, CRUD operations, authentication, frontend needs
- **N8N Workflows**: External integrations, complex orchestrations, scheduled tasks, AI coordination

### 🆕 **Unified API Integration Patterns** (UPDATED ARCHITECTURE)

**Frontend → Unified Next.js API** (All operations):

```typescript
// Dashboard data and user operations (existing)
const dashboard = await fetch('/api/dashboard/market-forces', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});
const report = await fetch(`/api/reports/${companyId}`, {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});

// NEW: N8N operations via Next.js API route wrappers (clean, authenticated)
const marketForcesReport = await fetch('/api/v1/reports/market-forces', {
  method: 'POST', 
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ companyId, reportType: 'full', urgency: 'high' })
});

const sentimentCollection = await fetch('/api/v1/ai/collect-sentiment', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ companyIds: ['comp1', 'comp2'], urgency: 'normal' })
});

const apolloSync = await fetch('/api/v1/marketing/apollo/sync', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ fullSync: false })
});
```

**External Partners → Public API**:

```typescript
// Partners integrate via documented API endpoints
const response = await fetch('https://api.hyperformant.io/v1/reports/market-forces', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ companyId: 'target-company' })
});
```

### PDF Generation Strategy

**Two Approaches Based on Use Case:**

- **Market Forces Reports** (N8N): Automated, CRM-triggered, sent to prospects
- **Dashboard Exports** (Next.js): User-initiated, account-specific, downloaded directly

### 🆕 **API Documentation & Developer Portal** (IMPLEMENTED)

**Professional API Documentation System:**

- **OpenAPI 3.0 Specification**: Auto-generated from JSDoc annotations in Next.js API route code
- **Public Developer Portal**: Beautiful Redoc documentation at `api.hyperformant.io/docs`
- **Internal Testing Interface**: Interactive Swagger UI at `api.hyperformant.io/internal` 
- **Machine-Readable Spec**: Available at `api.hyperformant.io/openapi.json` for tooling
- **Kong Insomnia Integration**: Import OpenAPI spec for team development workflows

**API Endpoint Structure:**
```
api.hyperformant.io/v1/
├── /auth/*           # Authentication & user management
├── /reports/*        # Market Forces report generation  
├── /ai/*             # AI intelligence & sentiment analysis
├── /marketing/*      # Apollo.io integration & CRM
├── /billing/*        # Payment processing & subscriptions
├── /analytics/*      # Dashboard analytics & metrics
├── /admin/*          # Administrative operations
└── /webhooks/*       # Generic webhook management
```

**Documentation Features:**
- Comprehensive JSDoc annotations with request/response schemas in Next.js API routes
- Interactive "Try it out" functionality in Swagger UI
- Beautiful, branded public documentation with Hyperformant styling
- Automatic code sample generation for multiple programming languages
- Search functionality across all API endpoints and schemas

### Configuration Management

- N8N workflow definitions in `n8n/workflows/` as JSON files
- Next.js API routes defined in `web/src/app/api/` directory  
- **🆕 API endpoints defined with Next.js App Router route handlers**
- Schemas in `schemas/` directory validate configurations using Ajv
- **🆕 OpenAPI spec auto-generated from JSDoc annotations**
- Use `npm run validate` before any deployment
- Environment variables shared between Next.js and N8N for consistency

### Database Operations

- Schema definition in `web/prisma/schema.prisma` (consolidated for all data)
- Both Next.js and N8N read/write to the same PostgreSQL database
- Next.js handles migrations: `npm run db:migrate` before `npm run db:seed`
- N8N workflows use PostgreSQL connections and Prisma Client for data operations

### N8N Workflow Deployment

- Workflow definitions in `n8n/workflows/` as JSON files
- Deploy via CLI: `npm run import:dev` or `npm run import:prod`
- N8N handles external API integrations and complex orchestrations
- Webhooks expose N8N functionality to Next.js frontend and external systems

### CLI Application

The main CLI (`src/cli.ts`) handles:

- Configuration validation with detailed error reporting
- Database migration orchestration via Next.js + Prisma
- N8N workflow deployment with environment targeting
- Health checks across both Next.js and N8N services

## Important Development Notes

### Apollo.io Integration First

- **Never duplicate Apollo.io functionality** - use their APIs and native features
- Smart Lists handle segmentation automatically with 65+ data points
- Sequences handle multi-channel outreach with built-in A/B testing
- Analytics API provides comprehensive performance data
- Enrichment API handles contact and company data updates

### Agent Configuration (Simplified)

- Oracle Agent focuses on hyperformant-specific business logic only
- Apollo Integration Agent orchestrates Apollo.io native capabilities
- Quality gates leverage Apollo.io engagement scores + custom thresholds
- Resource optimization includes Apollo.io API rate limiting

### Multi-Model AI Strategy (Cost-Optimized)

- **Apollo.io enrichment reduces AI processing needs** by 40%
- **OpenAI GPT-4o**: Complex business logic decisions
- **Claude 4 Sonnet**: Strategic analysis and recommendations
- **Gemini 2.5 Flash**: Apollo.io data processing and validation

### Database Schema (Market Intelligence + Apollo Integration)

- **NO custom segmentation tables** (use Apollo.io Smart Lists)
- **NO custom campaign tables** (use Apollo.io Sequences)
- **NO custom contact tables** (use Apollo.io contact database)
- **Market Intelligence Tables**: consumer_sentiment_data, competitor_vulnerabilities, ma_opportunities, market_forces_reports
- **Apollo Integration Tables**: apollo_smart_lists, apollo_sequences, prospect_apollo_sync, apollo_webhook_events
- **Business Logic Tables**: daily_business_metrics, sentiment_data_collection_jobs, daily_sentiment_summary
- Only hyperformant-specific business logic: Market Forces Analysis, sentiment intelligence, M&A prediction, revenue attribution

### Apollo.io + N8N Integration

- N8N workflows orchestrate Apollo.io API calls and webhook processing
- Real-time webhook events from Apollo.io trigger business logic
- Batch sync processes maintain data consistency
- Error handling respects Apollo.io rate limits and authentication

### Market Forces Analysis Target Segment

**Implemented via Apollo.io Smart Lists** (not custom database tables):

**Target Criteria** (Apollo.io filters):

- Employee count: 5-50 (expanded for Market Forces Analysis market)
- Annual revenue: $500K-$10M (focused on established but growing companies)
- Founded: 2018+ (companies with 2-6 years of market experience)
- Industries: SaaS, Software, Technology, FinTech, HealthTech, EdTech, PropTech, MarTech
- Decision makers: Founder, CEO, Co-Founder, CTO, VP Strategy, Head of Business Development

**Performance Targets** (Market Forces Analysis):

- Apollo.io reply rate: 8% (competitor intelligence messaging)
- Preview report conversion: 5-15% (3-page competitive insights)
- Full report conversion: $497 (15-page Market Forces Analysis)
- Consulting conversion: 25% of report buyers
- Monthly revenue target: $50K-75K (reports) + $25K-50K (consulting) = $100K total

### Development Phase: Market Disruption Intelligence Platform

- ✅ **Phase 1**: Simplified database schema (Market Intelligence + Apollo.io integration)
- ✅ **Phase 2**: Apollo Integration Agent and Market Intelligence Agent with sentiment analysis
- ✅ **Phase 3**: N8N orchestration workflows (Apollo sync, sentiment collection, report generation)
- ✅ **Phase 4**: PDF report generation service and Resend email delivery
- ✅ **Phase 5**: Real-time optimization framework with A/B testing and statistical analysis
- 🔄 **Phase 6**: Apollo.io Smart Lists and Sequences setup for Market Forces targeting
- ⏳ **Phase 7**: Live API integration and webhook processing
- ⏳ **Phase 8**: Production launch with Market Forces Analysis automation

**Platform-Native Rule**: Always leverage Apollo.io capabilities before building custom functionality. This architecture reduces complexity by ~40% and development time by ~30%.

## Core Services & Infrastructure

### Next.js Backend Services

**PDF Dashboard Exports** (Next.js API routes):

- React-PDF generation for user dashboard exports
- Analytics reports and data visualizations
- User-initiated downloads and email delivery
- Authentication and user-specific data handling

**User Management & Data Operations** (Next.js API routes + Hono):

- Authentication and subscription management via NextAuth.js
- Company and report CRUD operations via Hono API routes
- Dashboard data aggregation and analytics
- File upload/download and storage management

### N8N Orchestration Services

**Market Forces PDF Generation** (N8N workflows):

- React-PDF based professional report generation
- Market Forces Analysis template (3-page preview + 15-page full)
- Webhook-triggered automated generation and email delivery
- Professional styling with competitive intelligence sections

**Email Delivery System** (N8N workflows):

- Resend integration with HTML templates and PDF attachments
- Market Forces Analysis email templates (preview and full report)
- Automated prospect outreach and follow-up sequences
- Delivery tracking and engagement analytics

**AI Orchestration Workflows** (N8N workflows):

- **Apollo Integration Orchestrator**: Performance monitoring, webhook processing, business logic analysis
- **Market Intelligence Orchestrator**: Sentiment collection from multiple APIs, vulnerability detection, M&A scoring
- **Market Forces Report Generator**: Webhook-triggered report generation, data collection, email delivery

### Shared Infrastructure

**Database** (PostgreSQL via Next.js + Prisma):

- Consolidated schema accessible by both Next.js and N8N
- Real-time data sync between frontend and automation workflows
- Comprehensive audit logging and data integrity

**External API Integrations** (N8N managed):

- Apollo.io API for CRM operations and prospect data
- Social media APIs (Reddit, Twitter, G2, HackerNews) for sentiment analysis
- AI model APIs (OpenAI, Anthropic, Google) for content generation
- Payment and notification service integrations

## Strategic Vision & Business Model

**Complete Strategic Overview**: See `docs/strategic-vision.md` for the comprehensive business strategy, including:

- Market Disruption Intelligence framework ($497 Market Forces Analysis reports)
- Consumer sentiment analysis approach (Reddit, Twitter, G2, HackerNews)
- $100K/month revenue roadmap (50-200 daily prospects → 5-15% conversion)
- Aggressive automation-first execution plan (no manual validation phase)
- Competitive positioning as "anti-big consulting" with 48-hour delivery vs 6-week projects

Always check `docs/setup-guide.md` for setup instructions and `docs/business-engine-architecture.md` for business model context.

## Component Inventory

**🚨 CRITICAL: Always use existing components instead of creating new ones or writing inline components. Check this inventory first!**

### UI Primitives (`components/ui/`)

#### Buttons & Actions
- **`Button`** - Main button component with variants: `primary`, `secondary`, `light`, `ghost`. Supports `asChild` and `href` props
  ```typescript
  import { Button } from 'components/ui/Button'
  <Button variant="primary" href="/dashboard" asChild>Get Started</Button>
  ```
- **`ActionButtons`** - Horizon UI action buttons with date/sum display
- **`Follow`**, **`SeeStory`**, **`SetUp`** - Specialized action components

#### Form Inputs & Fields
- **`Input`** - Basic input component with focus states
- **`InputField`** - Horizon UI input with label, supports variants: `auth`, states: `error`, `success`
  ```typescript
  import InputField from 'components/ui/fields/InputField'
  <InputField id="email" label="Email" type="email" variant="auth" />
  ```
- **`SwitchField`** - Toggle switch component
- **`TagsField`** - Input field for tag/chip selection
- **`TextField`** - Multi-line text input
- **`VerificationCodeInput`** - Specialized input for verification codes
- **`Checkbox`** - Checkbox component
- **`Radio`** - Radio button component

#### Cards & Containers
- **`Card`** - Base card component
- **`MiniStatistics`** - Statistical cards with icon, name, and value
  ```typescript
  import MiniStatistics from 'components/ui/card/MiniStatistics'
  <MiniStatistics name="Total Users" value="1,234" icon={<UserIcon />} iconBg="bg-blue-100" />
  ```
- **`NftCard`** - Card component for NFT/product displays
- **`Course`** - Course display card
- **`Mastercard`** - Payment card display

#### Charts & Visualizations
- **`BarChart`** - Bar chart component
- **`LineChart`** - Line chart visualization
- **`LineAreaChart`** - Area chart component
- **`PieChart`** - Pie chart component
- **`CircularProgress`** - Circular progress indicator
- **`CircularProgressMini`** - Smaller circular progress

#### Navigation & Links
- **`NavLink`** - Navigation link component
- **`Dropdown`** - Dropdown menu component
- **`Popover`** - Popover/tooltip component
- **`Tooltip`** - Tooltip component

#### Data Display
- **`Badge`** - Status/label badges
- **`Event`** - Event display component
- **`OrderStep`** - Step indicator for processes
- **`SessionBadge`** - Session status badge
- **`TimelineItem`** - Timeline entry component
- **`Transaction`** - Transaction display
- **`Transfer`** - Transfer/payment display

#### Media & Images
- **`Avatar`** - User avatar component
- **`Image`** - Enhanced image component

#### Layout Components
- **`Scrollbar`** - Custom scrollbar component

### Dashboard Components (`components/dashboard/`)

#### Core Dashboard
- **`DashboardHeader`** - Main dashboard header
- **`CompanyCard`** - Company information card
- **`CompanyList`** - List of companies
- **`ReportsDashboard`** - Reports overview
- **`StreamingMetrics`** - Real-time metrics display

#### Default Dashboard Widgets
- **`Balance`** - Balance display widget
- **`DailyTraffic`** - Daily traffic statistics
- **`MostVisited`** / **`MostVisitedTable`** - Most visited pages table
- **`OverallRevenue`** - Revenue overview widget
- **`ProfitEstimation`** - Profit estimation display
- **`ProjectStatus`** - Project status widget
- **`YourCard`** - User card information
- **`YourTransfers`** - Transfer history

#### Specialized Dashboards
- **Car Interface**: `EagleView`, `MapCard`, `Phone`
- **Smart Home**: `AddDevice`, `Consumption`, `Controller`, `General`, `Home`, `Light`, `Plan`, `Temperature`, `Weather`

### Marketing Components (`components/marketing/`)

- **`Hero`** - Landing page hero section
- **`Cta`** - Call-to-action section with email capture
- **`Features`** - Features showcase section
- **`Pricing`** - Pricing table/cards
- **`LogoCloud`** - Logo display section
- **`GlobalDatabase`** - Database feature section
- **`Navigation`** - Marketing site navigation
- **`Footer`** - Marketing site footer

### Authentication Components (`components/auth/`)

- **`CenteredAuthLayout`** - Centered auth page layout
- **`DefaultAuthLayout`** - Default auth page layout
- **`PricingAuthLayout`** - Pricing-focused auth layout

### Provider Components (`components/providers/`)

- **`QueryProvider`** - React Query provider
- **`SessionProvider`** - NextAuth session provider
- **`TRPCProvider`** - tRPC client provider

### Icons (`components/ui/icons/`)

Available icons: `ClockIcon`, `CloseIcon`, `DarkmodeIcon`, `DashIcon`, `DotIcon`, `HorizonLogo`, `KanbanIcon`, `MarketIcon`, `NotificationIcon`, `ProfileIcon`, `SearchIcon`, `SignIn`, `TablesIcon`, and many more.

### Calendar Components
- **`EventCalendar`** - Full event calendar
- **`MiniCalendar`** - Compact calendar widget

### Sidebar & Navigation
- **`CompanySelector`** - Company selection dropdown for sidebar
- **`Links`** - Sidebar navigation links
- **`SidebarCard`** - Promotional cards in sidebar
- **`NavbarAuth`** - Authenticated navbar
- **`Configurator`** - Theme/layout configurator

## Component Usage Guidelines

### 🔧 Before Creating New Components

1. **Check this inventory first** - 99% of UI needs are already covered
2. **Check Horizon UI components** - Extensive pre-built component library
3. **Look for similar patterns** - Adapt existing components rather than creating new ones
4. **Consider composition** - Combine existing components instead of building from scratch

### 📝 When Adding New Components

**🤖 CLAUDE: When you create any new component, you MUST update this inventory section with:**
- Component name, location, and purpose
- Key props and usage example
- Import path example
- Add to appropriate category above

### 🎯 Import Patterns

```typescript
// UI Primitives
import { Button } from 'components/ui/Button'
import InputField from 'components/ui/fields/InputField'
import MiniStatistics from 'components/ui/card/MiniStatistics'

// Dashboard Components  
import Balance from 'components/dashboard/dashboards/default/Balance'
import DashboardHeader from 'components/dashboard/DashboardHeader'

// Marketing Components
import Hero from 'components/marketing/Hero'
import { Navigation } from 'components/marketing/Navigation'

// Charts
import BarChart from 'components/ui/charts/BarChart'
import LineChart from 'components/ui/charts/LineChart'
```

### 🎨 Horizon UI Styling

Most components use Horizon UI's styling system:
- **Colors**: `brand-500`, `navy-700`, `lightPrimary`
- **Classes**: `linear` for buttons, rounded corners with `rounded-xl`
- **Dark mode**: All components support dark mode variants

## 🚀 **Modern API Architecture 2025: Protocol-Agnostic System**

### **Core Philosophy: Build APIs That Scale Across All Protocols**

Hyperformant uses the most advanced 2025 API architecture built on **Hono + Zod OpenAPI** - a protocol-agnostic system that supports REST, GraphQL, gRPC, WebSockets, and more from a single codebase. This ensures maximum flexibility, performance, and maintainability.

### **The Hono Advantage: Universal Protocol Support**

**Built on Hono Framework:**
- **Edge-first**: Runs on Cloudflare Workers, Vercel Edge, Node.js, Bun, Deno
- **Protocol-agnostic**: Single codebase serves REST, GraphQL, gRPC, WebSockets
- **TypeScript-native**: Superior type inference and safety
- **3x Performance**: Faster than Express/Fastify
- **Auto-generated docs**: OpenAPI 3.1, GraphQL schemas, Proto files

**Development Approach:**
1. **Zod Schema First**: Define types once, use everywhere
2. **Hono Router**: Handle all protocols from single definition
3. **Auto-Generation**: Docs, types, and clients generated automatically
4. **Protocol Flexibility**: Add REST, GraphQL, gRPC, WebSockets as needed

### **Modern Architecture Stack (2025)**

#### **Hono-Powered Universal API**
```
/app/api/[[...route]]/route.ts    # Single route handler for ALL endpoints
                                  # Supports REST, GraphQL, WebSockets, gRPC

/src/schemas/                     # Zod schemas (single source of truth)
├── company.schema.ts
├── report.schema.ts
├── common.schema.ts
└── index.ts

/src/routers/                     # Hono routers with OpenAPI
├── companies.router.ts
├── reports.router.ts
├── ai.router.ts
├── marketing.router.ts
├── realtime.router.ts           # WebSocket endpoints
└── index.ts

/generated/                       # Auto-generated from schemas
├── openapi.json                 # OpenAPI 3.1 spec
├── schema.graphql               # GraphQL schema
└── api.proto                    # gRPC proto files
```

#### **Core API Utilities** (`/src/lib/api/`)
```typescript
├── validation.ts      # Zod schemas & request validation
├── auth.ts           # Authentication middleware
├── errors.ts         # Unified error handling  
├── responses.ts      # Standard response formatting
├── rate-limit.ts     # Rate limiting middleware
└── openapi.ts        # OpenAPI documentation helpers
```

#### **API Conventions**

**Request/Response Patterns:**
```typescript
// Standard Success Response
{
  "data": { /* resource data */ },
  "meta": { "timestamp": "2024-01-01T00:00:00Z" }
}

// Standard Error Response  
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid company ID format",
    "details": { /* validation errors */ }
  }
}

// Async Operation Response (202 Accepted)
{
  "data": {
    "id": "task-123",
    "status": "processing", 
    "estimatedCompletion": "2024-01-01T00:15:00Z"
  }
}
```

**Authentication:**
- All `/api/v1/*` endpoints require authentication via NextAuth.js session
- External API access via JWT tokens with proper scoping
- Admin endpoints require `isAdmin: true` in session

**Validation:**
- All request bodies validated with Zod schemas
- Type-safe request/response interfaces generated from schemas
- Runtime validation with detailed error messages

**Error Handling:**
- Consistent error response format across all endpoints
- Proper HTTP status codes (400, 401, 403, 404, 422, 500)
- Detailed error messages for development, sanitized for production

#### **OpenAPI Documentation**

**Auto-Generated from JSDoc:**
```typescript
/**
 * @openapi
 * /api/v1/companies:
 *   post:
 *     summary: Create a new company
 *     tags: [Companies]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Company name
 */
export async function POST(request: NextRequest) {
  // Implementation...
}
```

**Documentation Endpoints:**
- `GET /api/openapi.json` - Machine-readable OpenAPI specification
- Public developer portal with interactive docs
- Automated code sample generation
- Postman/Insomnia collection export

#### **Internal vs External API Separation**

**Public APIs** (`/api/v1/`):
- ✅ Well-documented with OpenAPI specs
- ✅ Versioned and backward-compatible
- ✅ Rate-limited and secured
- ✅ Suitable for partner integrations
- ✅ Comprehensive input validation
- ✅ Standardized error handling

**Internal APIs** (`/api/internal/` - only if absolutely necessary):
- For dashboard-specific operations that don't fit public API patterns
- Should be minimized - prefer public APIs when possible
- Not documented in public OpenAPI spec

#### **Migration Strategy**

**Phase 1: Foundation** (Current Priority)
1. Create API utilities and middleware
2. Establish versioned API structure (`/api/v1/`)  
3. Migrate companies endpoint with proper validation
4. Set up OpenAPI auto-generation

**Phase 2: Core Domains** (Progressive)
- Reports API (`/api/v1/reports/`)
- AI Intelligence API (`/api/v1/ai/`)
- Marketing API (`/api/v1/marketing/`)
- Analytics API (`/api/v1/analytics/`)

**Phase 3: Advanced Features** (As-Needed)
- Webhooks system
- Advanced permissions & scoping
- Rate limiting tiers
- API analytics & monitoring

### **Benefits of API-First Approach**

✅ **Consistency**: Same APIs power dashboard and external integrations  
✅ **Developer Experience**: Clean, discoverable APIs with great documentation  
✅ **Partner Enablement**: Easy for partners to integrate with Hyperformant  
✅ **Future-Proof**: Versioned APIs allow safe evolution  
✅ **Quality**: Well-defined APIs are easier to test and maintain  
✅ **Monitoring**: Clear API boundaries enable better observability

### **Development Rules**

1. **Always start with API design** for new features
2. **Use our own APIs** in dashboard React components  
3. **Document as you build** using JSDoc → OpenAPI pattern
4. **Validate everything** with Zod schemas for type safety
5. **Version carefully** - maintain backward compatibility in `/api/v1/`
6. **Test thoroughly** - APIs are the contract with our users
