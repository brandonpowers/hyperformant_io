-- Create required materialized views for visualization

-- Latest Metric View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_latest_metric AS
WITH latest_metrics AS (
  SELECT 
    entity_id,
    metric_definition_id,
    ROW_NUMBER() OVER (PARTITION BY entity_id, metric_definition_id ORDER BY timestamp DESC) as rn,
    value,
    timestamp as computed_at,
    LAG(value) OVER (PARTITION BY entity_id, metric_definition_id ORDER BY timestamp) as prev_value
  FROM metric_point
)
SELECT 
  entity_id,
  md.key as metric_key,
  md.kind as metric_kind,
  md.unit as metric_unit,
  value,
  computed_at,
  CASE 
    WHEN prev_value IS NOT NULL AND prev_value > 0 
    THEN ((value - prev_value) / prev_value * 100)
    ELSE 0 
  END as pct_change
FROM latest_metrics lm
JOIN metric_definition md ON lm.metric_definition_id = md.id
WHERE rn = 1;

-- Latest Index View  
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_latest_index AS
WITH latest_indices AS (
  SELECT 
    entity_id,
    index_definition_id,
    ROW_NUMBER() OVER (PARTITION BY entity_id, index_definition_id ORDER BY as_of DESC) as rn,
    value,
    normalized,
    as_of as computed_at
  FROM index_value
)
SELECT 
  entity_id,
  idx.key as index_key,
  idx.name as index_name,
  value,
  normalized,
  computed_at
FROM latest_indices li
JOIN index_definition idx ON li.index_definition_id = idx.id  
WHERE rn = 1;

-- Signal Rollup View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_signal_rollup AS
WITH signal_aggregates AS (
  SELECT 
    si.entity_id,
    -- Sentiment aggregates
    SUM(CASE WHEN s.sentiment_label = 'POSITIVE' THEN s.magnitude * si.weight ELSE 0 END) as positive,
    SUM(CASE WHEN s.sentiment_label = 'NEGATIVE' THEN s.magnitude * si.weight ELSE 0 END) as negative,
    SUM(CASE WHEN s.sentiment_label = 'NEUTRAL' THEN s.magnitude * si.weight ELSE 0 END) as neutral,
    -- Category aggregates  
    SUM(CASE WHEN s.category = 'MARKET' THEN s.magnitude * si.weight ELSE 0 END) as market,
    SUM(CASE WHEN s.category = 'COMPETITIVE' THEN s.magnitude * si.weight ELSE 0 END) as competitive,
    SUM(CASE WHEN s.category = 'DEAL' THEN s.magnitude * si.weight ELSE 0 END) as deal,
    SUM(CASE WHEN s.category = 'PRODUCT' THEN s.magnitude * si.weight ELSE 0 END) as product,
    SUM(CASE WHEN s.category = 'TALENT' THEN s.magnitude * si.weight ELSE 0 END) as talent,
    SUM(CASE WHEN s.category = 'RISK' THEN s.magnitude * si.weight ELSE 0 END) as risk,
    SUM(CASE WHEN s.category = 'ENGAGEMENT' THEN s.magnitude * si.weight ELSE 0 END) as engagement,
    -- Activity aggregates
    SUM(CASE WHEN s.type IN ('ACQUISITION', 'FUNDING_ROUND', 'PARTNERSHIP') 
             THEN s.magnitude * si.weight ELSE 0 END) as major_events,
    SUM(CASE WHEN s.type IN ('CUSTOMER_WIN', 'CUSTOMER_LOSS') 
             THEN s.magnitude * si.weight ELSE 0 END) as customer_activity,
    SUM(CASE WHEN s.type IN ('PRODUCT_LAUNCH', 'MAJOR_UPDATE') 
             THEN s.magnitude * si.weight ELSE 0 END) as product_activity,
    SUM(CASE WHEN s.type IN ('COMPETITOR_LAUNCH', 'PRICING_CHANGE', 'MARKET_ENTRY') 
             THEN s.magnitude * si.weight ELSE 0 END) as competitive_activity,
    -- Summary metrics
    COUNT(*) as signal_count,
    AVG(s.magnitude) as avg_magnitude,
    AVG(COALESCE(s.sentiment_score, 0)) as avg_sentiment_score,
    MAX(s.timestamp) as latest_signal_at,
    NOW() as computed_at
  FROM signal_impact si
  JOIN signal s ON si.signal_id = s.id
  WHERE s.timestamp >= NOW() - INTERVAL '90 days'
  GROUP BY si.entity_id
)
SELECT * FROM signal_aggregates;

-- Connection Rollup View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_connection_rollup AS
WITH connection_aggregates AS (
  SELECT 
    source_entity_id,
    target_entity_id,
    type as connection_type,
    AVG(strength) as avg_strength,
    AVG(COALESCE(sentiment_score, 0)) as avg_sentiment,
    MAX(deal_value) as deal_value,
    MAX(integration_depth) as integration_depth,
    COUNT(*) as interaction_count,
    MAX(updated_at) as last_updated,
    NOW() as computed_at
  FROM connection
  WHERE updated_at >= NOW() - INTERVAL '180 days'
  GROUP BY source_entity_id, target_entity_id, type
)
SELECT * FROM connection_aggregates;

-- Refresh all views with data
REFRESH MATERIALIZED VIEW mv_latest_metric;
REFRESH MATERIALIZED VIEW mv_latest_index;  
REFRESH MATERIALIZED VIEW mv_signal_rollup;
REFRESH MATERIALIZED VIEW mv_connection_rollup;