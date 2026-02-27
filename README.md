# LocalLlama

A community platform for sharing and discovering local LLMs, tools, and resources.

## Quick Start

```bash
pnpm install
pnpm dev
```

## Features

- Submit and browse local LLM resources
- Comment and vote on submissions
- Cloudflare Turnstile bot protection
- Rate limiting on submissions

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- Cloudflare account (for deployment)
- Neon account (for database)

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/localllama.git
   cd localllama
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a local PostgreSQL database:
   ```bash
   createdb locallama
   ```

4. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

5. Update `.env` with your local database URL and Turnstile test keys.

6. Run database migrations:
   ```bash
   pnpm --filter @locallama/db run generate
   pnpm --filter @locallama/db run migrate
   ```

7. Start development servers:
   ```bash
   pnpm dev
   ```

## Deployment

### 1. Create Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project
3. Copy the connection string

### 2. Run Migrations

```bash
DATABASE_URL="your-neon-connection-string" pnpm --filter @locallama/db run migrate
```

### 3. Get Turnstile Keys

1. Go to [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Create a new site
3. Copy the Site Key and Secret Key

### 4. Deploy API to Cloudflare Workers

1. Set production secrets:
   ```bash
   cd packages/api
   wrangler secret put DATABASE_URL --env production
   wrangler secret put TURNSTILE_SECRET_KEY --env production
   ```

2. Deploy:
   ```bash
   pnpm deploy:api
   ```

### 5. Deploy Frontend to Cloudflare Pages

1. Build the frontend:
   ```bash
   cd packages/web
   VITE_API_URL=https://api.localllama.io VITE_TURNSTILE_SITE_KEY=your-site-key pnpm build
   ```

2. Deploy:
   ```bash
   pnpm deploy:web
   ```

3. Set environment variables in Cloudflare Pages dashboard:
   - `VITE_API_URL`: Your API URL
   - `VITE_TURNSTILE_SITE_KEY`: Your Turnstile site key

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all development servers |
| `pnpm build` | Build all packages |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run E2E tests |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm deploy:api` | Deploy API to Cloudflare Workers |
| `pnpm deploy:web` | Deploy frontend to Cloudflare Pages |
| `pnpm deploy` | Deploy both API and frontend |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `TURNSTILE_SECRET_KEY` | Yes | Cloudflare Turnstile secret key (server-side) |
| `VITE_API_URL` | Yes | API base URL (client-side) |
| `VITE_TURNSTILE_SITE_KEY` | Yes | Turnstile site key (client-side) |

## Architecture

```
locallama/
├── packages/
│   ├── api/          # Cloudflare Workers API (Hono)
│   ├── db/           # Database schema (Drizzle ORM)
│   ├── shared/       # Shared types and schemas
│   └── web/          # SolidJS frontend
├── e2e/              # Playwright E2E tests
└── docs/             # Documentation
```

## License

MIT
