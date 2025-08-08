# Hyperformant - AI-Powered Market Intelligence Platform

**AI-Powered Market Intelligence Platform**

## 📚 **Documentation**

### **📋 Project Documentation**
- [Strategic Vision & Business Model](docs/strategic-vision.md) - Complete market strategy
- [Local Development Setup](docs/setup-guide.md) - Environment configuration
- [API Architecture Details](docs/api-architecture.md) - Technical implementation
- [Business Engine Architecture](docs/business-engine-architecture.md) - Revenue model

### **🔧 Technical Documentation**  
- [**Complete API Reference**](./app/README.md) - All endpoints, testing, development
- [Project Instructions (CLAUDE.md)](./CLAUDE.md) - Development guidelines
- [Apollo.io Integration](docs/apollo-integration.md) - CRM automation
- [AI Agent Configuration](docs/ai-agents.md) - Multi-model AI setup

## 📊 **Business Model**

### **Market Forces Analysis Pipeline**

1. **Prospect Discovery** → Apollo.io Smart Lists (5-50 employee SaaS companies)
2. **Multi-Channel Outreach** → AI-generated competitive intelligence messaging
3. **Free Report Delivery** → 3-page Market Forces preview (24h delivery)
4. **Premium Upsell** → $497 comprehensive 15-page analysis
5. **Consulting Services** → Strategic implementation support

### **Revenue Targets**

- **Monthly Goal**: $100K ($75K reports + $25K consulting)
- **Conversion Funnel**: 50-200 prospects/day → 5-15% report conversion
- **Customer Acquisition**: Automated Apollo.io sequences with 8%+ reply rates

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose (for N8N workflows)
- Apollo.io account with API access
- PostgreSQL database

### Installation

```bash
git clone <repository>
cd hyperformant

# Install dependencies for both CLI and web
npm run install:all

# Set up environment (follow prompts)
npm run setup

# Start development
cd web && npm run dev
```

### Start Development Environment

```bash
# Start Next.js application (most common)
cd web && npm run dev

# Or from root directory
npm run dev

# Database operations
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with initial data
```

### **Service URLs (Development)**

- **Main App**: http://localhost:3000
- **n8n Workflows**: http://localhost:5678 (admin/admin)
- **Email Testing**: http://localhost:9000
- **PostgreSQL**: localhost:5432

---

## 🏗️ Architecture Overview

### Technology Stack

- **Frontend & Backend**: Next.js
- **Database**: PostgreSQL (single database for everything)
- **Orchestration**: N8N workflows
- **AI Integration**: OpenAI + Anthropic + Google AI
- **CRM Integration**: Apollo.io native APIs
- **Email**: Resend
- **Payments**: LemonSqueezy
- **Analytics**: Plausible + PostHog
- **Business Intelligence**: Metabase
- **Deployment**: Fly.io

### Key Design Principles

**Architecture**: Next.js full-stack framework + PostgreSQL + N8N + Apollo.io

1. **Next.js-First**: Use Next.js built-in features for auth, database, deployment
2. **Single Database**: All data in PostgreSQL via Prisma
3. **Apollo.io Native**: Use Apollo APIs instead of building CRM features
4. **N8N Orchestration**: Coordinate AI agents and workflows
5. **Unified API**: Next.js backend API wraps any Apollo operations or N8N webhooks for a unified API interface and developer portal

### **🆕 Unified API Design** (Updated)

- **Single API Surface** - All functionality accessible via `api.hyperformant.io/v1/*`
- **N8N Wrapper Pattern** - Complex orchestrations wrapped in clean Next.js endpoints
- **Professional Documentation** - Auto-generated OpenAPI specs with Swagger UI + Redoc
- **PostgreSQL** - Single database accessible by both systems
- **Fly.io** - Production deployment platform

> **📚 Technical Details**: See [`./app/README.md`](./app/README.md) for complete API documentation and implementation details.

**🆕 Unified API Benefits**

✅ **Single Authentication** - Bearer token auth across all endpoints  
✅ **Consistent Responses** - Uniform JSON format with proper error handling  
✅ **Professional Documentation** - Beautiful Redoc + Interactive Swagger UI  
✅ **External Partner Ready** - Clean API for third-party integrations  
✅ **Type Safety** - Full TypeScript support throughout

**🆕 API Documentation**

- **📚 Public Developer Portal**: `https://api.hyperformant.io/docs` (Beautiful Redoc)
- **🛠️ Internal Testing**: `https://api.hyperformant.io/internal` (Interactive Swagger UI)
- **⚙️ OpenAPI Spec**: `https://api.hyperformant.io/openapi.json` (Machine-readable)
- **🔧 Local Development**: `http://localhost:3001/docs` and `http://localhost:3001/internal`

---

## 📊 Project Structure

```
hyperformant/
├── web/                        # Main Next.js application
│   ├── next.config.js          # Next.js configuration
│   ├── prisma/schema.prisma    # Database schema (all tables)
│   └── src/                    # React frontend + Node.js backend
├── n8n/                        # N8N Definitions
│   ├── schemas                 # N8N AI agent configurations
│   ├── workflows               # N8N workflow definitions
├── src/                        # CLI tools for validation & deployment
├── scripts/                    # Setup and deployment scripts
└── docker-compose.yml          # Local development services
```

## **Database Schema**

All tables consolidated in single Prisma schema:

- **User Management**: Users, tasks, files, auth
- **Market Intelligence**: Companies, reports, sentiment analysis
- **Apollo Integration**: Smart lists, sequences, sync status
- **Analytics**: Daily stats, business metrics, logs
- **Workflow Tracking**: n8n execution history

---

## 🛠️ Development Commands

### Application Development

```bash
# From web directory
cd web && npm run dev    # Start Next.js app (frontend + backend)
cd web && npm run build  # Build Next.js application for production
cd web && npm start      # Start production build

# From root directory
npm run build           # Build Next.js application
npm run dev             # Run CLI development tools
```

### Database Operations (via Prisma)

```bash
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed database with initial data
npm run db:reset         # Reset database (dev only)
npm run db:studio        # Open Prisma Studio
npm run db:generate      # Generate Prisma client
```

### Code Quality

```bash
npm run test             # Run Jest tests
npm run lint             # ESLint checking
npm run format           # Prettier formatting
npm run validate         # Validate JSON configurations
```

### Setup & Maintenance

```bash
npm run install:all      # Install all dependencies (root + web)
npm run setup            # Initial project setup
npm run clean:all        # Clean all build artifacts and node_modules
```

---

## 🔧 Configuration

### Environment Setup

Copy `.env.server.example` to `.env.server` and configure:

```bash
# Database (handled by Docker Compose in dev)
DATABASE_URL=postgresql://postgres:hyperformant-dev@localhost:5432/hyperformant

# Required APIs
APOLLO_API_KEY=your_apollo_api_key
OPENAI_API_KEY=your_openai_api_key

# Optional APIs
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
RESEND_API_KEY=your_resend_api_key
LEMONSQUEEZY_API_KEY=lmsq_api_your_key

# Analytics & BI
PLAUSIBLE_API_KEY=your_plausible_api_key
POSTHOG_API_KEY=your_posthog_api_key
METABASE_API_KEY=your_metabase_api_key

# N8N (for workflow automation)
N8N_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key

# Security
JWT_SECRET=your-32-character-secret-key
```

### **Required Environment Variables**

```bash
# Database
DATABASE_URL=postgresql://...

# Apollo.io
APOLLO_API_KEY=your-apollo-key

# AI Services
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_AI_API_KEY=your-google-ai-key

# Email & Payments
RESEND_API_KEY=your-resend-key
LEMONSQUEEZY_API_KEY=your-lemonsqueezy-key

# Analytics & BI
PLAUSIBLE_API_KEY=your-plausible-key
POSTHOG_API_KEY=your-posthog-key
METABASE_API_KEY=your-metabase-key

# n8n Integration
N8N_URL=your-n8n-instance
N8N_API_KEY=your-n8n-api-key
```

### Service URLs (Development)

- **Next.js App**: http://localhost:3000
- **N8N Workflows**: http://localhost:5678 (admin/admin)
- **Email Testing**: http://localhost:9000
- **PostgreSQL**: localhost:5432

---

## 💼 Business Model

### Market Forces Analysis Pipeline

1. **Prospect Discovery** → Apollo.io Smart Lists (5-50 employee SaaS companies)
2. **Multi-Channel Outreach** → AI-generated competitive intelligence messaging
3. **Free Report Delivery** → 3-page Market Forces preview (24h delivery)
4. **Premium Upsell** → $497 comprehensive 15-page analysis
5. **Consulting Services** → Strategic implementation support

### Revenue Targets

- **Monthly Goal**: $100K ($75K reports + $25K consulting)
- **Conversion Funnel**: 50-200 prospects/day → 5-15% report conversion
- **Customer Acquisition**: Automated Apollo.io sequences with 8%+ reply rates

---

## 🤖 AI Agent System

### Agent Configurations (JSON)

- **Oracle Agent** (`agents/oracle-config.json`) - Master orchestrator
- **Apollo Integration** (`agents/apollo-integration-config.json`) - CRM automation
- **Market Intelligence** (`agents/market-intelligence-config.json`) - Sentiment analysis
- **Company Research** (`agents/company-research-config.json`) - Financial analysis
- **Data Quality** (`agents/data-quality-config.json`) - Validation

### N8N Workflows

- **Apollo Integration Orchestrator** - Performance monitoring, webhooks
- **Market Intelligence Orchestrator** - Sentiment collection from APIs
- **Market Forces Report Generator** - Automated report generation

---

## 🚀 Deployment

### Automatic Deployment

Pushing to `main` branch triggers automatic deployment to Fly.io:

```bash
git push origin main
# GitHub Actions deploys Next.js app automatically
```

### Manual Deployment

```bash
# Validate and deploy (includes migrations and n8n import)
npm run deploy
```

### Production URLs

- **App**: https://hyperformant.fly.dev
- **Database**: Fly.io managed PostgreSQL

---

## 🔍 Monitoring & Health Checks

### Health & Validation Commands

```bash
npm run validate        # Validate JSON configurations
npm run setup           # Validate and set up environment
```

### Local Development

- **Logs**: Docker Compose logs for all services
- **Database**: Direct PostgreSQL access
- **Workflows**: n8n execution history

### **Production**

- **Fly.io Metrics**: Built-in monitoring and alerting
- **Application Logs**: Centralized logging
- **Database Performance**: Prisma query optimization

---

## 🛠️ Troubleshooting

### Common Issues

**Next.js Build Errors**:

```bash
cd web && npm run build  # Check for build errors
cd web && npm run dev    # Restart development server
```

**Database Connection Issues**:

```bash
npm run db:migrate       # Apply latest migrations
npm run db:reset         # Reset database (development only)
npm run db:studio        # Open Prisma Studio to inspect data
```

**Environment Validation**:

```bash
npm run setup            # Check and configure environment
npm run validate         # Validate all JSON configurations
```

---

## 📚 Resources

### Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Hono Documentation](https://hono.dev/docs/)
- [Apollo.io API Docs](https://apolloio.github.io/apollo-api-docs/)
- [N8N Documentation](https://docs.n8n.io/)

### 📄 **License**

This project is proprietary software. All rights reserved.

### 🆘 **Support**

- **Issues**: [GitHub Issues](https://github.com/your-org/hyperformant/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/hyperformant/discussions)
- **Email**: support@hyperformant.io

---

**Hyperformant leverages modern full-stack frameworks (Next.js, Hono, Prisma, PostgreSQL) and proven platforms (Apollo.io, N8N) to deliver automated market intelligence at scale.** 🚀
