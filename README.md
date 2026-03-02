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
| `pnpm dev:db`     | Open Drizzle Studio (DB viewer)     |
| `pnpm deploy:api` | Deploy API to Cloudflare Workers    |
| `pnpm deploy:ui`  | Deploy frontend to Cloudflare Pages |

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
│   ├── database/     # Database schema (Drizzle ORM)
│   ├── model/        # Shared types and schemas (Zod)
│   └── ui/           # SolidJS frontend (SolidStart)
├── e2e/              # Playwright E2E tests
├── scripts/          # Build and deployment scripts
└── docs/             # Documentation
```

## Tech Stack

| Layer      | Technology                                |
| ---------- | ----------------------------------------- |
| Frontend   | SolidStart, SolidJS, Tailwind CSS         |
| API        | Hono, Cloudflare Workers                  |
| Database   | PostgreSQL (Neon), Drizzle ORM            |
| Validation | Zod                                       |
| Auth       | Browser fingerprint, Cloudflare Turnstile |
| Testing    | Vitest, Playwright                        |

## License

MIT
