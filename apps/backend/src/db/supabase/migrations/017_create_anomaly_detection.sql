-- Month 11: Anomaly detection
CREATE TABLE IF NOT EXISTS anomaly_baselines (
  id serial PRIMARY KEY,
  monitor_url varchar(254) NOT NULL REFERENCES ownership(website_url) ON DELETE CASCADE,
  hour_of_day integer NOT NULL,
  day_of_week integer NOT NULL,
  avg_response_time numeric(10,2) NOT NULL,
  std_deviation numeric(10,2) NOT NULL,
  sample_count integer NOT NULL DEFAULT 0,
  updated_at timestamp NOT NULL DEFAULT current_timestamp,
  UNIQUE (monitor_url, hour_of_day, day_of_week)
);

CREATE TABLE IF NOT EXISTS anomaly_events (
  id serial PRIMARY KEY,
  monitor_url varchar(254) NOT NULL REFERENCES ownership(website_url) ON DELETE CASCADE,
  event_type varchar(30) NOT NULL,
  expected_value numeric(10,2),
  actual_value numeric(10,2),
  deviation_factor numeric(6,2),
  resolved_at timestamp,
  created_at timestamp NOT NULL DEFAULT current_timestamp,
  CONSTRAINT chk_anomaly_type CHECK (event_type IN ('latency_spike','slow_degradation','response_anomaly'))
);

CREATE INDEX IF NOT EXISTS idx_anomaly_baselines_monitor ON anomaly_baselines(monitor_url);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_monitor ON anomaly_events(monitor_url);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_created ON anomaly_events(created_at);

-- Additional performance indexes for Month 10
CREATE INDEX IF NOT EXISTS idx_analytics_checked_at ON analytics(checked_at);
CREATE INDEX IF NOT EXISTS idx_analytics_url_checked ON analytics(website_url, checked_at);
CREATE INDEX IF NOT EXISTS idx_average_hour_url_hour ON average_hour(website_url, hour_id);
CREATE INDEX IF NOT EXISTS idx_average_day_url_day ON average_day(website_url, day_id);
