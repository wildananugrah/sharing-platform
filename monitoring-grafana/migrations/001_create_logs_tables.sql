-- ============================================
-- Grafana Monitoring Database Schema
-- ============================================
-- This schema creates tables optimized for
-- storing application logs and metrics for
-- visualization in Grafana.
-- ============================================

-- Application Logs Table
-- Stores all HTTP requests and application events
CREATE TABLE IF NOT EXISTS app_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    level VARCHAR(10) NOT NULL,
    message TEXT,
    user_id VARCHAR(255),
    method VARCHAR(10),
    uri TEXT,
    status INTEGER,
    elapsed_ms INTEGER,
    request_body JSONB,
    response_body JSONB,
    error_message TEXT,
    error_stack TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);
CREATE INDEX IF NOT EXISTS idx_app_logs_user_id ON app_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_logs_status ON app_logs(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_logs_uri ON app_logs USING HASH(uri);
CREATE INDEX IF NOT EXISTS idx_app_logs_method ON app_logs(method);
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at DESC);

-- Partial index for errors only (faster error queries)
CREATE INDEX IF NOT EXISTS idx_app_logs_errors ON app_logs(timestamp DESC, status)
WHERE status >= 400;

-- Application Metrics Table
-- Stores aggregated metrics for dashboards
CREATE TABLE IF NOT EXISTS app_metrics (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    metric_unit VARCHAR(20),
    tags JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for metrics
CREATE INDEX IF NOT EXISTS idx_app_metrics_timestamp ON app_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_app_metrics_name ON app_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_app_metrics_name_timestamp ON app_metrics(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_app_metrics_tags ON app_metrics USING GIN(tags);

-- API Endpoint Performance Table
-- Aggregated stats per endpoint for performance monitoring
CREATE TABLE IF NOT EXISTS api_endpoint_stats (
    id BIGSERIAL PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    hour_bucket TIMESTAMP NOT NULL,
    request_count INTEGER DEFAULT 0,
    avg_response_time NUMERIC(10,2),
    min_response_time INTEGER,
    max_response_time INTEGER,
    p50_response_time INTEGER,
    p95_response_time INTEGER,
    p99_response_time INTEGER,
    error_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(endpoint, method, hour_bucket)
);

CREATE INDEX IF NOT EXISTS idx_api_stats_endpoint ON api_endpoint_stats(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_stats_hour_bucket ON api_endpoint_stats(hour_bucket DESC);

-- User Activity Summary Table
-- Track user activity patterns
CREATE TABLE IF NOT EXISTS user_activity_stats (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    request_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_response_time NUMERIC(10,2),
    endpoints_accessed TEXT[],
    first_activity TIMESTAMP,
    last_activity TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_date ON user_activity_stats(date DESC);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to clean up old logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM app_logs WHERE timestamp < NOW() - INTERVAL '30 days';
    DELETE FROM app_metrics WHERE timestamp < NOW() - INTERVAL '90 days';
    DELETE FROM api_endpoint_stats WHERE hour_bucket < NOW() - INTERVAL '90 days';
    DELETE FROM user_activity_stats WHERE date < CURRENT_DATE - INTERVAL '90 days';

    -- Vacuum to reclaim space
    VACUUM ANALYZE app_logs;
    VACUUM ANALYZE app_metrics;
    VACUUM ANALYZE api_endpoint_stats;
    VACUUM ANALYZE user_activity_stats;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate percentiles
CREATE OR REPLACE FUNCTION percentile_cont_custom(percentile NUMERIC, values INTEGER[])
RETURNS INTEGER AS $$
DECLARE
    sorted_values INTEGER[];
    idx INTEGER;
BEGIN
    sorted_values := ARRAY(SELECT unnest(values) ORDER BY 1);
    idx := CEIL(percentile * array_length(sorted_values, 1))::INTEGER;
    RETURN sorted_values[idx];
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Initial Data / Test Data (Optional)
-- ============================================

-- Insert a test log entry
INSERT INTO app_logs (timestamp, level, message, method, uri, status, elapsed_ms)
VALUES (NOW(), 'info', 'Monitoring database initialized', 'GET', '/health', 200, 5)
ON CONFLICT DO NOTHING;

-- Insert a test metric
INSERT INTO app_metrics (timestamp, metric_name, metric_value, metric_unit)
VALUES (NOW(), 'db.initialized', 1, 'count')
ON CONFLICT DO NOTHING;

-- ============================================
-- Grants (if using separate user)
-- ============================================

-- Grant permissions for app to write logs
-- GRANT INSERT, SELECT ON app_logs TO your_app_user;
-- GRANT INSERT, SELECT ON app_metrics TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE app_logs_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE app_metrics_id_seq TO your_app_user;

-- Grant read-only access for Grafana
-- CREATE USER grafana_reader WITH PASSWORD 'grafana_password';
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO grafana_reader;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE app_logs IS 'Stores all application logs for monitoring and debugging';
COMMENT ON TABLE app_metrics IS 'Stores time-series metrics for dashboards';
COMMENT ON TABLE api_endpoint_stats IS 'Aggregated statistics per API endpoint per hour';
COMMENT ON TABLE user_activity_stats IS 'Daily summary of user activity';

COMMENT ON COLUMN app_logs.elapsed_ms IS 'Request processing time in milliseconds';
COMMENT ON COLUMN app_logs.timestamp IS 'When the event occurred (indexed for fast time-range queries)';
COMMENT ON COLUMN app_logs.level IS 'Log level: info, warn, error, debug';

-- ============================================
-- Success Message
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'Monitoring database schema created successfully!';
    RAISE NOTICE 'Tables: app_logs, app_metrics, api_endpoint_stats, user_activity_stats';
    RAISE NOTICE 'Indexes: Optimized for Grafana time-series queries';
    RAISE NOTICE 'Functions: cleanup_old_logs() - Run daily to maintain 30-day retention';
END $$;
