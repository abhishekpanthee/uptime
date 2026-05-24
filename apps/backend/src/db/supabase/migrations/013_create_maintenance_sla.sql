-- Month 6: Scheduled maintenance and SLA tracking
CREATE TABLE IF NOT EXISTS maintenance_windows (
  id serial PRIMARY KEY,
  org_id integer,
  title varchar(255) NOT NULL,
  description text,
  status varchar(30) NOT NULL DEFAULT 'scheduled',
  scheduled_start timestamp NOT NULL,
  scheduled_end timestamp NOT NULL,
  actual_start timestamp,
  actual_end timestamp,
  auto_complete boolean NOT NULL DEFAULT true,
  created_by integer REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT current_timestamp,
  CONSTRAINT chk_maint_status CHECK (status IN ('scheduled','in_progress','completed','cancelled'))
);

CREATE TABLE IF NOT EXISTS maintenance_monitors (
  maintenance_id integer NOT NULL REFERENCES maintenance_windows(id) ON DELETE CASCADE,
  monitor_url varchar(254) NOT NULL REFERENCES ownership(website_url) ON DELETE CASCADE,
  PRIMARY KEY (maintenance_id, monitor_url)
);

CREATE TABLE IF NOT EXISTS sla_definitions (
  id serial PRIMARY KEY,
  monitor_url varchar(254) REFERENCES ownership(website_url) ON DELETE CASCADE,
  group_id integer REFERENCES monitor_groups(id) ON DELETE CASCADE,
  target_uptime numeric(5,2) NOT NULL DEFAULT 99.9,
  period varchar(20) NOT NULL DEFAULT 'monthly',
  created_at timestamp NOT NULL DEFAULT current_timestamp,
  CONSTRAINT chk_sla_period CHECK (period IN ('monthly','quarterly','yearly'))
);

CREATE TABLE IF NOT EXISTS sla_reports (
  id serial PRIMARY KEY,
  sla_id integer NOT NULL REFERENCES sla_definitions(id) ON DELETE CASCADE,
  period_start timestamp NOT NULL,
  period_end timestamp NOT NULL,
  actual_uptime numeric(6,3) NOT NULL,
  target_uptime numeric(5,2) NOT NULL,
  met boolean NOT NULL,
  total_downtime_seconds integer NOT NULL DEFAULT 0,
  incident_count integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_windows(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule ON maintenance_windows(scheduled_start, scheduled_end);
CREATE INDEX IF NOT EXISTS idx_sla_reports_sla_id ON sla_reports(sla_id);
CREATE INDEX IF NOT EXISTS idx_sla_reports_period ON sla_reports(period_start, period_end);
