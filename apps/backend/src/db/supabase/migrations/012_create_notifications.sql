-- Month 5: Notification channels, alert rules, alert history
CREATE TABLE IF NOT EXISTS notification_channels (
  id serial PRIMARY KEY,
  org_id integer,
  name varchar(100) NOT NULL,
  type varchar(20) NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT current_timestamp,
  CONSTRAINT chk_channel_type CHECK (type IN ('discord','email'))
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id serial PRIMARY KEY,
  monitor_url varchar(254) NOT NULL REFERENCES ownership(website_url) ON DELETE CASCADE,
  channel_id integer NOT NULL REFERENCES notification_channels(id) ON DELETE CASCADE,
  on_down boolean NOT NULL DEFAULT true,
  on_degraded boolean NOT NULL DEFAULT false,
  on_recovery boolean NOT NULL DEFAULT true,
  on_ssl_expiry boolean NOT NULL DEFAULT false,
  ssl_expiry_threshold_days integer DEFAULT 14,
  quiet_hours_start time,
  quiet_hours_end time,
  repeat_interval_minutes integer DEFAULT 30,
  escalation_level integer DEFAULT 1,
  created_at timestamp NOT NULL DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS alert_history (
  id serial PRIMARY KEY,
  alert_rule_id integer REFERENCES alert_rules(id) ON DELETE SET NULL,
  channel_id integer REFERENCES notification_channels(id) ON DELETE SET NULL,
  monitor_url varchar(254),
  event_type varchar(30) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'sent',
  message text,
  error text,
  acknowledged_at timestamp,
  acknowledged_by integer REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT current_timestamp,
  CONSTRAINT chk_alert_status CHECK (status IN ('queued','sent','failed','retrying'))
);

CREATE TABLE IF NOT EXISTS subscribers (
  id serial PRIMARY KEY,
  org_id integer,
  email varchar(254) NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  verify_token varchar(255),
  unsubscribe_token varchar(255) NOT NULL,
  subscribed_at timestamp NOT NULL DEFAULT current_timestamp,
  verified_at timestamp,
  unsubscribed_at timestamp
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_monitor ON alert_rules(monitor_url);
CREATE INDEX IF NOT EXISTS idx_alert_history_monitor ON alert_history(monitor_url);
CREATE INDEX IF NOT EXISTS idx_alert_history_created ON alert_history(created_at);
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_org_email ON subscribers(org_id, email) WHERE unsubscribed_at IS NULL;
