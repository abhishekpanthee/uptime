# Backend API

Bun.js backend server with Elysia framework.

## Development

```bash
bun install
bun run dev
```

Server runs on http://localhost:8000

## Seed Dummy Status Data (Supabase)

This seeds `ownership` + `analytics` directly in Supabase for demo/presentation.

1. Ensure backend `.env` has:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
2. Copy and edit config:

```bash
cp scripts/seed-status.config.example.json scripts/seed-status.config.json
```

3. Edit `scripts/seed-status.config.json` with your decided site URLs and parameters.
4. Run seeding:

```bash
bun run seed:status --reset
```

Optional (run example config directly):

```bash
bun run seed:status:example
```

### Config fields

- `ownerEmail`: owner user email for seeded sites.
- `ownerName`: created only if user does not exist.
- `ownerPassword`: created only if user does not exist.
- `days`: how many days of historical data to generate (default `30`).
- `checkIntervalMinutes`: spacing between generated checks (default `60`).
- `resetExisting`: delete existing analytics for those URLs before insert.
- `sites[]`:
  - `url` (required, full `http/https` URL)
  - `site_name`
  - `is_public`
  - `base_ping`
  - `uptime` (percentage, e.g. `99.5`)
  - `ssl_days`

## API Endpoints

- `GET /` - Welcome message
- `GET /api/health` - Health check
- `GET /api/hello/:name` - Greet by name
- `POST /api/data` - Echo posted data

## Tech Stack

- **Runtime**: Bun
- **Framework**: Elysia (fast & type-safe)
- **Language**: TypeScript
