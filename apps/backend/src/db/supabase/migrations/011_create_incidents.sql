-- Month 4: Incident management
CREATE TABLE IF NOT EXISTS incidents (
  id serial PRIMARY KEY,
  title varchar(255) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'investigating',
  severity varchar(20) NOT NULL DEFAULT 'major',
  org_id integer,
  created_by integer REFERENCES users(id),
  auto_generated boolean NOT NULL DEFAULT false,
  resolved_at timestamp,
  created_at timestamp NOT NULL DEFAULT current_timestamp,
  updated_at timestamp NOT NULL DEFAULT current_timestamp,
  CONSTRAINT chk_incident_status CHECK (status IN ('investigating','identified','monitoring','resolved')),
  CONSTRAINT chk_incident_severity CHECK (severity IN ('critical','major','minor','maintenance'))
);

CREATE TABLE IF NOT EXISTS incident_updates (
  id serial PRIMARY KEY,
  incident_id integer NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  status varchar(30) NOT NULL,
  message text NOT NULL,
  created_by integer REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS incident_monitors (
  incident_id integer NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  monitor_url varchar(254) NOT NULL REFERENCES ownership(website_url) ON DELETE CASCADE,
  PRIMARY KEY (incident_id, monitor_url)
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_org_id ON incidents(org_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_incident_updates_incident_id ON incident_updates(incident_id);
