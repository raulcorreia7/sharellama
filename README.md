# ShareLlama

A community platform for sharing and discovering llama.cpp configurations, benchmarks, and optimizations.

## Quick Start

```bash
pnpm install
pnpm db:up
pnpm db:setup
pnpm dev
```

- UI: http://localhost:3000
- API: http://localhost:8787

## Features

- Submit and browse llama.cpp configurations
- Hardware specs (CPU, GPU, RAM, VRAM)
- Inference parameters (temperature, top-p, mirostat, etc.)
- Performance metrics (tokens/sec, latency, memory)
- Comments and voting
- Hugging Face model/quantization discovery
- Cloudflare Turnstile bot protection
- Rate limiting

## Documentation

| Document                             | Description                      |
| ------------------------------------ | -------------------------------- |
| [API Reference](docs/API.md)         | REST API endpoints and contracts |
| [Database](docs/DATABASE.md)         | Schema, tables, relationships    |
| [Types](docs/TYPES.md)               | TypeScript types and Zod schemas |
| [Architecture](docs/ARCHITECTURE.md) | System design and data flow      |
| [Development](docs/DEVELOPMENT.md)   | Local dev setup and workflows    |
| [Deployment](docs/DEPLOYMENT.md)     | Production deployment guide      |
| [Runbook](docs/RUNBOOK.md)           | Operations and troubleshooting   |

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- Docker (for local PostgreSQL)
- Cloudflare account (for deployment)

## Commands

### Development

| Command        | Description                      |
| -------------- | -------------------------------- |
| `pnpm dev`     | Start all development servers    |
| `pnpm dev:api` | Start API dev server (port 8787) |
| `pnpm dev:ui`  | Start UI dev server (port 3000)  |
| `pnpm dev:db`  | Open Drizzle Studio (DB viewer)  |

### Build & Test

| Command            | Description               |
| ------------------ | ------------------------- |
| `pnpm build`       | Build all packages        |
| `pnpm test`        | Run unit tests            |
| `pnpm test:api`    | Run API tests only        |
| `pnpm test:e2e`    | Run E2E tests             |
| `pnpm test:e2e:ui` | Run E2E tests with UI     |
| `pnpm lint`        | Run ESLint                |
| `pnpm format`      | Format code with Prettier |
| `pnpm typecheck`   | Run TypeScript checks     |

### Database

| Command            | Description                     |
| ------------------ | ------------------------------- |
| `pnpm db:up`       | Start PostgreSQL container      |
| `pnpm db:down`     | Stop PostgreSQL container       |
| `pnpm db:setup`    | Initialize database schema      |
| `pnpm db:reset`    | Reset and reinitialize database |
| `pnpm db:push`     | Push schema changes to DB       |
| `pnpm db:generate` | Generate migration files        |

### Deployment

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `pnpm deploy`     | Deploy API + UI to production    |
| `pnpm deploy:api` | Deploy API to Cloudflare Workers |
| `pnpm deploy:ui`  | Deploy UI to Cloudflare Pages    |

## Environment Variables

Copy `.env.example` to `.env`:

| Variable                  | Required | Description                      |
| ------------------------- | -------- | -------------------------------- |
| `DATABASE_URL`            | Yes      | PostgreSQL connection string     |
| `TURNSTILE_SECRET_KEY`    | Yes      | Turnstile secret (server-side)   |
| `VITE_API_URL`            | Yes      | API base URL (client-side)       |
| `VITE_TURNSTILE_SITE_KEY` | Yes      | Turnstile site key (client-side) |
| `ENVIRONMENT`             | No       | Environment name                 |
| `BASE_URL`                | No       | Base URL for admin links         |

## Architecture

```
sharellama/
├── packages/
│   ├── api/          # Cloudflare Workers API (Hono)
│   ├── api-client/   # Shared API client
│   ├── core/         # Shared config and types
│   ├── database/     # Database schema (Drizzle ORM)
│   ├── model/        # Shared types and schemas (Zod)
│   └── ui/           # SolidJS frontend (SolidStart)
├── e2e/              # Playwright E2E tests
├── scripts/          # Build and deployment scripts
└── docs/             # Documentation
```

## Package Dependencies

```
ui → api-client → model
api → model, database, core
api-client → model
model → (none)
database → (none)
core → (none)
```

## Tech Stack

| Layer       | Technology                                |
| ----------- | ----------------------------------------- |
| Frontend    | SolidStart, SolidJS, Tailwind CSS         |
| API         | Hono, Cloudflare Workers                  |
| Database    | PostgreSQL (Neon), Drizzle ORM            |
| Validation  | Zod                                       |
| Auth        | Browser fingerprint, Cloudflare Turnstile |
| Testing     | Vitest (unit), Playwright (E2E)           |
| Package Mgr | pnpm (workspaces)                         |
| CI/CD       | GitHub Actions                            |

## Documentation

| Document                             | Description                      |
| ------------------------------------ | -------------------------------- |
| [API Reference](docs/API.md)         | REST API endpoints and contracts |
| [Database](docs/DATABASE.md)         | Schema, tables, relationships    |
| [Types](docs/TYPES.md)               | TypeScript types and Zod schemas |
| [Architecture](docs/ARCHITECTURE.md) | System design and data flow      |
| [Development](docs/DEVELOPMENT.md)   | Local dev setup and workflows    |
| [Deployment](docs/DEPLOYMENT.md)     | Production deployment guide      |
| [Runbook](docs/RUNBOOK.md)           | Operations and troubleshooting   |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT
