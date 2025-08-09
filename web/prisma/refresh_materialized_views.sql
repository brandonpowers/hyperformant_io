-- Refresh all materialized views to populate with current data
-- Run this after creating the views to populate them with data

REFRESH MATERIALIZED VIEW mv_latest_metric;
REFRESH MATERIALIZED VIEW mv_latest_index;
REFRESH MATERIALIZED VIEW mv_signal_rollup;
REFRESH MATERIALIZED VIEW mv_connection_rollup;