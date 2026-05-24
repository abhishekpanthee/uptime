-- Month 7: Organizations, teams, RBAC, audit
CREATE TABLE IF NOT EXISTS organizations (
  id serial PRIMARY KEY,
  name varchar(100) NOT NULL,
  slug varchar(100) NOT NULL UNIQUE,
  plan varchar(20) NOT NULL DEFAULT 'free',
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamp NOT NULL DEFAULT current_timestamp,
  CONSTRAINT chk_org_plan CHECK (plan IN ('free','pro','enterprise'))
);

CREATE TABLE IF NOT EXISTS org_members (
  org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role varchar(20) NOT NULL DEFAULT 'viewer',
  invited_by integer REFERENCES users(id),
  joined_at timestamp NOT NULL DEFAULT current_timestamp,
  PRIMARY KEY (org_id, user_id),
  CONSTRAINT chk_member_role CHECK (role IN ('owner','admin','editor','viewer'))
);

CREATE TABLE IF NOT EXISTS invitations (
  id serial PRIMARY KEY,
  org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email varchar(254) NOT NULL,
  role varchar(20) NOT NULL DEFAULT 'viewer',
  token varchar(255) NOT NULL UNIQUE,
  expires_at timestamp NOT NULL,
  accepted_at timestamp,
  invited_by integer REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT current_timestamp,
  CONSTRAINT chk_invite_role CHECK (role IN ('owner','admin','editor','viewer'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id serial PRIMARY KEY,
  org_id integer,
  user_id integer REFERENCES users(id) ON DELETE SET NULL,
  action varchar(50) NOT NULL,
  resource_type varchar(50) NOT NULL,
  resource_id varchar(255),
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp NOT NULL DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash varchar(255) NOT NULL,
  ip_address inet,
  user_agent text,
  last_active_at timestamp NOT NULL DEFAULT current_timestamp,
  created_at timestamp NOT NULL DEFAULT current_timestamp,
  revoked_at timestamp
);

CREATE TABLE IF NOT EXISTS two_factor_secrets (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  secret varchar(255) NOT NULL,
  backup_codes jsonb NOT NULL DEFAULT '[]',
  enabled boolean NOT NULL DEFAULT false,
  verified_at timestamp,
  created_at timestamp NOT NULL DEFAULT current_timestamp
);

-- Add org_id FK constraints
ALTER TABLE ownership ADD CONSTRAINT fk_ownership_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE incidents ADD CONSTRAINT fk_incidents_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE notification_channels ADD CONSTRAINT fk_channels_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE subscribers ADD CONSTRAINT fk_subscribers_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE maintenance_windows ADD CONSTRAINT fk_maintenance_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE monitor_groups ADD CONSTRAINT fk_groups_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
