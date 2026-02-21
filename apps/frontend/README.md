# Frontend

Next.js frontend for the **Thapathali Campus Service Status** dashboard — a real-time uptime and service health monitor for Tribhuvan University IOE Thapathali Campus.

## Tech Stack

| Tool                                    | Purpose                          |
| --------------------------------------- | -------------------------------- |
| [Next.js 16](https://nextjs.org)        | React framework (App Router)     |
| [Tailwind CSS](https://tailwindcss.com) | Utility-first styling            |
| [Recharts](https://recharts.org)        | Ping & uptime charts             |
| [Axios](https://axios-http.com)         | HTTP client with JWT interceptor |
| [Lucide React](https://lucide.dev)      | Icon library                     |
| TypeScript                              | Type safety                      |

## Getting Started

### Prerequisites

- Node.js 18+ or Bun 1.0+
- Backend API running at `http://localhost:8000` (see `apps/backend`)

### Environment Variables

Create a `.env.local` file in this directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

If omitted, defaults to `http://localhost:8000/api`.

### Install & Run

```bash
npm install
npm run dev        # development server on http://localhost:3000
npm run build      # production build
npm run start      # serve production build
npm run lint       # run ESLint
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout with global metadata
│   ├── page.tsx                    # Redirects / → /status
│   ├── globals.css
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login page
│   │   └── register/page.tsx       # Register page
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Authenticated layout with sidebar
│   │   └── dashboard/
│   │       ├── page.tsx            # Monitor list overview
│   │       ├── add/page.tsx        # Add new monitor
│   │       ├── monitor/[url]/      # Per-site detail & analytics
│   │       └── settings/page.tsx   # Account settings
│   └── status/
│       └── page.tsx                # Public status page (no auth required)
├── components/
│   ├── brand/                      # College branding
│   ├── charts/                     # PingChart (Recharts)
│   ├── dashboard/                  # Sidebar, AddMonitorModal
│   ├── layout/                     # Public page header/footer/bars
│   └── status/                     # PublicStatusPage component
├── lib/
│   ├── api.ts                      # Axios instance with JWT interceptor
│   ├── useAuth.ts                  # Auth hook (reads token from localStorage)
│   └── utils.ts                    # Utility helpers
└── types/
    ├── index.ts
    └── status.ts
```

## Pages

| Route                      | Auth     | Description                                  |
| -------------------------- | -------- | -------------------------------------------- |
| `/status`                  | Public   | Live uptime status for all public sites      |
| `/login`                   | Public   | User login                                   |
| `/register`                | Public   | New account registration                     |
| `/dashboard`               | Required | Overview of all monitored sites              |
| `/dashboard/add`           | Required | Add a new site to monitor                    |
| `/dashboard/monitor/[url]` | Required | Detailed ping history & analytics for a site |
| `/dashboard/settings`      | Required | Account settings                             |

## Authentication

JWT tokens are stored in `localStorage` under the key `uptimeToken`. The Axios instance (`src/lib/api.ts`) automatically attaches the token as a `Bearer` header on every request. The `useAuth` hook reads the token and exposes `isAuthenticated` state throughout the dashboard.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
