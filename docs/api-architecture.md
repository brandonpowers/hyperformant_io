# Hyperformant API Architecture

## 🎯 Overview

Hyperformant implements a **unified API architecture** that wraps all N8N webhook operations in clean, authenticated Wasp endpoints. This provides a single, professional API surface for both internal use and external partner integrations.

**🆕 NEW ARCHITECTURE** (Implemented):
- **Unified Wasp API**: Single API surface at `api.hyperformant.io/v1/*` 
- **N8N Wrapper Pattern**: All N8N webhooks wrapped in authenticated Wasp endpoints
- **Professional Documentation**: Auto-generated OpenAPI specs with beautiful Redoc + Swagger UI
- **External Partner Ready**: Clean, documented API for third-party integrations

Both the unified API and N8N orchestrations share a single PostgreSQL database and provide seamless integration patterns.

## Architecture Principles

### Separation of Concerns

**Decision Framework**: Determine API placement based on:

| Criteria           | Wasp Backend           | N8N Webhooks            |
| ------------------ | ---------------------- | ----------------------- |
| **Purpose**        | User-facing features   | External integrations   |
| **Complexity**     | Simple CRUD operations | Complex orchestrations  |
| **Authentication** | User sessions          | API keys/webhooks       |
| **Timing**         | Synchronous requests   | Asynchronous workflows  |
| **Data Access**    | User-specific data     | Cross-system data flows |

### 🆕 **Unified API Interface** (UPDATED)

**Single API surface** accessible from frontend and external partners:

```typescript
// Unified Wasp API - All operations use consistent patterns
const dashboard = await getMarketForcesData({ timeRange: 'week' });
const report = await getCompanyReport({ companyId });

// 🆕 N8N Operations via Wasp Wrappers (NEW IMPLEMENTATION)
const marketForcesReport = await fetch('/v1/reports/market-forces', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({ companyId, reportType: 'full', urgency: 'high' })
});

const sentimentCollection = await fetch('/v1/ai/collect-sentiment', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({ companyIds: ['comp1', 'comp2'], urgency: 'normal' })
});
```

### **API Benefits**
- ✅ **Single Authentication**: Bearer token auth across all endpoints
- ✅ **Consistent Responses**: Uniform JSON format with proper error handling  
- ✅ **Professional Documentation**: Auto-generated OpenAPI specs
- ✅ **Type Safety**: Full TypeScript support throughout
- ✅ **External Partner Ready**: Clean API for third-party integrations

## 🆕 **Unified Wasp API** (NEW IMPLEMENTATION)

### **Complete API Surface** 

**All Functionality Accessible via Single API:**

- **User Management**: Authentication, registration, subscriptions, permissions
- **Core Data Operations**: CRUD for companies, reports, market data
- **🆕 N8N Wrapper Endpoints**: All N8N webhooks wrapped in authenticated Wasp actions
- **Payment Processing**: LemonSqueezy integration with global tax compliance
- **File Management**: Upload/download, storage integration
- **🆕 API Documentation**: Auto-generated OpenAPI specs with beautiful Redoc + Swagger UI
- **Dashboard Integration**: Analytics queries, report viewing, user preferences

### **🆕 API Documentation & Developer Portal** (IMPLEMENTED)

**Professional Documentation System:**
- **Public Developer Portal**: Beautiful Redoc documentation at `api.hyperformant.io/docs`
- **Internal Testing Interface**: Interactive Swagger UI at `api.hyperformant.io/internal`
- **Machine-Readable Spec**: Available at `api.hyperformant.io/openapi.json` for tooling
- **Kong Insomnia Integration**: Import OpenAPI spec for team development workflows

**Documentation Features:**
- Comprehensive JSDoc annotations with request/response schemas
- Interactive "Try it out" functionality in Swagger UI  
- Beautiful, branded public documentation with Hyperformant styling
- Automatic code sample generation for multiple programming languages
- Search functionality across all API endpoints and schemas

### **🆕 Complete API Endpoint Reference** (IMPLEMENTED)

#### **📊 Reports API** (`/v1/reports/*`)
- `POST /v1/reports/market-forces` - Generate Market Forces Analysis report
  - **Request**: `{ companyId: string, reportType: 'preview' | 'full', urgency: 'low' | 'normal' | 'high' }`
  - **Response**: `{ success: boolean, reportId: string, status: 'queued' | 'processing' | 'completed' }`
  - **Authentication**: Bearer token required

#### **🤖 AI Intelligence API** (`/v1/ai/*`)  
- `POST /v1/ai/collect-sentiment` - Trigger sentiment data collection from social platforms
  - **Request**: `{ companyIds: string[], urgency: 'normal' | 'high', sources: string[] }`
  - **Response**: `{ success: boolean, jobId: string, estimatedCompletion: string }`
  - **Authentication**: Bearer token required

#### **🚀 Marketing API** (`/v1/marketing/*`)
- `POST /v1/marketing/apollo/sync` - Trigger Apollo.io data sync (Admin only)
  - **Request**: `{ syncType: 'full' | 'incremental', entities: string[] }`
  - **Response**: `{ success: boolean, syncId: string, status: 'started' }`
  - **Authentication**: Bearer token required + Admin role
- `GET /v1/marketing/apollo/status` - Get Apollo sync status
  - **Response**: `{ success: boolean, lastSync: string, status: 'idle' | 'syncing' | 'error' }`
  - **Authentication**: Bearer token required + Admin role

#### **💳 Billing API** (`/v1/billing/*`)
- `POST /v1/billing/checkout` - Create checkout session
  - **Request**: `{ planId: string, successUrl?: string, cancelUrl?: string }`
  - **Response**: `{ success: boolean, checkoutUrl: string, sessionId: string }`
  - **Authentication**: Bearer token required
- `GET /v1/billing/subscription` - Get user subscription details
  - **Response**: `{ success: boolean, subscription: SubscriptionObject, usage: UsageObject }`
  - **Authentication**: Bearer token required

#### **📈 Analytics API** (`/v1/analytics/*`)
- `GET /v1/analytics/revenue` - Revenue metrics and charts
  - **Query Params**: `timeRange: 'day' | 'week' | 'month' | 'quarter'`
  - **Response**: `{ success: boolean, data: RevenueData, charts: ChartData[] }`
  - **Authentication**: Bearer token required + Admin role
- `POST /v1/analytics/export` - Export analytics as PDF
  - **Request**: `{ reportType: string, timeRange: string, format: 'pdf' | 'csv' }`
  - **Response**: `{ success: boolean, downloadUrl: string, fileId: string }`
  - **Authentication**: Bearer token required

#### **👨‍💼 Admin API** (`/v1/admin/*`)
- `GET /v1/admin/users` - List all users (Admin only)
  - **Query Params**: `page?: number, limit?: number, search?: string`
  - **Response**: `{ success: boolean, users: UserObject[], pagination: PaginationObject }`
  - **Authentication**: Bearer token required + Admin role
- `GET /v1/admin/metrics` - System health metrics
  - **Response**: `{ success: boolean, metrics: SystemMetrics, health: HealthStatus }`
  - **Authentication**: Bearer token required + Admin role

### **🆕 Unified API Implementation Details** (NEW IMPLEMENTATION)

**N8N Wrapper Pattern:**
All complex orchestrations are wrapped in clean Wasp endpoints:

```typescript
// Example: Market Forces Report Generation Wrapper
export const generateMarketForcesReport = async (request, response, context) => {
  if (!context.user) {
    return response.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    })
  }

  const { companyId, reportType, urgency } = request.body

  // Validate request
  if (!companyId || !reportType) {
    return response.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }
    })
  }

  // Create report record
  const report = await context.entities.MarketReport.create({
    data: {
      companyId,
      reportType,
      status: 'queued',
      userId: context.user.id
    }
  })

  // Trigger N8N webhook
  const n8nResponse = await fetch(process.env.N8N_WEBHOOK_URL + '/generate-market-forces-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reportId: report.id,
      companyId,
      reportType,
      urgency: urgency || 'normal',
      userId: context.user.id
    })
  })

  if (!n8nResponse.ok) {
    await context.entities.MarketReport.update({
      where: { id: report.id },
      data: { status: 'failed' }
    })
    
    return response.status(500).json({
      success: false,
      error: { code: 'N8N_ERROR', message: 'Failed to trigger report generation' }
    })
  }

  return response.status(202).json({
    success: true,
    reportId: report.id,
    status: 'queued',
    message: 'Report generation started'
  })
}
```

**Benefits of Wrapper Pattern:**
- ✅ **Single Authentication Layer**: All endpoints use consistent JWT auth
- ✅ **Unified Error Handling**: Consistent error responses across all operations
- ✅ **Database Integration**: Direct Prisma access for user/business data
- ✅ **Professional Documentation**: Auto-generated OpenAPI specs from JSDoc
- ✅ **Type Safety**: Full TypeScript support for request/response validation

## Legacy Wasp Backend API

### Responsibilities (Being Wrapped)

**Core Application Logic:**

- User authentication and session management
- Subscription and payment processing (LemonSqueezy integration)
- Company and report CRUD operations  
- Dashboard data aggregation and analytics (Plausible + PostHog integration)
- User-initiated file operations and exports
- Business intelligence dashboards (Metabase integration)

**PDF Generation:**

- Dashboard and analytics exports
- User-specific reports and data visualizations
- Account-level document generation

### Key Endpoints

```typescript
// Authentication & User Management
POST /api/auth/login
POST /api/auth/signup
GET  /api/user/profile
PUT  /api/user/profile

// Companies & Reports (CRUD)
GET    /api/companies
POST   /api/companies
GET    /api/companies/:id
PUT    /api/companies/:id
DELETE /api/companies/:id

GET    /api/reports
POST   /api/reports
GET    /api/reports/:id
PUT    /api/reports/:id

// Dashboard & Analytics
GET /api/dashboard/market-forces
GET /api/dashboard/analytics
GET /api/analytics/daily-stats
GET /api/analytics/revenue-data

// PDF Exports (User-initiated)
POST /api/reports/export-dashboard
POST /api/reports/export-analytics
GET  /api/reports/download/:id

// File Management
POST /api/files/upload
GET  /api/files/:id/download
DELETE /api/files/:id

// Subscriptions & Payments
POST /api/subscriptions/create-checkout
GET  /api/subscriptions/portal-url
POST /api/webhooks/lemonsqueezy
```

### Implementation Pattern

```typescript
// Wasp action example
export const generateDashboardExport: GenerateDashboardExport = async (
  { dashboardType, timeRange, format },
  context
) => {
  const { user } = context;

  // Get user-specific data
  const dashboardData = await getDashboardData(user.id, timeRange);

  // Generate PDF using React-PDF
  const pdfBuffer = await generateDashboardPDF(dashboardData, format);

  // Save to user's files
  const file = await context.entities.File.create({
    data: {
      userId: user.id,
      filename: `dashboard-${dashboardType}-${timeRange}.pdf`,
      content: pdfBuffer,
      mimeType: 'application/pdf',
    },
  });

  return { fileId: file.id, downloadUrl: `/api/files/${file.id}/download` };
};
```

## N8N Webhook API

### Responsibilities

**Complex Orchestrations:**

- External API integrations (Apollo.io, social media, AI models)
- Multi-step workflow automation and scheduling
- AI agent coordination and processing
- Cross-system data synchronization
- Automated report generation and delivery

**Market Forces PDF Generation:**

- Automated prospect report creation
- AI-generated competitive intelligence reports
- Email delivery with professional templates

### Key Webhook Endpoints

```typescript
// Scheduled Workflows
POST / webhook / apollo - sync - schedule;
POST / webhook / sentiment - collection - schedule;
POST / webhook / daily - metrics - collection;

// Manual Triggers (Frontend → N8N)
POST / webhook / generate - market - forces - report;
POST / webhook / collect - market - intelligence;
POST / webhook / analyze - competitor - vulnerabilities;

// External Webhooks (Third-party → N8N)
POST / webhook / apollo - webhook;
POST / webhook / lemonsqueezy - webhook;
POST / webhook / email - webhook;
POST / webhook / plausible - webhook;
POST / webhook / posthog - webhook;

// Agent Coordination
POST / webhook / oracle - agent;
POST / webhook / apollo - integration - agent;
POST / webhook / market - intelligence - agent;
POST / webhook / company - research - agent;
```

### Implementation Pattern

```json
{
  "name": "Market Forces Report Generator",
  "nodes": [
    {
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "generate-market-forces-report"
      }
    },
    {
      "name": "Fetch Company Data",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{ $env.SUPABASE_URL }}/rest/v1/companies",
        "method": "GET"
      }
    },
    {
      "name": "Generate Report Content",
      "type": "n8n-nodes-base.openAi",
      "parameters": {
        "model": "gpt-4o",
        "prompt": "Generate Market Forces Analysis..."
      }
    },
    {
      "name": "Generate PDF",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{ $env.PDF_SERVICE_URL }}/generate",
        "method": "POST"
      }
    },
    {
      "name": "Send Email",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.resend.com/emails",
        "method": "POST"
      }
    }
  ]
}
```

## Data Flow Patterns

### Synchronous Operations (Wasp)

```typescript
// Frontend request → Wasp action → Database → Response
Frontend Request
    ↓
Wasp Action (Authentication & Validation)
    ↓
Database Query/Mutation
    ↓
Response to Frontend
```

### Asynchronous Operations (N8N)

```typescript
// Frontend trigger → N8N webhook → External APIs → Database → Notifications
Frontend HTTP Request
    ↓
N8N Webhook Trigger
    ↓
External API Calls (Apollo.io, AI models, etc.)
    ↓
Database Updates (via REST API)
    ↓
Email/Slack Notifications
    ↓
Optional Frontend Polling for Status
```

## Security & Authentication

### Wasp Backend Security

- **User Authentication**: JWT tokens via Wasp auth
- **Session Management**: Built-in Wasp session handling
- **Authorization**: Role-based access control
- **Input Validation**: Wasp validation layer + custom validators

### N8N Webhook Security

- **API Keys**: Environment-based API key authentication
- **Webhook Signatures**: Verification of external webhook sources
- **Rate Limiting**: N8N built-in rate limiting + custom logic
- **Input Sanitization**: Validation at webhook entry points

## Database Integration

### Shared Database Strategy

Both Wasp and N8N access the same PostgreSQL database:

**Wasp**: Direct Prisma ORM access

```typescript
const companies = await context.entities.Company.findMany({
  where: { userId: user.id },
});
```

**N8N**: REST API access via Supabase or custom endpoints

```typescript
// HTTP Request node in N8N
{
  "url": "{{ $env.SUPABASE_URL }}/rest/v1/companies",
  "headers": {
    "Authorization": "Bearer {{ $env.SUPABASE_SERVICE_KEY }}"
  }
}
```

### Data Consistency

- **Single Source of Truth**: PostgreSQL database
- **Atomic Operations**: Database transactions where needed
- **Audit Logging**: Track changes from both systems
- **Conflict Resolution**: Last-write-wins with timestamps

## Frontend Integration

### Wasp Backend Integration

```typescript
// Using Wasp's built-in query/action system
import { useQuery, generateDashboardExport } from '@wasp/queries'

const DashboardComponent = () => {
  const { data: marketData } = useQuery(getMarketForcesData, { timeRange: 'week' })

  const handleExport = async () => {
    const result = await generateDashboardExport({
      dashboardType: 'market-forces',
      timeRange: 'week',
      format: 'pdf'
    })
    window.open(result.downloadUrl)
  }

  return <Dashboard data={marketData} onExport={handleExport} />
}
```

### **🆕 Unified API Integration** (NEW IMPLEMENTATION)

```typescript
// All operations now use unified Wasp API endpoints
const MarketForcesComponent = () => {
  const [reportStatus, setReportStatus] = useState('idle')

  const generateReport = async (companyId: string) => {
    setReportStatus('generating')

    try {
      const response = await fetch('/v1/reports/market-forces', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          companyId,
          reportType: 'preview',
          urgency: 'normal'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setReportStatus('success')
        // Poll /v1/reports/market-forces/{reportId}/status for completion
      } else {
        setReportStatus('error')
      }
    } catch (error) {
      setReportStatus('error')
    }
  }

  return <ReportGenerator onGenerate={generateReport} status={reportStatus} />
}
```

### **Legacy N8N Direct Integration** (DEPRECATED)

```typescript
// OLD: Direct HTTP calls to N8N webhooks (NO LONGER RECOMMENDED)
const MarketForcesComponent = () => {
  // This pattern is deprecated - use unified API endpoints instead
  const generateReport = async (companyDomain: string) => {
    const response = await fetch('/api/n8n/generate-market-forces-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_domain: companyDomain,
        report_type: 'preview',
        customer_email: user.email,
        urgency: 'normal'
      })
    })
  }
}
```

## Error Handling & Monitoring

### Wasp Backend

- **Built-in Error Handling**: Wasp's error boundary system
- **Logging**: Winston or similar logging framework
- **Monitoring**: Wasp's built-in metrics + custom dashboards

### N8N Workflows

- **Retry Logic**: N8N's built-in retry mechanisms
- **Error Nodes**: Dedicated error handling workflows
- **Alerting**: Slack/email notifications for failed workflows
- **Monitoring**: N8N execution history + external monitoring

## Development Workflow

### Local Development

```bash
# Start Wasp backend
cd app && wasp start

# Start N8N (via Docker)
docker-compose up n8n

# Deploy N8N workflows
npm run import:dev
```

### Testing Strategy

- **Wasp**: Unit tests + integration tests via Wasp test framework
- **N8N**: Workflow testing via N8N UI + automated webhook testing
- **End-to-End**: Full pipeline testing with both systems

### Deployment

- **Wasp**: `wasp deploy fly` for Wasp application
- **N8N**: N8N Cloud or self-hosted deployment
- **Database**: Shared PostgreSQL on Fly.io or similar

This hybrid architecture provides clean separation of concerns while maintaining easy integration patterns for the frontend team.
