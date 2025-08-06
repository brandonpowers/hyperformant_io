# Hyperformant Deployment Guide

## Architecture Overview

Hyperformant uses a **modern full-stack architecture** with:

- Next.js framework (React + Node.js + Prisma)
- Single PostgreSQL database for all data
- Local development using Docker Compose
- Production deployment to Fly.io via GitHub Actions

## Local Development Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ and npm
- Git

### Quick Start

1. **Clone and install**

   ```bash
   git clone <repository>
   cd hyperformant
   npm install
   ```

2. **Setup environment**

   ```bash
   # Copy environment template
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

3. **Start infrastructure services**

   ```bash
   npm run dev:infra
   # This starts PostgreSQL, n8n, and email testing
   ```

4. **Run database migrations**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start the Next.js application**
   ```bash
   npm run dev:web
   # This starts the Next.js application
   ```

### Service URLs (Local)

- **Next.js App**: http://localhost:3000
- **n8n**: http://localhost:5678 (admin/admin)
- **PostgreSQL**: localhost:5432
- **Email Testing**: http://localhost:9000

## Production Deployment

### Automatic Deployment (Recommended)

Pushing to the `main` branch automatically triggers deployment:

```bash
git push origin main
```

GitHub Actions will:

1. Build the Next.js application
2. Run tests and validation
3. Deploy to Fly.io
4. Run database migrations

### Manual Deployment

If needed, you can deploy manually:

```bash
# Deploy Next.js application
npm run build
flyctl deploy --config fly.toml

# Deploy n8n (if not using cloud version)
flyctl deploy --config n8n/fly.toml
```

### Environment Variables (Production)

Set these in Fly.io dashboard or via CLI:

```bash
flyctl secrets set \
  DATABASE_URL="postgres://..." \
  APOLLO_API_KEY="your-key" \
  OPENAI_API_KEY="your-key" \
  JWT_SECRET="your-secret" \
  NODE_ENV="production"
```

## Database Management

### Migrations

```bash
# Development
npm run db:migrate

# Production (automatic via deploy)
# Or manually:
flyctl ssh console -a hyperformant
cd web && npm run db:migrate
```

### Backups

Fly.io PostgreSQL includes automatic daily backups. For manual backup:

```bash
flyctl postgres backup create -a hyperformant-db
```

## Monitoring

### Health Checks

```bash
# Local
npm run health

# Production
flyctl status -a hyperformant
```

### Logs

```bash
# Application logs
flyctl logs -a hyperformant

# Database logs
flyctl logs -a hyperformant-db
```

## Troubleshooting

### Common Issues

**Port conflicts**

```bash
# Stop all services
docker-compose down
# Check for orphaned containers
docker ps -a
```

**Database connection issues**

```bash
# Verify PostgreSQL is running
docker-compose ps
# Check connection string
echo $DATABASE_URL
```

**Deployment failures**

```bash
# Check GitHub Actions logs
# Verify secrets are set
flyctl secrets list -a hyperformant
```

## Rollback

To rollback a deployment:

```bash
# List releases
flyctl releases -a hyperformant

# Rollback to specific version
flyctl deploy -a hyperformant --image registry.fly.io/hyperformant@<version>
```

## Security Notes

- Never commit `.env.local` or any file with real credentials
- Use Fly.io secrets for production environment variables
- Rotate JWT_SECRET and API keys regularly
- Enable 2FA on Fly.io and GitHub accounts
