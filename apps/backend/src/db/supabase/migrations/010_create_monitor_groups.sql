-- Month 3: Monitor groups
CREATE TABLE IF NOT EXISTS monitor_groups (
  id serial PRIMARY KEY,
  name varchar(100) NOT NULL,
  description text,
  org_id integer,
  parent_group_id integer REFERENCES monitor_groups(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS monitor_group_members (
  group_id integer NOT NULL REFERENCES monitor_groups(id) ON DELETE CASCADE,
  monitor_url varchar(254) NOT NULL REFERENCES ownership(website_url) ON DELETE CASCADE,
  PRIMARY KEY (group_id, monitor_url)
);

CREATE INDEX IF NOT EXISTS idx_monitor_groups_org_id ON monitor_groups(org_id);
