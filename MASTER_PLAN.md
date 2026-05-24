# Uptime Monitor - 12-Month Enterprise Master Plan

> **Document Version:** 1.0  
> **Date:** 2026-05-24  
> **Status:** DRAFT - Pending Review  

---

## Current State Assessment

### What Exists Today

| Layer | Stack | Status |
|-------|-------|--------|
| Backend | Bun + Elysia + PostgreSQL (Supabase) | Functional |
| Frontend | Next.js 16 + React 19 + Tailwind + Recharts | Functional |
| Auth | JWT (single token, no refresh) | Basic |
| Monitoring | HTTP HEAD, 60s interval, single server | Basic |
| Alerts | Discord webhook only | Minimal |
| SSL | Certificate expiry tracking | Functional |
| Status Page | Public page with 30-day history | Basic |
| Data | 30-day raw retention, aggregation tables unused | Partial |
| Deployment | Manual (Bun workspaces) | None |

### Known Technical Debt

1. Duplicate `GET /api/auth/me` endpoint in auth module
2. Refresh token table exists but is unused (single JWT per session)
3. Password reset token table exists but has no routes
4. `average_hour` and `average_day` aggregation tables are never populated
5. No input sanitization or rate limiting on API endpoints
6. No test coverage whatsoever
7. Monitor service file is misspelled (`montior.ts`)
8. No health check endpoint for the backend itself
9. No graceful shutdown handling
10. CORS is wide open (no origin restrictions)

---

## Architecture Target (Month 12)

Single-server deployment. All services hosted on one on-premise server.

```
             +-------------------------------+
             |        Single Server          |
             |                               |
             |  +----------+  +-----------+  |
             |  | Frontend |  | Backend   |  |
             |  | (Next.js)|  | (Elysia)  |  |
             |  +----+-----+  +-----+-----+  |
             |       |              |         |
             |       |        +-----+-----+   |
             |       |        |  Workers  |   |
             |       |        |  (Queue)  |   |
             |       |        +-----------+   |
             |       |              |         |
             |  +----+----+   +-----+-----+   |
             |  | Redis   |   | PostgreSQL|   |
             |  | (Cache) |   | (Primary) |   |
             |  +---------+   +-----------+   |
             +-------------------------------+
```

> **Deployment note:** The uptime monitor itself is hosted on a separate server
> from the services it monitors. All monitored software runs on a single
> on-site campus server.

---

## Month-by-Month Roadmap

---

### PHASE 1: Foundation Hardening (Months 1-3)

The system works but it is fragile. Before adding features, we fix the foundation.

---

#### Month 1 - Code Quality, Security, and DevOps Baseline

**1.1 - Fix Existing Technical Debt**
- [ ] Fix duplicate `/api/auth/me` endpoint
- [ ] Rename `montior.ts` to `monitor.ts`
- [ ] Implement refresh token rotation (table already exists)
- [ ] Implement password reset flow (table already exists)
- [ ] Populate `average_hour` and `average_day` tables via scheduled aggregation job
- [ ] Add proper `.env.example` file (remove secrets from committed `.env`)

**1.2 - Security Hardening**
- [ ] Add rate limiting middleware (per-IP and per-user)
  - Auth endpoints: 5 req/min
  - API endpoints: 60 req/min
  - Public endpoints: 120 req/min
- [ ] Restrict CORS to specific origins (configurable via env)
- [ ] Add request body size limits
- [ ] Input validation with `zod` schemas on every endpoint
- [ ] Add CSRF protection for state-changing operations
- [ ] Sanitize all user inputs before database queries
- [ ] Add security headers (Helmet equivalent for Elysia)
- [ ] Move JWT secret to proper secret management (not committed to repo)

**1.3 - Testing Infrastructure**
- [ ] Set up Vitest for backend unit tests
- [ ] Set up Playwright for frontend E2E tests
- [ ] Write tests for all existing auth flows
- [ ] Write tests for monitor check logic
- [ ] Write tests for public status API calculations
- [ ] Target: 70% backend coverage by end of month

**1.4 - CI/CD Pipeline**
- [ ] Dockerize backend and frontend (multi-stage builds)
- [ ] Create `docker-compose.yml` for local development (app + postgres + redis)
- [ ] Set up GitHub Actions:
  - Lint (ESLint + Biome)
  - Type check
  - Run tests
  - Build check
  - Docker image build
- [ ] Add pre-commit hooks (Husky + lint-staged)

**1.5 - Observability Baseline**
- [ ] Add structured logging (pino or winston)
- [ ] Add `GET /health` endpoint returning service status + DB connectivity
- [ ] Add `GET /metrics` endpoint (Prometheus format) for self-monitoring
- [ ] Add request ID tracking across all requests
- [ ] Graceful shutdown handling (drain connections, stop monitor loop)

**Deliverables:**
- Secure, tested codebase with CI/CD
- Docker-based local development
- No more committed secrets

---

#### Month 2 - Database, Caching, and Real-Time Layer

**2.1 - Database Migration System**
- [ ] Adopt Drizzle ORM fully (dependency exists but unused)
- [ ] Define all schemas in Drizzle schema files
- [ ] Set up migration management with `drizzle-kit`
- [ ] Write migration scripts for all new tables going forward
- [ ] Add database seeding command for development environments

**2.2 - Redis Integration**
- [ ] Add Redis for:
  - Session/token caching (reduce DB reads on every authenticated request)
  - Public status page caching (60s TTL, invalidate on new check)
  - Rate limiting state storage
  - Monitor scheduling coordination (prevent duplicate checks)
- [ ] Create Redis connection manager with reconnection logic

**2.3 - Real-Time Updates via WebSocket**
- [ ] Add WebSocket support via Elysia WS plugin
- [ ] Real-time events:
  - `monitor:status_change` - When a site goes UP/DOWN
  - `monitor:check_complete` - New check data available
  - `incident:update` - Incident status changes (for Phase 2)
- [ ] Frontend: Replace 60s polling with WebSocket subscription
- [ ] Implement heartbeat/reconnection on frontend
- [ ] Redis Pub/Sub as message broker (prepare for multi-instance)

**2.4 - Data Retention and Aggregation Pipeline**
- [ ] Implement automated aggregation jobs:
  - Every hour: Aggregate raw analytics into `average_hour`
  - Every day at midnight (NPT): Aggregate hours into `average_day`
- [ ] Implement tiered data retention:
  - Raw data: 7 days (reduced from 30)
  - Hourly averages: 90 days
  - Daily averages: 2 years
- [ ] Create materialized views for common dashboard queries
- [ ] Add database indexes for time-range queries on aggregated tables

**Deliverables:**
- ORM-managed database with proper migrations
- Redis caching layer reducing DB load by ~60%
- Real-time dashboard updates via WebSocket
- Efficient long-term data storage

---

#### Month 3 - Advanced Monitoring Engine

**3.1 - Multi-Protocol Monitoring**
- [ ] HTTP/HTTPS monitor (existing, enhanced):
  - Configurable method (GET/HEAD/POST)
  - Custom headers and request body
  - Expected status code validation
  - Response body keyword match (assert keyword present/absent)
  - Follow redirects option
  - Custom timeout per monitor
- [ ] TCP Port monitor:
  - Connect to host:port, measure connection time
  - Use case: Database ports, custom services
- [ ] DNS monitor:
  - Resolve hostname, validate expected IP/record
  - Monitor DNS propagation
- [ ] Ping (ICMP) monitor:
  - Raw ICMP ping for network-level checks
- [ ] SSL Certificate monitor (enhanced):
  - Separate dedicated check (not piggy-backed on HTTP check)
  - Alert thresholds: 30, 14, 7, 3, 1 day(s) before expiry
  - Certificate chain validation
  - Track certificate changes (issuer, fingerprint)

**3.2 - Configurable Check Intervals**
- [ ] Per-monitor interval configuration: 30s, 1m, 2m, 5m, 10m, 15m, 30m
- [ ] Priority queue: Critical monitors checked more frequently
- [ ] Smart scheduling: Spread checks evenly, avoid thundering herd
- [ ] Jitter: Add random offset to prevent synchronized checks

**3.3 - Check Retry and Confirmation Logic**
- [ ] On failure, retry up to N times (configurable, default 3)
- [ ] Confirmation delay between retries (5s, 10s, 30s)
- [ ] Only trigger alert after all retries fail
- [ ] Differentiate between:
  - HARD DOWN: Confirmed after retries
  - SOFT DOWN: Initial failure, retrying
  - DEGRADED: Responding but slow (configurable threshold)
  - UP: Normal operation

**3.4 - Monitor Groups and Dependencies**
- [ ] Create `monitor_groups` table
- [ ] Group monitors logically (e.g., "Web Servers", "APIs", "Databases")
- [ ] Group-level aggregate status (worst-of, majority)
- [ ] Parent-child dependencies: If parent is down, suppress child alerts

**Deliverables:**
- Five monitor types (HTTP, TCP, DNS, ICMP, SSL)
- Smart retry logic eliminating false positives
- Configurable intervals per monitor
- Grouped and organized monitors

---

### PHASE 2: Enterprise Features (Months 4-6)

With the foundation solid, we add the features that make this enterprise-grade.

---

#### Month 4 - Incident Management System

**4.1 - Incident Data Model**
```
incidents
  id, title, status (investigating|identified|monitoring|resolved),
  severity (critical|major|minor|maintenance),
  created_by, created_at, resolved_at, auto_generated

incident_updates
  id, incident_id, status, message, created_by, created_at

incident_monitors  (many-to-many)
  incident_id, monitor_id
```

**4.2 - Incident Lifecycle**
- [ ] Create incident (manual or auto-triggered by monitor failure)
- [ ] Post updates with status transitions
- [ ] Link incidents to affected monitors
- [ ] Auto-resolve when all linked monitors recover
- [ ] Incident timeline view with all updates
- [ ] Calculate incident duration and impact metrics
- [ ] Post-incident: Mark as post-mortem pending

**4.3 - Auto-Incident Creation**
- [ ] When a monitor enters HARD DOWN state, auto-create incident
- [ ] Configurable: Auto-create vs. manual-only per monitor
- [ ] Merge rule: If existing open incident has same monitor, add update instead of new incident
- [ ] Auto-resolve incident when monitor recovers (with configurable delay)

**4.4 - Incident UI**
- [ ] Admin: Incident list with filters (status, severity, date range)
- [ ] Admin: Create/update incident form with rich text editor
- [ ] Admin: Incident detail page with full timeline
- [ ] Public: Incident history on status page
- [ ] Public: Active incidents banner on status page

**Deliverables:**
- Full incident lifecycle management
- Automatic incident creation from monitor failures
- Public-facing incident display on status page

---

#### Month 5 - Multi-Channel Alerting and Notification System

**5.1 - Notification Channel Framework**
- [ ] Abstract notification interface:
  ```typescript
  interface NotificationChannel {
    id: string;
    type: 'discord' | 'email';
    send(event: AlertEvent): Promise<boolean>;
    verify(): Promise<boolean>;
  }
  ```
- [ ] Channel management CRUD API
- [ ] Channel verification (send test notification)

**5.2 - Supported Channels**
- [ ] Discord webhook (existing, refactored into framework)
  - Configurable webhook URL per monitor or per org
  - Rich embed formatting (color-coded by severity)
  - Separate webhooks for alerts vs. incident updates
- [ ] Email (SMTP via Nodemailer or Resend API)
  - Configurable SMTP settings (host, port, auth)
  - HTML email templates for: alert, recovery, incident update, maintenance notice
  - Multiple recipient addresses per alert rule
  - Reply-to configuration

**5.3 - Alert Rules Engine**
- [ ] Per-monitor alert configuration:
  - Which channels to notify
  - Alert on: DOWN, DEGRADED, SSL expiry warning, recovery
  - Quiet hours (suppress non-critical alerts during defined windows)
  - Repeat interval (re-alert every N minutes while still down)
- [ ] Escalation policies:
  - Level 1: Notify primary channel immediately
  - Level 2: If unacknowledged after 15min, notify secondary channel
  - Level 3: If unacknowledged after 30min, notify all channels
- [ ] Alert acknowledgment (via API or dashboard button)
- [ ] Alert deduplication: Don't spam the same alert repeatedly

**5.4 - Public Subscriber Notifications**
- [ ] Public status page: "Subscribe to updates" form
- [ ] Subscription type: Email
- [ ] Subscribers receive:
  - New incident created
  - Incident status updates
  - Scheduled maintenance announcements
  - Monitor recovery notifications
- [ ] Unsubscribe link in every notification
- [ ] Double opt-in for email subscribers
- [ ] Subscriber management in admin panel

**5.5 - Notification Queue**
- [ ] Queue-based notification delivery (Redis + BullMQ or similar)
- [ ] Retry failed notifications with exponential backoff
- [ ] Notification delivery log (sent, failed, retried)
- [ ] Rate limiting per channel to avoid API limits

**Deliverables:**
- 2 notification channels (Discord webhook + Email)
- Configurable alert rules with escalation
- Public subscriber system (email-based)
- Reliable queued delivery

---

#### Month 6 - Scheduled Maintenance and SLA Tracking

**6.1 - Scheduled Maintenance Windows**
```
maintenance_windows
  id, title, description, status (scheduled|in_progress|completed|cancelled),
  scheduled_start, scheduled_end, actual_start, actual_end,
  created_by, auto_complete, affected_monitors[]
```
- [ ] CRUD API for maintenance windows
- [ ] Admin UI: Calendar view of upcoming maintenance
- [ ] Automatic status transition (scheduled -> in_progress -> completed)
- [ ] Suppress alerts for affected monitors during window
- [ ] Public status page: Show upcoming and active maintenance
- [ ] Notify subscribers before maintenance starts (configurable lead time)
- [ ] Exclude maintenance periods from uptime calculations

**6.2 - SLA/SLO Tracking**
```
sla_definitions
  id, monitor_id, target_uptime (e.g., 99.9), period (monthly|quarterly|yearly),
  created_at

sla_reports
  id, sla_id, period_start, period_end,
  actual_uptime, target_uptime, met (boolean),
  total_downtime_seconds, incident_count
```
- [ ] Define SLA targets per monitor or monitor group
- [ ] Calculate remaining error budget:
  - Monthly 99.9% = 43.2 minutes allowed downtime
  - Track consumed vs. remaining budget
- [ ] Dashboard widget: SLA compliance meter
- [ ] Alert when error budget hits 50%, 75%, 90%, 100%
- [ ] Exclude scheduled maintenance from SLA calculations
- [ ] Historical SLA compliance reports

**6.3 - Uptime Reporting**
- [ ] Generate uptime reports for configurable date ranges
- [ ] Report includes:
  - Per-monitor uptime percentage
  - Response time percentiles (p50, p95, p99)
  - Incident summary
  - SLA compliance status
  - Graphs and charts
- [ ] Export formats: PDF, CSV
- [ ] Scheduled report delivery (weekly/monthly via email)

**Deliverables:**
- Maintenance window management with alert suppression
- SLA tracking with error budget monitoring
- Exportable uptime reports

---

### PHASE 3: Multi-Tenancy and Customization (Months 7-9)

Transform from a single-org tool to a multi-tenant platform.

---

#### Month 7 - Organizations, Teams, and RBAC

**7.1 - Organization Model**
```
organizations
  id, name, slug (unique), plan (free|pro|enterprise),
  created_at, settings (jsonb)

org_members
  org_id, user_id, role (owner|admin|editor|viewer),
  invited_by, joined_at

invitations
  id, org_id, email, role, token, expires_at,
  accepted_at, invited_by
```
- [ ] Users can belong to multiple organizations
- [ ] Organization-scoped data isolation (all queries filtered by org_id)
- [ ] Add `org_id` FK to: ownership, incidents, maintenance_windows, notification_channels
- [ ] Organization switching in UI

**7.2 - Role-Based Access Control**
| Permission | Owner | Admin | Editor | Viewer |
|------------|-------|-------|--------|--------|
| Manage org settings | Yes | Yes | No | No |
| Manage members | Yes | Yes | No | No |
| Create/delete monitors | Yes | Yes | Yes | No |
| Create/update incidents | Yes | Yes | Yes | No |
| View dashboard | Yes | Yes | Yes | Yes |
| View status page | Yes | Yes | Yes | Yes |
| Manage billing | Yes | No | No | No |

- [ ] RBAC middleware that checks role on every protected endpoint
- [ ] Invite flow: Owner/Admin sends email invite with role
- [ ] Invitation acceptance with account creation or linking

**7.3 - Enhanced Authentication**
- [ ] Two-factor authentication (TOTP via authenticator app)
- [ ] Session management (view active sessions, revoke sessions)
- [ ] Login history with IP and user agent
- [ ] Account lockout after N failed attempts
- [ ] OAuth2 social login (GitHub, Google) as optional login method

**7.4 - Audit Log**
```
audit_logs
  id, org_id, user_id, action, resource_type, resource_id,
  details (jsonb), ip_address, user_agent, created_at
```
- [ ] Log all state-changing actions:
  - Monitor created/updated/deleted
  - Incident created/updated/resolved
  - Member invited/removed/role changed
  - Settings changed
  - Alert acknowledged
- [ ] Admin UI: Searchable audit log with filters
- [ ] Retention: 1 year

**Deliverables:**
- Multi-org support with role-based access
- 2FA and enhanced security
- Complete audit trail

---

#### Month 8 - Custom Status Pages

**8.1 - Status Page Configuration**
```
status_pages
  id, org_id, slug, custom_domain,
  title, description, logo_url, favicon_url,
  theme (jsonb), layout (jsonb),
  show_uptime_chart (boolean), show_response_time (boolean),
  header_text, footer_text,
  is_published, created_at
```
- [ ] Each organization gets one or more status pages
- [ ] Configurable components:
  - Which monitors to show (select specific monitors/groups)
  - Display names (different from internal monitor names)
  - Component ordering and grouping
  - Show/hide response time charts
  - Show/hide uptime percentage
  - Historical days to show (7, 30, 90)

**8.2 - Theming and Branding**
- [ ] Custom color scheme (primary, secondary, background, text)
- [ ] Custom logo and favicon upload (store in object storage)
- [ ] Custom header and footer HTML/Markdown
- [ ] Light/dark mode toggle
- [ ] CSS override field for advanced customization
- [ ] Pre-built themes: Minimal, Corporate, Colorful

**8.3 - Custom Domain Support**
- [ ] Map custom domains to status pages (e.g., `status.yourcompany.com`)
- [ ] Automatic SSL via Let's Encrypt (or Cloudflare)
- [ ] DNS verification flow (CNAME or TXT record)
- [ ] Fallback to `{slug}.yourdomain.com` subdomain

**8.4 - Status Page Widgets**
- [ ] Embeddable status badge (SVG):
  ```
  ![Status](https://uptime.example.com/badge/{monitor-id}.svg)
  ```
- [ ] Embeddable status widget (iframe):
  ```html
  <iframe src="https://uptime.example.com/embed/{page-id}"></iframe>
  ```
- [ ] JSON API for status page data (for custom integrations)

**Deliverables:**
- Fully customizable status pages
- Custom domain support with SSL
- Embeddable badges and widgets

---

#### Month 9 - API Platform and Integrations

**9.1 - Public REST API (v1)**
- [ ] API key management (create, revoke, list)
- [ ] API key scoping (read-only, read-write, per-resource)
- [ ] Rate limiting per API key (separate from UI rate limits)
- [ ] Full API documentation (OpenAPI/Swagger spec auto-generated from Elysia)
- [ ] API versioning (`/api/v1/...`)

**API Endpoints:**
```
# Monitors
GET    /api/v1/monitors
POST   /api/v1/monitors
GET    /api/v1/monitors/:id
PUT    /api/v1/monitors/:id
DELETE /api/v1/monitors/:id
PATCH  /api/v1/monitors/:id/pause
PATCH  /api/v1/monitors/:id/resume

# Incidents
GET    /api/v1/incidents
POST   /api/v1/incidents
GET    /api/v1/incidents/:id
PATCH  /api/v1/incidents/:id
POST   /api/v1/incidents/:id/updates

# Maintenance
GET    /api/v1/maintenance
POST   /api/v1/maintenance
GET    /api/v1/maintenance/:id
PATCH  /api/v1/maintenance/:id
DELETE /api/v1/maintenance/:id

# Status Pages
GET    /api/v1/status-pages
GET    /api/v1/status-pages/:id/status

# Metrics
GET    /api/v1/monitors/:id/metrics?period=24h&granularity=5m
```

**9.2 - Webhook System**
- [ ] Outgoing webhooks with event filtering
- [ ] Webhook payload signing (HMAC-SHA256)
- [ ] Webhook delivery log with retry tracking
- [ ] Events: monitor.up, monitor.down, monitor.degraded, incident.created, incident.updated, incident.resolved, maintenance.scheduled, maintenance.started, maintenance.completed

**Deliverables:**
- Public REST API with key management
- OpenAPI documentation
- Signed webhook system

---

### PHASE 4: Performance, Intelligence, and Launch (Months 10-12)

---

#### Month 10 - Performance Optimization and Hardening

**10.1 - Single-Server Performance Tuning**
- [ ] Connection pooling for PostgreSQL (pgBouncer or built-in pool)
- [ ] Query optimization: EXPLAIN ANALYZE all dashboard queries, add missing indexes
- [ ] API response compression (gzip/brotli)
- [ ] Frontend: Code splitting, lazy loading, ISR for status pages
- [ ] Database partitioning for analytics tables (by month)
- [ ] Optimize monitor loop: Batch checks, parallel HTTP requests with concurrency limit
- [ ] Memory profiling and leak detection for long-running monitor process

**10.2 - Reliability for Single-Server Deployment**
- [ ] Process manager setup (systemd or PM2) with auto-restart
- [ ] Backend health self-check: If monitor loop stalls, auto-recover
- [ ] External canary: Simple cron-based ping from another machine to verify the uptime service itself is up
- [ ] Graceful degradation: If Redis is down, fall back to in-memory cache
- [ ] Database connection retry with exponential backoff
- [ ] Log rotation and disk space monitoring

**10.3 - Backup and Recovery**
- [ ] Automated daily PostgreSQL backups (pg_dump to local + off-site copy)
- [ ] Point-in-time recovery capability (WAL archiving)
- [ ] Backup verification: Weekly automated restore test
- [ ] Document recovery procedures in runbook

**10.4 - Security Hardening (Final Pass)**
- [ ] Dependency vulnerability scan (Snyk or Trivy in CI)
- [ ] OWASP Top 10 verification checklist
- [ ] Rate limit stress testing
- [ ] Review all SQL queries for injection vectors
- [ ] Audit file permissions and environment variable handling

**Deliverables:**
- Optimized single-server performance
- Reliable auto-recovery from failures
- Automated backup strategy
- Security-audited codebase

---

#### Month 11 - Analytics, Intelligence, and Dashboards

**11.1 - Advanced Analytics Dashboard**
- [ ] Enhanced dashboard with summary widgets
- [ ] Widget types:
  - Uptime gauge (current and historical)
  - Response time graph (line, area, bar)
  - Incident frequency heatmap
  - SLA compliance tracker
  - Top 10 slowest monitors
  - Top 10 most-failing monitors
- [ ] Date range picker with presets (1h, 24h, 7d, 30d, 90d, custom)
- [ ] Comparison view: Compare two monitors side-by-side

**11.2 - Anomaly Detection**
- [ ] Baseline learning: Calculate normal response time patterns per monitor
- [ ] Detect anomalies:
  - Response time > 2 standard deviations from baseline
  - Sudden latency spikes
  - Gradual performance degradation trends
- [ ] Anomaly alerts (separate from DOWN alerts)
- [ ] Visual indicators on charts for anomaly periods

**11.3 - Trend Analysis and Forecasting**
- [ ] Response time trend lines (moving averages)
- [ ] SSL expiry forecasting with renewal reminders
- [ ] Capacity planning: Predict when response times will breach thresholds
- [ ] Weekly digest email:
  - Uptime summary
  - Slowest monitors
  - SSL certificates expiring soon
  - SLA status
  - Anomaly summary

**11.4 - Root Cause Correlation**
- [ ] When multiple monitors go down simultaneously, detect and group
- [ ] Suggest common cause (same server, same network segment)
- [ ] Dependency graph: Visualize monitor relationships
- [ ] Impact analysis: "If X goes down, these Y monitors are also affected"

**Deliverables:**
- Rich analytics dashboard
- Anomaly detection and trend analysis
- Automated weekly digest reports (via email)
- Root cause correlation for multi-monitor failures

---

#### Month 12 - Polish, Documentation, and Launch Readiness

**12.1 - Admin Panel Polish**
- [ ] Onboarding flow for new organizations
- [ ] Guided setup wizard (add first monitor, configure alerts, customize status page)
- [ ] Keyboard shortcuts for power users
- [ ] Bulk operations (pause/resume/delete multiple monitors)
- [ ] Search and filter across all entities
- [ ] Responsive design audit and fixes
- [ ] Dark mode for admin dashboard
- [ ] Loading states, empty states, error states for every view

**12.2 - Public Status Page Polish**
- [ ] Performance: Static generation with incremental revalidation
- [ ] Accessibility audit (WCAG 2.1 AA compliance)
- [ ] SEO optimization (meta tags, structured data)
- [ ] Print-friendly stylesheet
- [ ] RSS feed for incidents and maintenance
- [ ] Atom feed for status changes

**12.3 - Documentation**
- [ ] User documentation (how to use the platform)
  - Getting started guide
  - Monitor configuration guide
  - Incident management guide
  - Status page customization guide
  - API reference
  - Alerting configuration guide (Discord + Email)
- [ ] Developer documentation
  - Architecture overview
  - Local development setup
  - API specification (OpenAPI)
  - Webhook event reference
  - Database schema reference
- [ ] Runbook for operations
  - Single-server deployment procedure
  - Backup and restore
  - Incident response for the platform itself
  - Troubleshooting guide

**12.4 - Production Readiness**
- [ ] Load testing (k6 or Artillery):
  - Target: 50 concurrent dashboard users
  - Target: 200 monitors on single server
  - Target: 30 WebSocket connections
- [ ] Final integration testing across all features
- [ ] Smoke test suite for post-deployment verification

**12.5 - Deployment**
- [ ] Docker Compose production setup (backend + frontend + postgres + redis)
- [ ] Environment-specific configs (dev, production)
- [ ] Deployment script: Pull, build, restart with zero-downtime (rolling restart)
- [ ] systemd service files for non-Docker deployments
- [ ] Nginx reverse proxy config with SSL termination

**Deliverables:**
- Production-ready, documented, tested platform
- Simple single-server deployment
- Comprehensive documentation

---

## Database Schema Evolution Summary

### New Tables by Phase

**Phase 1 (Months 1-3):**
- `monitor_groups` - Logical grouping of monitors
- `monitor_group_members` - Many-to-many monitors in groups

**Phase 2 (Months 4-6):**
- `incidents` - Incident records
- `incident_updates` - Timeline entries per incident
- `incident_monitors` - Affected monitors per incident
- `notification_channels` - Alert channel configs
- `alert_rules` - Per-monitor alert configuration
- `alert_history` - Sent alert log
- `subscribers` - Public status page subscribers
- `maintenance_windows` - Scheduled maintenance
- `maintenance_monitors` - Affected monitors per maintenance
- `sla_definitions` - SLA targets
- `sla_reports` - Computed SLA compliance

**Phase 3 (Months 7-9):**
- `organizations` - Multi-tenant orgs
- `org_members` - Org membership with roles
- `invitations` - Pending invites
- `audit_logs` - Admin action log
- `user_sessions` - Session tracking
- `two_factor_secrets` - TOTP secrets
- `status_pages` - Custom status page configs
- `status_page_components` - Components on a status page
- `api_keys` - Public API authentication
- `webhooks` - Outgoing webhook configs
- `webhook_deliveries` - Webhook delivery log

**Phase 4 (Months 10-12):**
- `anomaly_baselines` - Learned normal patterns
- `anomaly_events` - Detected anomalies

---

## Technology Additions by Phase

| Phase | Addition | Purpose |
|-------|----------|---------|
| 1 | Vitest | Backend testing |
| 1 | Playwright | E2E testing |
| 1 | Docker | Containerization |
| 1 | GitHub Actions | CI/CD |
| 1 | Pino | Structured logging |
| 1 | Zod | Input validation |
| 2 | Redis | Caching, pub/sub, rate limiting |
| 2 | Drizzle ORM | Database schema management |
| 2 | BullMQ | Job/notification queue |
| 5 | Nodemailer/Resend | Email notifications |
| 8 | Object Storage (S3/R2) | Logo/image uploads |
| 9 | Swagger/OpenAPI | API documentation |
| 12 | k6 | Load testing |

---

## Priority Matrix

Items ranked by impact vs. effort for sequencing decisions:

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Security hardening | Critical | Low | P0 |
| CI/CD pipeline | High | Medium | P0 |
| Incident management | Critical | Medium | P0 |
| Discord + Email alerts | Critical | Medium | P0 |
| WebSocket real-time | High | Low | P1 |
| Retry/confirmation logic | High | Low | P1 |
| Multi-protocol monitors | High | Medium | P1 |
| SLA tracking | High | Medium | P1 |
| Scheduled maintenance | High | Medium | P1 |
| Organizations/RBAC | High | High | P1 |
| Custom status pages | Medium | High | P2 |
| Public API | Medium | Medium | P2 |
| Performance tuning | Medium | Medium | P2 |
| Anomaly detection | Medium | High | P3 |

---

## Success Metrics

| Metric | Month 3 | Month 6 | Month 9 | Month 12 |
|--------|---------|---------|---------|----------|
| Monitors supported | 50 | 100 | 150 | 200 |
| Check interval (min) | 30s | 30s | 30s | 30s |
| Alert channels | 2 | 2 | 2 | 2 |
| Monitor types | 4 | 5 | 5 | 5 |
| Deployment | Single server | Single server | Single server | Single server |
| API uptime (self) | 99% | 99.5% | 99.9% | 99.9% |
| Test coverage | 70% | 80% | 85% | 90% |
| P95 API latency | <500ms | <200ms | <100ms | <100ms |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Supabase vendor lock-in | Medium | High | Abstract DB layer via Drizzle ORM; support self-hosted PostgreSQL |
| Single point of failure (one server) | High | High | Process manager auto-restart, external canary check, documented recovery runbook |
| Alert fatigue (too many notifications) | Medium | Medium | Smart deduplication, escalation policies, quiet hours |
| Database growth overwhelming free tier | High | Medium | Tiered retention, aggregation pipeline |
| Monitoring service itself goes down | Medium | Critical | systemd auto-restart, external canary ping, health endpoint |
| Server hosting the monitor goes down | Low | Critical | Separate from monitored services; consider offsite VM or VPS |
| Scope creep delaying delivery | High | Medium | Strict phase gating; review after each phase |

---

## Review Process

After each monthly milestone:
1. Code review of all changes
2. Demo to stakeholders
3. Update this document with actuals vs. plan
4. Adjust next month priorities based on feedback
5. Security review of new attack surface

---

> **Next Step:** Review this plan. Once approved, we begin Month 1 implementation starting with technical debt fixes and security hardening.
