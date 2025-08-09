-- CreateEnum
CREATE TYPE "public"."ReportType" AS ENUM ('PREVIEW', 'FULL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."EntityRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."EntityType" AS ENUM ('COMPANY', 'PRODUCT', 'PERSON', 'MARKET', 'SEGMENT');

-- CreateEnum
CREATE TYPE "public"."SignalCategory" AS ENUM ('MARKET', 'COMPETITIVE', 'DEAL', 'PRODUCT', 'TALENT', 'RISK', 'ENGAGEMENT');

-- CreateEnum
CREATE TYPE "public"."SignalType" AS ENUM ('ACQUISITION', 'FUNDING_ROUND', 'PARTNERSHIP', 'COMPETITOR_LAUNCH', 'PRICING_CHANGE', 'MARKET_ENTRY', 'CUSTOMER_WIN', 'CUSTOMER_LOSS', 'PRESS_MENTION', 'SOCIAL_POST', 'REVIEW', 'PRODUCT_LAUNCH', 'MAJOR_UPDATE', 'PATENT_FILED', 'EXEC_HIRE', 'EXEC_DEPARTURE', 'LAYOFF', 'LAWSUIT', 'SECURITY_BREACH', 'REGULATORY_CHANGE', 'TRAFFIC_SPIKE', 'SEO_RANK_CHANGE', 'ANALYST_FORECAST', 'TREND_REPORT', 'IPO', 'MERGER', 'CONTROVERSY');

-- CreateEnum
CREATE TYPE "public"."SentimentLabel" AS ENUM ('NEGATIVE', 'NEUTRAL', 'POSITIVE');

-- CreateEnum
CREATE TYPE "public"."ConnectionType" AS ENUM ('PARTNERSHIP', 'COMPETITOR', 'CUSTOMER_SUPPLIER', 'INVESTOR_PORTFOLIO', 'OWNERSHIP', 'BOARD_LINK', 'JOINT_RD', 'CO_PATENT', 'TECH_AFFINITY', 'REGULATORY', 'LEGAL_DISPUTE', 'SUPPLY_CHAIN', 'INDUSTRY_ADJACENCY', 'WEAK_COMPETITOR');

-- CreateEnum
CREATE TYPE "public"."MetricKind" AS ENUM ('FINANCIAL', 'DIGITAL', 'OPERATIONAL', 'SENTIMENT', 'INNOVATION');

-- CreateEnum
CREATE TYPE "public"."TimeWindow" AS ENUM ('DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR');

-- CreateEnum
CREATE TYPE "public"."RunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."DataSourceType" AS ENUM ('API', 'SCRAPER', 'MANUAL', 'LLM');

-- CreateEnum
CREATE TYPE "public"."ImpactRole" AS ENUM ('SUBJECT', 'ACTOR', 'TARGET', 'MENTIONED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "verificationCode" TEXT,
    "verificationExpiry" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "paymentProcessorUserId" TEXT,
    "lemonSqueezyCustomerPortalUrl" TEXT,
    "subscriptionStatus" TEXT,
    "subscriptionPlan" TEXT,
    "datePaid" TIMESTAMP(3),
    "credits" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."GptResponse" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "GptResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "time" TEXT NOT NULL DEFAULT '1',
    "isDone" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."File" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "uploadUrl" TEXT NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyStats" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "prevDayViewsChangePercent" TEXT NOT NULL DEFAULT '0',
    "userCount" INTEGER NOT NULL DEFAULT 0,
    "paidUserCount" INTEGER NOT NULL DEFAULT 0,
    "userDelta" INTEGER NOT NULL DEFAULT 0,
    "paidUserDelta" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "DailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PageViewSource" (
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dailyStatsId" INTEGER,
    "visitors" INTEGER NOT NULL,

    CONSTRAINT "PageViewSource_pkey" PRIMARY KEY ("date","name")
);

-- CreateTable
CREATE TABLE "public"."Logs" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "level" TEXT NOT NULL,

    CONSTRAINT "Logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContactFormMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "repliedAt" TIMESTAMP(3),

    CONSTRAINT "ContactFormMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."entity_members" (
    "id" UUID NOT NULL,
    "role" "public"."EntityRole" NOT NULL DEFAULT 'VIEWER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityId" UUID NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "entity_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."entity_access_requests" (
    "id" UUID NOT NULL,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "requestedRole" "public"."EntityRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entityId" UUID NOT NULL,
    "requesterId" TEXT NOT NULL,

    CONSTRAINT "entity_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reports" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "public"."ReportType" NOT NULL,
    "status" "public"."ReportStatus" NOT NULL DEFAULT 'PENDING',
    "content" TEXT,
    "filePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entityId" UUID NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sentiment_data" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "content" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sentiment_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."daily_metrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "prospectCount" INTEGER NOT NULL DEFAULT 0,
    "replyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "previewConversions" INTEGER NOT NULL DEFAULT 0,
    "fullReportSales" INTEGER NOT NULL DEFAULT 0,
    "consultingConversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."apollo_smart_lists" (
    "id" TEXT NOT NULL,
    "apolloId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters" JSONB NOT NULL,
    "prospectCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apollo_smart_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."apollo_sequences" (
    "id" TEXT NOT NULL,
    "apolloId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "steps" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "replyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clickRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apollo_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prospect_apollo_sync" (
    "id" TEXT NOT NULL,
    "apolloContactId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "company" TEXT,
    "title" TEXT,
    "linkedinUrl" TEXT,
    "status" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prospect_apollo_sync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."apollo_webhook_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apollo_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Industry" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Industry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MarketSegment" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "industryId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Entity" (
    "id" UUID NOT NULL,
    "type" "public"."EntityType" NOT NULL DEFAULT 'COMPANY',
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "ticker" TEXT,
    "foundedAt" TIMESTAMP(3),
    "hqCountry" TEXT,
    "hqRegion" TEXT,
    "employees" INTEGER,
    "revenue" TEXT,
    "description" TEXT,
    "isUserCompany" BOOLEAN NOT NULL DEFAULT false,
    "externalIds" JSONB,
    "industryId" UUID,
    "marketSegmentId" UUID,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Signal" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "category" "public"."SignalCategory" NOT NULL,
    "type" "public"."SignalType" NOT NULL,
    "magnitude" DOUBLE PRECISION NOT NULL,
    "sentimentScore" DOUBLE PRECISION,
    "sentimentLabel" "public"."SentimentLabel",
    "summary" TEXT,
    "details" JSONB,
    "decayHalfLifeDays" INTEGER,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SignalImpact" (
    "signalId" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "role" "public"."ImpactRole" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SignalImpact_pkey" PRIMARY KEY ("signalId","entityId","role")
);

-- CreateTable
CREATE TABLE "public"."Connection" (
    "id" UUID NOT NULL,
    "sourceEntityId" UUID NOT NULL,
    "targetEntityId" UUID NOT NULL,
    "type" "public"."ConnectionType" NOT NULL,
    "strength" DOUBLE PRECISION,
    "sentimentScore" DOUBLE PRECISION,
    "since" TIMESTAMP(3) NOT NULL,
    "until" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConnectionEvent" (
    "id" UUID NOT NULL,
    "connectionId" UUID NOT NULL,
    "signalId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MetricDefinition" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "public"."MetricKind" NOT NULL,
    "unit" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MetricPoint" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "metricDefinitionId" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "window" "public"."TimeWindow" NOT NULL DEFAULT 'DAY',
    "value" DOUBLE PRECISION NOT NULL,
    "source" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IndexDefinition" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "formula" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IndexValue" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "indexDefinitionId" UUID NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "normalized" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndexValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContextDimension" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContextDimension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContextValue" (
    "id" UUID NOT NULL,
    "contextDimensionId" UUID NOT NULL,
    "industryId" UUID,
    "marketSegmentId" UUID,
    "region" TEXT,
    "asOf" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "source" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContextValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DataSource" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."DataSourceType" NOT NULL,
    "credRef" TEXT,
    "trustScore" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IngestionRun" (
    "id" UUID NOT NULL,
    "dataSourceId" UUID NOT NULL,
    "status" "public"."RunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "itemsIn" INTEGER,
    "itemsOut" INTEGER,
    "error" TEXT,
    "metadata" JSONB,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_paymentProcessorUserId_key" ON "public"."User"("paymentProcessorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "public"."accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "public"."sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "public"."verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "public"."verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStats_date_key" ON "public"."DailyStats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "entity_members_entityId_userId_key" ON "public"."entity_members"("entityId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "entity_access_requests_entityId_requesterId_key" ON "public"."entity_access_requests"("entityId", "requesterId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_metrics_date_key" ON "public"."daily_metrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "apollo_smart_lists_apolloId_key" ON "public"."apollo_smart_lists"("apolloId");

-- CreateIndex
CREATE UNIQUE INDEX "apollo_sequences_apolloId_key" ON "public"."apollo_sequences"("apolloId");

-- CreateIndex
CREATE UNIQUE INDEX "prospect_apollo_sync_apolloContactId_key" ON "public"."prospect_apollo_sync"("apolloContactId");

-- CreateIndex
CREATE UNIQUE INDEX "Industry_code_key" ON "public"."Industry"("code");

-- CreateIndex
CREATE INDEX "Industry_name_idx" ON "public"."Industry"("name");

-- CreateIndex
CREATE INDEX "MarketSegment_industryId_idx" ON "public"."MarketSegment"("industryId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketSegment_name_industryId_key" ON "public"."MarketSegment"("name", "industryId");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_domain_key" ON "public"."Entity"("domain");

-- CreateIndex
CREATE INDEX "Entity_type_idx" ON "public"."Entity"("type");

-- CreateIndex
CREATE INDEX "Entity_name_idx" ON "public"."Entity"("name");

-- CreateIndex
CREATE INDEX "Entity_domain_idx" ON "public"."Entity"("domain");

-- CreateIndex
CREATE INDEX "Entity_industryId_idx" ON "public"."Entity"("industryId");

-- CreateIndex
CREATE INDEX "Entity_marketSegmentId_idx" ON "public"."Entity"("marketSegmentId");

-- CreateIndex
CREATE INDEX "Entity_isUserCompany_idx" ON "public"."Entity"("isUserCompany");

-- CreateIndex
CREATE INDEX "Signal_timestamp_idx" ON "public"."Signal"("timestamp");

-- CreateIndex
CREATE INDEX "Signal_category_type_idx" ON "public"."Signal"("category", "type");

-- CreateIndex
CREATE INDEX "Signal_magnitude_idx" ON "public"."Signal"("magnitude");

-- CreateIndex
CREATE INDEX "SignalImpact_entityId_idx" ON "public"."SignalImpact"("entityId");

-- CreateIndex
CREATE INDEX "SignalImpact_role_idx" ON "public"."SignalImpact"("role");

-- CreateIndex
CREATE INDEX "Connection_sourceEntityId_idx" ON "public"."Connection"("sourceEntityId");

-- CreateIndex
CREATE INDEX "Connection_targetEntityId_idx" ON "public"."Connection"("targetEntityId");

-- CreateIndex
CREATE INDEX "Connection_type_idx" ON "public"."Connection"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_sourceEntityId_targetEntityId_type_since_key" ON "public"."Connection"("sourceEntityId", "targetEntityId", "type", "since");

-- CreateIndex
CREATE INDEX "ConnectionEvent_signalId_idx" ON "public"."ConnectionEvent"("signalId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectionEvent_connectionId_signalId_key" ON "public"."ConnectionEvent"("connectionId", "signalId");

-- CreateIndex
CREATE UNIQUE INDEX "MetricDefinition_key_key" ON "public"."MetricDefinition"("key");

-- CreateIndex
CREATE INDEX "MetricPoint_entityId_timestamp_idx" ON "public"."MetricPoint"("entityId", "timestamp");

-- CreateIndex
CREATE INDEX "MetricPoint_metricDefinitionId_timestamp_idx" ON "public"."MetricPoint"("metricDefinitionId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricPoint_entityId_metricDefinitionId_timestamp_window_key" ON "public"."MetricPoint"("entityId", "metricDefinitionId", "timestamp", "window");

-- CreateIndex
CREATE UNIQUE INDEX "IndexDefinition_key_key" ON "public"."IndexDefinition"("key");

-- CreateIndex
CREATE INDEX "IndexValue_entityId_asOf_idx" ON "public"."IndexValue"("entityId", "asOf");

-- CreateIndex
CREATE INDEX "IndexValue_indexDefinitionId_asOf_idx" ON "public"."IndexValue"("indexDefinitionId", "asOf");

-- CreateIndex
CREATE UNIQUE INDEX "IndexValue_entityId_indexDefinitionId_asOf_key" ON "public"."IndexValue"("entityId", "indexDefinitionId", "asOf");

-- CreateIndex
CREATE UNIQUE INDEX "ContextDimension_key_key" ON "public"."ContextDimension"("key");

-- CreateIndex
CREATE INDEX "ContextValue_contextDimensionId_asOf_idx" ON "public"."ContextValue"("contextDimensionId", "asOf");

-- CreateIndex
CREATE INDEX "ContextValue_industryId_asOf_idx" ON "public"."ContextValue"("industryId", "asOf");

-- CreateIndex
CREATE INDEX "ContextValue_marketSegmentId_asOf_idx" ON "public"."ContextValue"("marketSegmentId", "asOf");

-- CreateIndex
CREATE INDEX "ContextValue_region_asOf_idx" ON "public"."ContextValue"("region", "asOf");

-- CreateIndex
CREATE INDEX "IngestionRun_dataSourceId_startedAt_idx" ON "public"."IngestionRun"("dataSourceId", "startedAt");

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GptResponse" ADD CONSTRAINT "GptResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PageViewSource" ADD CONSTRAINT "PageViewSource_dailyStatsId_fkey" FOREIGN KEY ("dailyStatsId") REFERENCES "public"."DailyStats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContactFormMessage" ADD CONSTRAINT "ContactFormMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entity_members" ADD CONSTRAINT "entity_members_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entity_members" ADD CONSTRAINT "entity_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entity_access_requests" ADD CONSTRAINT "entity_access_requests_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entity_access_requests" ADD CONSTRAINT "entity_access_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketSegment" ADD CONSTRAINT "MarketSegment_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "public"."Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Entity" ADD CONSTRAINT "Entity_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "public"."Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Entity" ADD CONSTRAINT "Entity_marketSegmentId_fkey" FOREIGN KEY ("marketSegmentId") REFERENCES "public"."MarketSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Entity" ADD CONSTRAINT "Entity_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SignalImpact" ADD CONSTRAINT "SignalImpact_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "public"."Signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SignalImpact" ADD CONSTRAINT "SignalImpact_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Connection" ADD CONSTRAINT "Connection_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId") REFERENCES "public"."Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Connection" ADD CONSTRAINT "Connection_targetEntityId_fkey" FOREIGN KEY ("targetEntityId") REFERENCES "public"."Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConnectionEvent" ADD CONSTRAINT "ConnectionEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConnectionEvent" ADD CONSTRAINT "ConnectionEvent_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "public"."Signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MetricPoint" ADD CONSTRAINT "MetricPoint_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MetricPoint" ADD CONSTRAINT "MetricPoint_metricDefinitionId_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "public"."MetricDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IndexValue" ADD CONSTRAINT "IndexValue_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IndexValue" ADD CONSTRAINT "IndexValue_indexDefinitionId_fkey" FOREIGN KEY ("indexDefinitionId") REFERENCES "public"."IndexDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContextValue" ADD CONSTRAINT "ContextValue_contextDimensionId_fkey" FOREIGN KEY ("contextDimensionId") REFERENCES "public"."ContextDimension"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContextValue" ADD CONSTRAINT "ContextValue_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "public"."Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContextValue" ADD CONSTRAINT "ContextValue_marketSegmentId_fkey" FOREIGN KEY ("marketSegmentId") REFERENCES "public"."MarketSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IngestionRun" ADD CONSTRAINT "IngestionRun_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "public"."DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
