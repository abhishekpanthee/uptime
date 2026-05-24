-- Month 2-3: Add monitor configuration columns to ownership
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS id serial UNIQUE;
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS site_name varchar(100);
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS monitor_type varchar(20) NOT NULL DEFAULT 'http';
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS check_interval integer NOT NULL DEFAULT 60;
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 3;
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS retry_interval integer NOT NULL DEFAULT 10;
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS timeout_ms integer NOT NULL DEFAULT 10000;
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS expected_status integer DEFAULT 200;
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS keyword_match text;
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS keyword_absent boolean DEFAULT false;
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS http_method varchar(10) DEFAULT 'HEAD';
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS custom_headers jsonb;
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS follow_redirects boolean DEFAULT true;
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS port integer;
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS dns_record_type varchar(10);
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS expected_value text;
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS monitor_status varchar(20) NOT NULL DEFAULT 'active';
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS last_check_status varchar(20) DEFAULT 'unknown';
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0;
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS ssl_days integer;
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS degraded_threshold_ms integer DEFAULT 2000;
ALTER TABLE ownership ADD COLUMN IF NOT EXISTS org_id integer;

-- Add status column to analytics if missing
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS status integer DEFAULT 0;
