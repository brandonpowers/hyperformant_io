# Simplified Hyperformant Architecture

## 🎯 **Architecture Overview**

Hyperformant now uses a **simplified, Wasp-first architecture** with native PostgreSQL and Fly.io deployment.

### **Local Development:**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Wasp App      │    │   PostgreSQL    │    │      n8n        │
│ (Frontend+API)  │◄──►│   (Database)    │◄──►│  (Workflows)    │
│ localhost:3000  │    │ localhost:5432  │    │ localhost:5678  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Inbucket      │
                    │ (Email Testing) │
                    │ localhost:9000  │
                    └─────────────────┘
```

### **Production (Fly.io):**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Wasp App       │    │ Fly PostgreSQL  │    │   Fly n8n       │
│ hyperformant     │◄──►│ hyperformant-db  │◄──►│ hyperformant-n8n │
│ .fly.dev        │    │ .fly.dev        │    │ .fly.dev        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🏗️ **Component Responsibilities**

### **1. Wasp Application** (`app/`)

- **Frontend**: React-based user interface
- **Backend**: Node.js API with Prisma ORM
- **Authentication**: Built-in email/password + social auth
- **Database**: Prisma migrations and queries
- **User Management**: Complete user lifecycle

### **2. PostgreSQL Database**

- **Single Source of Truth**: All data in one database
- **Wasp-Managed**: Prisma migrations and schema
- **Shared Access**: Both Wasp and n8n connect to same DB
- **Local**: Docker container for development
- **Production**: Fly.io managed PostgreSQL

### **3. n8n Workflow Engine**

- **Automation**: Market intelligence workflows
- **Apollo Integration**: API calls and data processing
- **AI Orchestration**: Coordinates multiple AI services
- **Database Integration**: Writes results to shared PostgreSQL
- **Local**: Docker container
- **Production**: Fly.io app instance

## 📊 **Database Schema**

### **Single Prisma Schema** (`app/app/schema.prisma`)

All tables consolidated into one schema:

#### **User Management**

- `User` - Authentication and profiles
- `Task`, `File`, `GptResponse` - User data
- `ContactFormMessage` - Support

#### **Market Intelligence**

- `Company` - Company profiles with Apollo data
- `MarketReport` - Generated market analysis reports
- `MarketData` - Flexible market research data
- `CompetitorAnalysis` - Competitive positioning
- `MarketIntelligence` - Sentiment analysis results

#### **Apollo.io Integration**

- `ApolloSmartList` - Smart list tracking
- `ApolloSequence` - Email sequence management

#### **Analytics & Metrics**

- `DailyStats` - User and revenue metrics
- `DailyBusinessMetrics` - Business KPIs
- `PageViewSource` - Traffic analytics
- `Log` - System logging

#### **n8n Integration**

- `WorkflowExecution` - Workflow run tracking
- `SystemConfig` - Configuration management

## 🚀 **Deployment Strategy**

### **Development Workflow**

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Start Wasp application
cd hyperformant-app
wasp start

# 3. n8n is available at localhost:5678
```

### **Production Deployment**

```bash
# Automated via GitHub Actions on push to main
git push origin main

# Manual deployment
cd hyperformant-app
wasp deploy fly
```

### **Fly.io Apps**

1. **hyperformant** - Main Wasp application
2. **hyperformant-n8n** - n8n workflow engine
3. **hyperformant-db** - PostgreSQL database

## 🔧 **Configuration Management**

### **Environment Files**

- `.env.development` - Local development settings
- `.env.production` - Production configuration template
- `app/.env` - Wasp-specific environment

### **Shared Configuration**

- **DATABASE_URL**: Same for Wasp and n8n
- **API Keys**: Shared across all services
- **Feature Flags**: Consistent environment settings

## ✅ **Benefits of Simplified Architecture**

### **Reduced Complexity**

- ❌ **Removed**: Supabase Auth, Kong Gateway, Multiple JWT systems
- ✅ **Simplified**: Single database, single auth system, single deployment

### **Better Developer Experience**

- **One Command Setup**: `./scripts/setup-dev.sh`
- **Single Migration System**: Prisma handles everything
- **Unified Environment**: Shared configuration across services

### **Production Ready**

- **Fly.io Native**: Optimized for Fly.io's platform
- **Auto-scaling**: Built-in horizontal scaling
- **Monitoring**: Integrated logging and metrics

### **Cost Effective**

- **Fewer Services**: Reduced hosting costs
- **Shared Database**: No redundant data storage
- **Efficient Scaling**: Pay only for what you use

## 📈 **Scaling Considerations**

### **Database Scaling**

- **Vertical**: Increase Fly.io PostgreSQL instance size
- **Read Replicas**: Add read-only replicas for analytics
- **Connection Pooling**: Built into Fly.io PostgreSQL

### **Application Scaling**

- **Wasp App**: Auto-scaling via Fly.io machines
- **n8n**: Scale based on workflow volume
- **Background Jobs**: Queue-based processing for heavy tasks

### **Monitoring**

- **Fly.io Metrics**: Built-in monitoring and alerting
- **Application Logs**: Centralized logging
- **Database Performance**: Query optimization with Prisma

This simplified architecture provides all the functionality of the previous complex setup while being significantly easier to develop, deploy, and maintain.
