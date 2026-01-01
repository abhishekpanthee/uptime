# Backend API

Bun.js backend server with Elysia framework.

## Development

```bash
bun install
bun run dev
```

Server will run on http://localhost:3001

## API Endpoints

- `GET /` - Welcome message
- `GET /api/health` - Health check
- `GET /api/hello/:name` - Greet by name
- `POST /api/data` - Echo posted data

## Tech Stack

- **Runtime**: Bun
- **Framework**: Elysia (fast & type-safe)
- **Language**: TypeScript
