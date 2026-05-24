-- Month 9: API keys, webhooks
CREATE TABLE IF NOT EXISTS api_keys (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  key_hash varchar(255) NOT NULL UNIQUE,
  key_prefix varchar(12) NOT NULL,
  scopes jsonb NOT NULL DEFAULT '["read"]',
  last_used_at timestamp,
  expires_at timestamp,
  revoked_at timestamp,
  created_at timestamp NOT NULL DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS webhooks (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret varchar(255) NOT NULL,
  events jsonb NOT NULL DEFAULT '["monitor.down","monitor.up"]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id serial PRIMARY KEY,
  webhook_id integer NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event varchar(50) NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  status varchar(20) NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_retry_at timestamp,
  created_at timestamp NOT NULL DEFAULT current_timestamp,
  CONSTRAINT chk_delivery_status CHECK (status IN ('pending','sent','failed','retrying'))
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks(org_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status) WHERE status != 'sent';
