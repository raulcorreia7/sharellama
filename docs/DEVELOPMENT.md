# Development Guide

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- Docker (for local PostgreSQL)

## Setup

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
pnpm db:up

# Initialize database
pnpm db:setup

# Start development servers
pnpm dev
```

Services:

- UI: http://localhost:3000
- API: http://localhost:8787

## Common Commands

| Command          | Description                     |
| ---------------- | ------------------------------- |
| `pnpm dev`       | Start all dev servers           |
| `pnpm build`     | Build all packages              |
| `pnpm test`      | Run unit tests                  |
| `pnpm test:e2e`  | Run E2E tests                   |
| `pnpm lint`      | Run ESLint                      |
| `pnpm format`    | Format with Prettier            |
| `pnpm typecheck` | TypeScript type check           |
| `pnpm dev:db`    | Open Drizzle Studio (DB viewer) |

## Database

```bash
# Start container
pnpm db:up

# Stop container
pnpm db:down

# Push schema changes (dev)
pnpm db:push

# Generate migration
pnpm db:generate

# Reset database
pnpm db:reset

# View in browser
pnpm dev:db
```

## Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run API tests only
pnpm test:api

# Run with coverage
pnpm --filter @sharellama/api test -- --coverage
```

### E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test
pnpm test:e2e e2e/submit.spec.ts

# Run with UI
pnpm test:e2e:ui
```

E2E tests require:

- Database running (`pnpm db:up`)
- Dev servers running (`pnpm dev`)

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable                  | Required | Description                  |
| ------------------------- | -------- | ---------------------------- |
| `DATABASE_URL`            | Yes      | PostgreSQL connection string |
| `TURNSTILE_SECRET_KEY`    | Yes      | Cloudflare Turnstile secret  |
| `VITE_API_URL`            | Yes      | API base URL (client-side)   |
| `VITE_TURNSTILE_SITE_KEY` | Yes      | Turnstile site key (client)  |
| `ENVIRONMENT`             | No       | Environment name             |
| `BASE_URL`                | No       | Base URL for admin links     |

## Code Style

- Double quotes
- Semicolons
- Trailing commas
- Format on save with Prettier
- Lint with ESLint

```bash
# Format all files
pnpm format

# Check formatting
pnpm format:check

# Lint
pnpm lint
```

## Package Structure

### Adding a New API Route

1. Create route file in `packages/api/src/routes/`
2. Register in `packages/api/src/index.ts`
3. Add Zod schemas in `packages/model/src/schemas/`
4. Export types from `packages/model/src/index.ts`

### Adding a New UI Page

1. Create route file in `packages/ui/src/routes/`
2. Add components in `packages/ui/src/components/`
3. Use API client from `packages/ui/src/lib/api.ts`

### Database Schema Changes

1. Edit `packages/database/src/index.ts`
2. Run `pnpm db:generate` to create migration
3. Run `pnpm db:push` to apply (dev)
4. Update Zod schemas in `packages/model/`

## Debugging

### API Logs

```bash
# View Workers logs
pnpm --filter @sharellama/api dev
# Logs appear in terminal
```

### Database Queries

```bash
# Open Drizzle Studio
pnpm dev:db
```

### E2E Tracing

```bash
# Run with trace
pnpm test:e2e -- --trace on

# View trace
npx playwright show-trace trace.zip
```

## Deployment

See [Deployment](./DEPLOYMENT.md) for production setup.
