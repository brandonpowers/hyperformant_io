-- Create materialized views for visualization data pipeline
-- This script creates the views that the visualization adapter expects

-- 1. Latest Metric View - Most recent metric value per entity
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_latest_metric AS
WITH latest_metrics AS (
  SELECT 
    "entityId" as entity_id,
    "metricDefinitionId" as metric_definition_id,
    ROW_NUMBER() OVER (PARTITION BY "entityId", "metricDefinitionId" ORDER BY "timestamp" DESC) as rn,
    "value",
    "timestamp" as computed_at,
    LAG("value") OVER (PARTITION BY "entityId", "metricDefinitionId" ORDER BY "timestamp") as prev_value
  FROM "MetricPoint"
)
SELECT 
  entity_id,
  md."key" as metric_key,
  md."kind" as metric_kind,
  md."unit" as metric_unit,
  "value",
  computed_at,
  CASE 
    WHEN prev_value IS NOT NULL AND prev_value > 0 
    THEN (("value" - prev_value) / prev_value * 100)
    ELSE 0 
  END as pct_change
FROM latest_metrics lm
JOIN "MetricDefinition" md ON lm.metric_definition_id = md."id"
WHERE rn = 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_latest_metric_entity_key 
ON mv_latest_metric (entity_id, metric_key);

-- 2. Latest Index View - Most recent index value per entity  
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_latest_index AS
WITH latest_indices AS (
  SELECT 
    "entityId" as entity_id,
    "indexDefinitionId" as index_definition_id,
    ROW_NUMBER() OVER (PARTITION BY "entityId", "indexDefinitionId" ORDER BY "asOf" DESC) as rn,
    "value",
    "normalized",
    "asOf" as computed_at
  FROM "IndexValue"
)
SELECT 
  entity_id,
  idx."key" as index_key,
  idx."name" as index_name,
  "value",
  "normalized",
  computed_at
FROM latest_indices li
JOIN "IndexDefinition" idx ON li.index_definition_id = idx."id"  
WHERE rn = 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_latest_index_entity_key
ON mv_latest_index (entity_id, index_key);

-- 3. Signal Rollup View - Aggregated signal data per entity
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_signal_rollup AS
WITH signal_aggregates AS (
  SELECT 
    si."entityId" as entity_id,
    
    -- Sentiment-based aggregates (magnitude-weighted)
    SUM(CASE WHEN s."sentimentLabel" = 'POSITIVE' THEN s."magnitude" * si."weight" ELSE 0 END) as positive,
    SUM(CASE WHEN s."sentimentLabel" = 'NEGATIVE' THEN s."magnitude" * si."weight" ELSE 0 END) as negative,
    SUM(CASE WHEN s."sentimentLabel" = 'NEUTRAL' THEN s."magnitude" * si."weight" ELSE 0 END) as neutral,
    
    -- Category-based aggregates (complete coverage)
    SUM(CASE WHEN s."category" = 'MARKET' THEN s."magnitude" * si."weight" ELSE 0 END) as market,
    SUM(CASE WHEN s."category" = 'COMPETITIVE' THEN s."magnitude" * si."weight" ELSE 0 END) as competitive,
    SUM(CASE WHEN s."category" = 'DEAL' THEN s."magnitude" * si."weight" ELSE 0 END) as deal,
    SUM(CASE WHEN s."category" = 'PRODUCT' THEN s."magnitude" * si."weight" ELSE 0 END) as product,
    SUM(CASE WHEN s."category" = 'TALENT' THEN s."magnitude" * si."weight" ELSE 0 END) as talent,
    SUM(CASE WHEN s."category" = 'RISK' THEN s."magnitude" * si."weight" ELSE 0 END) as risk,
    SUM(CASE WHEN s."category" = 'ENGAGEMENT' THEN s."magnitude" * si."weight" ELSE 0 END) as engagement,
    
    -- Activity-based aggregates (grouped by signal type)
    SUM(CASE WHEN s."type" IN ('ACQUISITION', 'FUNDING_ROUND', 'PARTNERSHIP') 
             THEN s."magnitude" * si."weight" ELSE 0 END) as major_events,
    SUM(CASE WHEN s."type" IN ('CUSTOMER_WIN', 'CUSTOMER_LOSS') 
             THEN s."magnitude" * si."weight" ELSE 0 END) as customer_activity,
    SUM(CASE WHEN s."type" IN ('PRODUCT_LAUNCH', 'MAJOR_UPDATE') 
             THEN s."magnitude" * si."weight" ELSE 0 END) as product_activity,
    SUM(CASE WHEN s."type" IN ('COMPETITOR_LAUNCH', 'PRICING_CHANGE', 'MARKET_ENTRY') 
             THEN s."magnitude" * si."weight" ELSE 0 END) as competitive_activity,
    
    -- Summary metrics
    COUNT(*) as signal_count,
    AVG(s."magnitude") as avg_magnitude,
    AVG(COALESCE(s."sentimentScore", 0)) as avg_sentiment_score,
    MAX(s."timestamp") as latest_signal_at,
    NOW() as computed_at
    
  FROM "SignalImpact" si
  JOIN "Signal" s ON si."signalId" = s."id"
  WHERE s."timestamp" >= NOW() - INTERVAL '90 days'  -- Focus on recent signals
  GROUP BY si."entityId"
)
SELECT * FROM signal_aggregates;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_signal_rollup_entity
ON mv_signal_rollup (entity_id);

-- 4. Connection Rollup View - Aggregated connection data
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_connection_rollup AS
WITH connection_aggregates AS (
  SELECT 
    "sourceEntityId" as source_entity_id,
    "targetEntityId" as target_entity_id,
    "type" as connection_type,
    AVG(COALESCE("strength", 0.5)) as avg_strength,
    AVG(COALESCE("sentimentScore", 0)) as avg_sentiment,
    -- Extract metadata fields if they exist
    MAX(("metadata"->>'deal_value')::numeric) as deal_value,
    MAX(("metadata"->>'integration_depth')::numeric) as integration_depth,
    COUNT(*) as interaction_count,
    MAX("updatedAt") as last_updated,
    NOW() as computed_at
  FROM "Connection"
  WHERE "updatedAt" >= NOW() - INTERVAL '180 days'  -- Recent connections
  GROUP BY "sourceEntityId", "targetEntityId", "type"
)
SELECT * FROM connection_aggregates;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_connection_rollup_entities_type
ON mv_connection_rollup (source_entity_id, target_entity_id, connection_type);