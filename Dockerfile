# Multi-stage Dockerfile for Hyperformant Next.js App + CLI
FROM node:18-alpine AS base

# Install dependencies
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy web package files  
COPY web/package*.json ./web/
WORKDIR /app/web
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app

# Copy all source code
COPY . .

# Build CLI
RUN npm run build:cli

# Build Next.js app
WORKDIR /app/web
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Copy built applications
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/web/.next ./web/.next
COPY --from=builder /app/web/public ./web/public
COPY --from=builder /app/web/prisma ./web/prisma

# Copy node_modules and package files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/web/node_modules ./web/node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/web/package.json ./web/package.json

# Copy Next.js configuration
COPY --from=builder /app/web/next.config.js ./web/next.config.js

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hyperformant
USER hyperformant

# Expose ports
EXPOSE 3000
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start Next.js app (CLI available via npm run commands)
WORKDIR /app/web
CMD ["npm", "start"]