# ShareLlama

A community platform for sharing and discovering llama.cpp configurations, benchmarks, and optimizations.

## Quick Start

```bash
pnpm install
pnpm db:up
pnpm db:setup
pnpm dev
```

## Features

- Submit and browse llama.cpp configurations
- Hardware detection for optimal settings
- Comment and vote on submissions
- Cloudflare Turnstile bot protection
- Rate limiting on submissions

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- Docker (for local PostgreSQL)
- Cloudflare account (for deployment)

## Local Development

1. Clone the repository:

   ```bash
   git clone https://github.com/your-org/sharellama.git
   cd sharellama
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start PostgreSQL with Docker:

   ```bash
   pnpm db:up
   ```

4. Setup database schema:

   ```bash
   pnpm db:setup
   ```

5. Start development servers:
   ```bash
   pnpm dev
   ```

## Deployment

### 1. Create Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project
3. Copy the connection string

### 2. Get Turnstile Keys

1. Go to [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Create a new site
3. Copy the Site Key and Secret Key

### 3. Deploy API to Cloudflare Workers

1. Set production secrets:

   ```bash
   cd packages/api
   wrangler secret put DATABASE_URL
   wrangler secret put TURNSTILE_SECRET_KEY
   ```

2. Deploy:
   ```bash
   pnpm deploy:api
   ```

### 4. Deploy Frontend to Cloudflare Pages

1. Build the frontend:

   ```bash
   VITE_API_URL=https://api.sharellama.io VITE_TURNSTILE_SITE_KEY=your-site-key pnpm --filter @sharellama/ui run build
   ```

2. Deploy:
   ```bash
   pnpm deploy:ui
   ```

## Commands

| Command           | Description                         |
| ----------------- | ----------------------------------- |
| `pnpm dev`        | Start all development servers       |
| `pnpm build`      | Build all packages                  |
| `pnpm test`       | Run unit tests                      |
| `pnpm test:e2e`   | Run E2E tests                       |
| `pnpm lint`       | Run ESLint                          |
| `pnpm format`     | Format code with Prettier           |
| `pnpm typecheck`  | Run TypeScript checks               |
| `pnpm db:up`      | Start PostgreSQL container          |
| `pnpm db:down`    | Stop PostgreSQL container           |
| `pnpm db:setup`   | Initialize database schema          |
| `pnpm db:reset`   | Reset and reinitialize database     |
| `pnpm deploy:api` | Deploy API to Cloudflare Workers    |
| `pnpm deploy:ui`  | Deploy frontend to Cloudflare Pages |
| `pnpm deploy`     | Deploy both API and frontend        |

## Environment Variables

| Variable                  | Required | Description                                   |
| ------------------------- | -------- | --------------------------------------------- |
| `DATABASE_URL`            | Yes      | PostgreSQL connection string                  |
| `TURNSTILE_SECRET_KEY`    | Yes      | Cloudflare Turnstile secret key (server-side) |
| `VITE_API_URL`            | Yes      | API base URL (client-side)                    |
| `VITE_TURNSTILE_SITE_KEY` | Yes      | Turnstile site key (client-side)              |

## Architecture

```
sharellama/
├── packages/
│   ├── api/          # Cloudflare Workers API (Hono)
│   ├── database/     # Database schema (Drizzle ORM)
│   ├── model/        # Shared types and schemas (Zod)
│   └── ui/           # SolidJS frontend (SolidStart)
├── e2e/              # Playwright E2E tests
├── scripts/          # Build and deployment scripts
└── docs/             # Documentation
```

## License

MIT
