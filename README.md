#  Uptime Tracker

A high-performance, full-stack website monitoring and availability tracking system. This platform actively monitors web services, tracks SSL certificate expiration, visualizes network latency, and triggers real-time alerts for downtime.



## Key Features

* **Real-Time Monitoring:** Background workers ping registered URLs every 60 seconds to track status codes and response times.
* **Dynamic Visualizations:** Interactive latency charts with dynamic downsampling for handling thousands of data points across 1H, 24H, 7D, and 30D timeframes.
* **Automated Alerting:** Webhook integrations trigger instant Discord/Slack notifications for service outages (implementing a multi-strike verification system to prevent false positives).
* **SSL Tracking:** Automatically parses and monitors SSL/TLS certificate validity and expiration dates.
* **Automated Data Retention:** Built-in routine cleanup scripts prevent database bloat by automatically purging analytics data older than 30 days.
* **Custom Authentication:** Secure, stateless JWT-based user authentication.

## Tech Stack

**Frontend**
* [Next.js](https://nextjs.org/) (React Framework)
* [Tailwind CSS](https://tailwindcss.com/) (Styling)
* [Recharts](https://recharts.org/) (Data Visualization)
* [Lucide React](https://lucide.dev/) (Iconography)

**Backend & Database**
* [Bun](https://bun.sh/) (JavaScript Runtime)
* [ElysiaJS](https://elysiajs.com/) (High-performance web framework)
* [PostgreSQL](https://www.postgresql.org/) via [Supabase](https://supabase.com/) (Relational Database)
* Cron Jobs (Background worker processes)

## System Architecture

The system is separated into three highly decoupled layers:
1.  **The Client Layer (Next.js):** A server-side rendered dashboard that fetches aggregated statistics via REST API. It handles user sessions entirely client-side using JWTs stored in local storage.
2.  **The API Engine (Elysia/Bun):** Processes incoming requests, performs dynamic mathematical aggregations (average ping, uptime percentage), and filters large datasets to ensure the UI remains performant.
3.  **The Background Worker:** An asynchronous loop running independently of the HTTP server. It iterates through the `ownership` table, performs network requests, checks SSL statuses, updates the `analytics` ledger, and dispatches external webhooks.

## Quick Start

### Prerequisites
- [Bun](https://bun.sh/) (v1.0+)
- PostgreSQL Database (Local or Supabase)

### Environment Variables
Create a `.env` file in your backend directory with the following keys:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@your-db-host:5432/postgres"
JWT_SECRET="your-super-secret-jwt-key"
DISCORD_WEBHOOK_URL="[https://discord.com/api/webhooks/](https://discord.com/api/webhooks/)..." # Optional
```
### Installation

```bash
# Install dependencies
bun install
```

### Development

```bash
# Run both frontend and backend
bun run dev

# Run frontend only
bun run dev:frontend

# Run backend only
bun run dev:backend
```

### Build

```bash
# Build all
bun run build
```

## Project Structure

```
├── apps/
│   ├── frontend/   # Next.js frontend
│   └── backend/    # Backend API
├── docs/           # LaTeX documentation
└── packages/       # Shared packages
```

## Team

- Abhishek Panthee (THA080BCT002)
- Alin Timelsana (THA080BCT003)
- Kiran Paudel (THA080BCT019)
