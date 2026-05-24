-- Month 8: Custom status pages
CREATE TABLE IF NOT EXISTS status_pages (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  slug varchar(100) NOT NULL UNIQUE,
  custom_domain varchar(255),
  title varchar(255) NOT NULL,
  description text,
  logo_url text,
  favicon_url text,
  theme jsonb NOT NULL DEFAULT '{"primary":"#3b82f6","background":"#ffffff","text":"#1f2937","mode":"light"}',
  layout jsonb NOT NULL DEFAULT '{"showUptimeChart":true,"showResponseTime":true,"historyDays":30}',
  header_text text,
  footer_text text,
  custom_css text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT current_timestamp,
  updated_at timestamp NOT NULL DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS status_page_components (
  id serial PRIMARY KEY,
  status_page_id integer NOT NULL REFERENCES status_pages(id) ON DELETE CASCADE,
  monitor_url varchar(254) NOT NULL REFERENCES ownership(website_url) ON DELETE CASCADE,
  display_name varchar(255),
  display_order integer NOT NULL DEFAULT 0,
  group_name varchar(100),
  show_response_time boolean NOT NULL DEFAULT true,
  show_uptime boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS idx_status_pages_org ON status_pages(org_id);
CREATE INDEX IF NOT EXISTS idx_status_pages_slug ON status_pages(slug);
CREATE INDEX IF NOT EXISTS idx_status_pages_domain ON status_pages(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_status_page_components_page ON status_page_components(status_page_id);
