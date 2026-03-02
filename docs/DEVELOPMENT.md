# Development Guide

## Prerequisites

- Node.js >= 20 (LTS recommended)
- pnpm >= 10
- Docker Desktop or Docker Engine (for local PostgreSQL)
- Git (for version control)

### Optional

- Wrangler CLI (for local Workers development)
- Drizzle Studio (included, accessible via `pnpm dev:db`)

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your values (optional for local dev)
# Default values work for local development
```

### 3. Start Database

```bash
# Start PostgreSQL container
pnpm db:up

# Verify it's running
docker ps | grep sharellama
```

### 4. Initialize Database

```bash
# Create tables and schema
pnpm db:setup
```

### 5. Start Development

```bash
# Start both API and UI
pnpm dev
```

**Services:**

| Service | URL                   | Description             |
| ------- | --------------------- | ----------------------- |
| UI      | http://localhost:3000 | SolidStart frontend     |
| API     | http://localhost:8787 | Hono API (Workers)      |
| DB      | localhost:5432        | PostgreSQL container    |
| Studio  | http://localhost:3001 | Drizzle Studio (viewer) |

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
# Run all unit tests (all packages)
pnpm test

# Run API tests only
pnpm test:api

# Run specific test file
pnpm --filter @sharellama/api test path/to/test.test.ts

# Run with coverage
pnpm --filter @sharellama/api test -- --coverage

# Run in watch mode
pnpm --filter @sharellama/api test -- --watch
```

### E2E Tests

```bash
# Run all E2E tests (headless)
pnpm test:e2e

# Run specific test file
pnpm test:e2e e2e/submit.spec.ts

# Run with UI (interactive)
pnpm test:e2e:ui

# Run with trace enabled
pnpm test:e2e -- --trace on

# View trace
npx playwright show-trace trace.zip
```

**E2E Requirements:**

1. Database running: `pnpm db:up`
2. Database initialized: `pnpm db:setup`
3. Dev servers running: `pnpm dev`

### Test Database

E2E tests use a separate test database:

```bash
# Setup test database
pnpm test:db:setup

# Reset test database
pnpm test:db:reset
```

Test database runs on port `5433` (default).

## Environment Variables

### Local Development

```bash
cp .env.example .env
```

Default `.env.example` values work for local development:

| Variable                  | Default                     | Description                  |
| ------------------------- | --------------------------- | ---------------------------- |
| `DATABASE_URL`            | `postgresql://...localhost` | PostgreSQL connection string |
| `TURNSTILE_SECRET_KEY`    | Test key                    | Turnstile secret (test mode) |
| `VITE_API_URL`            | `http://localhost:8787`     | API base URL                 |
| `VITE_TURNSTILE_SITE_KEY` | Test key                    | Turnstile site key (test)    |
| `ENVIRONMENT`             | `development`               | Environment name             |
| `BASE_URL`                | `http://localhost:3000`     | Base URL for admin links     |

### Test Mode Keys

For local development, use Cloudflare Turnstile test keys:

- Site Key: `1x00000000000000000000AA`
- Secret Key: `1x0000000000000000000000000000000AA`

These always pass verification in test mode.

## Code Style

**Formatting (Prettier):**

- Double quotes
- Semicolons required
- Trailing commas (ES5)
- 2 space indentation
- 100 char line width (soft limit)

**Linting (ESLint):**

- Auto-sorted imports
- TypeScript strict mode
- No unused variables
- No explicit any

```bash
# Format all files
pnpm format

# Check formatting (CI)
pnpm format:check

# Lint (show errors)
pnpm lint

# Auto-fix issues
pnpm lint --fix
```

### Import Order

Imports are auto-sorted by ESLint:

1. SolidJS packages (`solid-js`, `@solidjs`)
2. Other scoped packages (`@\\w`)
3. Lucide icons (`lucide-solid`)
4. Internal packages (`@sharellama`)
5. Relative imports (`../`, `./`)

Run `pnpm lint --fix` to auto-sort.

## Development Workflows

### Adding a New API Route

1. Create route handler in `packages/api/src/routes/<name>.ts`
2. Add Zod validation schemas in `packages/model/src/schemas/<name>.ts`
3. Register route in `packages/api/src/index.ts`
4. Export types from `packages/model/src/index.ts`
5. Add tests in `packages/api/src/routes/<name>.test.ts`
6. Update API docs in `docs/API.md`

Example route structure:

```typescript
// packages/api/src/routes/example.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { exampleSchema } from "@sharellama/model/schemas/example";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  return c.json({ data: "example" });
});

export { app as exampleRouter };
```

### Adding a New UI Page

1. Create route file in `packages/ui/src/routes/<path>.tsx`
2. Add components in `packages/ui/src/components/`
3. Use API client from `packages/ui/src/lib/api.ts`
4. Add page title with `<Title>` component
5. Test in browser at http://localhost:3000/<path>

Example page structure:

```typescript
// packages/ui/src/routes/example.tsx
import { Title } from "@solidjs/meta";
import { Layout } from "../components/layout";

export default function ExamplePage() {
  return (
    <>
      <Title>ShareLlama - Example</Title>
      <Layout>
        <h1>Example Page</h1>
      </Layout>
    </>
  );
}
```

### Database Schema Changes

1. Edit table definitions in `packages/database/src/index.ts`
2. Generate migration: `pnpm db:generate`
3. Apply to local DB: `pnpm db:push`
4. Update Zod schemas in `packages/model/src/schemas/`
5. Update types in `docs/TYPES.md`
6. Rebuild dependent packages: `pnpm build`

**Important:** Always add fields as optional or with defaults for backward compatibility.

### Adding Dependencies

```bash
# Add to specific package
pnpm add <package> --filter @sharellama/api

# Add dev dependency
pnpm add -D <package> --filter @sharellama/api

# Add to all packages
pnpm add -w <package>
```

**Note:** If adding `zod` schemas, add zod as direct dependency (workspace re-exports don't work at runtime).

## Debugging

### API Logs

```bash
# View Workers logs in terminal
pnpm --filter @sharellama/api dev

# Remote logging (production)
wrangler tail
```

### Database

```bash
# Open Drizzle Studio (visual DB browser)
pnpm dev:db

# Direct SQL via psql
psql postgresql://postgres:postgres@localhost:5432/sharellama

# View recent submissions
psql postgresql://postgres:postgres@localhost:5432/sharellama -c "SELECT id, title, created_at FROM submissions ORDER BY created_at DESC LIMIT 10;"
```

### Browser DevTools

UI runs on http://localhost:3000 - open DevTools for:

- Console logs
- Network requests
- LocalStorage/SessionStorage
- React/SolidJS devtools (optional)

### API Testing

```bash
# Health check
curl http://localhost:8787/health

# List submissions
curl http://localhost:8787/submissions

# With fingerprint
curl -H "X-Fingerprint: test123" http://localhost:8787/submissions/1
```

### E2E Tracing

```bash
# Run with trace
pnpm test:e2e -- --trace on

# View trace viewer
npx playwright show-trace trace.zip
```

### Common Issues

**Port already in use:**

```bash
# Find process using port 3000 or 8787
lsof -i :3000
lsof -i :8787

# Kill process
kill -9 <PID>
```

**Database connection refused:**

```bash
# Check if container is running
docker ps | grep sharellama

# Restart container
pnpm db:down && pnmp db:up

# Check logs
docker logs sharellama-db
```

**Workers not starting:**

```bash
# Clear node_modules and reinstall
rm -rf node_modules packages/*/node_modules
pnpm install

# Rebuild
pnpm build
```

## Deployment

See [Deployment](./DEPLOYMENT.md) for production setup.
