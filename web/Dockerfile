# Hyperformant Next.js Application with Infisical CLI
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
RUN apk add --no-cache libc6-compat curl bash
WORKDIR /app

# Install Infisical CLI
RUN curl -1sLf https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh | bash \
    && apk add infisical

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
# Use fallback build in case Infisical tokens aren't available during build
RUN npm run build:fallback

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install Infisical CLI in production image
RUN apk add --no-cache curl bash \
    && curl -1sLf https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh | bash \
    && apk add infisical

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start with Infisical if available, fallback to direct start
CMD ["sh", "-c", "if command -v infisical >/dev/null 2>&1; then infisical run --env=production -- node server.js; else node server.js; fi"]