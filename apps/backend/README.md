# Backend

REST API server for the Uptime Monitor application, built with **Bun**, **Elysia**, and **Supabase**.

## Tech Stack

| Tool                                                | Purpose                    |
| --------------------------------------------------- | -------------------------- |
| [Bun](https://bun.sh)                               | Runtime & package manager  |
| [Elysia](https://elysiajs.com)                      | HTTP framework             |
| [Supabase](https://supabase.com)                    | Postgres database & client |
| [Drizzle ORM](https://orm.drizzle.team)             | Type-safe query builder    |
| [@elysiajs/jwt](https://elysiajs.com/plugins/jwt)   | JWT authentication         |
| [@elysiajs/cors](https://elysiajs.com/plugins/cors) | CORS middleware            |
| [@elysiajs/cron](https://elysiajs.com/plugins/cron) | Scheduled monitor checks   |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- A Supabase project with the migrations applied (see `src/db/supabase/migrations/`)

### Environment Variables

Create a `.env` file in this directory:

```env
DATABASE_URL=postgresql://...        # Supabase Postgres connection string
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
COLLEGE_API_BASE_URL=https://abc.tcioe.edu.np   # Optional, for public announcements
```

### Install & Run

```bash
bun install
bun run dev       # development (watch mode)
bun run start     # production
bun run build     # compile to ./dist
```

Server listens on **http://localhost:8000**. All routes are prefixed with `/api`.

## Project Structure

```
src/
├── index.ts              # App entry point — registers all plugins & starts server
├── db/
│   ├── index.ts          # Exports unified db client
│   ├── client.ts         # Postgres client (via Drizzle + postgres.js)
│   └── supabase/
│       └── migrations/   # SQL migration files (001–008)
├── modules/
│   ├── auth.ts           # Authentication routes
│   ├── websites.ts       # Website management routes
│   ├── analytics.ts      # Analytics & status routes
│   └── public.ts         # Public-facing routes (no auth required)
└── services/
    └── montior.ts        # Background cron service — pings all monitored sites
```

## API Routes

All routes are under the `/api` prefix.

### Auth — `/api/auth`

| Method | Path             | Description             |
| ------ | ---------------- | ----------------------- |
| `POST` | `/auth/register` | Register a new user     |
| `POST` | `/auth/login`    | Login and receive a JWT |

> Authenticated routes expect `Authorization: Bearer <token>` header.

### Websites — `/api/websites`

| Method   | Path             | Description                                         |
| -------- | ---------------- | --------------------------------------------------- |
| `GET`    | `/websites`      | List all monitored sites for the authenticated user |
| `POST`   | `/websites`      | Add a new site to monitor                           |
| `PATCH`  | `/websites/:url` | Update site settings (name, visibility)             |
| `DELETE` | `/websites/:url` | Remove a site                                       |

### Analytics — `/api`

| Method | Path              | Description                     |
| ------ | ----------------- | ------------------------------- |
| `GET`  | `/status/:url`    | Latest check result for a URL   |
| `GET`  | `/analytics/:url` | Last 50 check records for a URL |

### Public — `/api/public`

| Method | Path             | Description                                 |
| ------ | ---------------- | ------------------------------------------- |
| `GET`  | `/public/status` | Aggregated uptime data for all public sites |

## Monitor Service

The background monitor service (`src/services/montior.ts`) runs on a **cron schedule** and:

1. Fetches all tracked websites from the `ownership` table.
2. Sends an HTTP HEAD/GET request to each URL and measures response time (ping).
3. Checks SSL certificate expiry for `https://` sites.
4. Inserts a new row into the `analytics` table with the status code, ping, and SSL days remaining.

## Database Migrations

SQL migrations are located in `src/db/supabase/migrations/` and should be applied in order via the Supabase dashboard or CLI:

| File                                   | Description                 |
| -------------------------------------- | --------------------------- |
| `001_create_users.sql`                 | Users table                 |
| `002_create_ownership.sql`             | Site ownership & metadata   |
| `003_create_analytics.sql`             | Per-check analytics records |
| `004_create_average_hour.sql`          | Hourly averages             |
| `005_create_average_day.sql`           | Daily averages              |
| `006_create_refresh_tokens.sql`        | Auth refresh tokens         |
| `007_create_password_reset_tokens.sql` | Password reset tokens       |
| `008_create_indexes.sql`               | Performance indexes         |
