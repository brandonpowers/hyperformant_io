-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."DataSourceType" ADD VALUE 'APOLLO_CRM';
ALTER TYPE "public"."DataSourceType" ADD VALUE 'APOLLO_WEBHOOK';
ALTER TYPE "public"."DataSourceType" ADD VALUE 'FINANCIAL_API';
ALTER TYPE "public"."DataSourceType" ADD VALUE 'SOCIAL_API';
ALTER TYPE "public"."DataSourceType" ADD VALUE 'WEB_ANALYTICS';
ALTER TYPE "public"."DataSourceType" ADD VALUE 'PATENT_API';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."MetricKind" ADD VALUE 'SOCIAL_ENGAGEMENT';
ALTER TYPE "public"."MetricKind" ADD VALUE 'WEB_ANALYTICS';
ALTER TYPE "public"."MetricKind" ADD VALUE 'PATENT_ACTIVITY';
ALTER TYPE "public"."MetricKind" ADD VALUE 'NEWS_MENTIONS';
ALTER TYPE "public"."MetricKind" ADD VALUE 'APOLLO_METRICS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."SignalType" ADD VALUE 'TECH_STACK_CHANGE';
ALTER TYPE "public"."SignalType" ADD VALUE 'WEBSITE_UPDATE';
ALTER TYPE "public"."SignalType" ADD VALUE 'PATENT_APPLICATION';
ALTER TYPE "public"."SignalType" ADD VALUE 'SOCIAL_MENTION';
ALTER TYPE "public"."SignalType" ADD VALUE 'REDDIT_DISCUSSION';
ALTER TYPE "public"."SignalType" ADD VALUE 'EXEC_TWEET';
ALTER TYPE "public"."SignalType" ADD VALUE 'TRAFFIC_ANOMALY';
ALTER TYPE "public"."SignalType" ADD VALUE 'INNOVATION_SIGNAL';
ALTER TYPE "public"."SignalType" ADD VALUE 'EARNINGS_REPORT';
ALTER TYPE "public"."SignalType" ADD VALUE 'MARKET_SHARE_CHANGE';
ALTER TYPE "public"."SignalType" ADD VALUE 'CUSTOMER_FEEDBACK';
ALTER TYPE "public"."SignalType" ADD VALUE 'PRODUCT_REVIEW';
ALTER TYPE "public"."SignalType" ADD VALUE 'INTEGRATION_LAUNCH';
ALTER TYPE "public"."SignalType" ADD VALUE 'API_CHANGE';
ALTER TYPE "public"."SignalType" ADD VALUE 'SECURITY_UPDATE';
