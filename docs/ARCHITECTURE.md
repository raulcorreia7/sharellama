# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Cloudflare Edge                            │
│  ┌─────────────────────┐         ┌─────────────────────────────────┐│
│  │   Cloudflare Pages  │         │     Cloudflare Workers          ││
│  │   (SolidStart UI)   │─────────│     (Hono API)                  ││
│  │   sharellama.io     │         │     api.sharellama.io           ││
│  └─────────────────────┘         └─────────────────────────────────┘│
│                                            │                         │
└────────────────────────────────────────────│─────────────────────────┘
                                             │
                    ┌────────────────────────│────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
           ┌────────────────┐      ┌─────────────────┐      ┌─────────────────┐
           │   Neon (DB)    │      │  Cloudflare     │      │  Hugging Face   │
           │   PostgreSQL   │      │  Turnstile      │      │  API            │
           └────────────────┘      └─────────────────┘      └─────────────────┘
```

## Packages

Monorepo structure with pnpm workspaces.

```
sharellama/
├── packages/
│   ├── api/           # Cloudflare Workers API
│   │   ├── src/
│   │   │   ├── index.ts        # App entry, route registration
│   │   │   ├── env.ts          # Environment types
│   │   │   ├── routes/         # API route handlers
│   │   │   ├── middleware/     # Rate limiting, Turnstile
│   │   │   └── lib/            # DB connection, utilities
│   │   └── wrangler.toml       # Workers config
│   │
│   ├── core/          # Shared config & types
│   │   └── src/
│   │       ├── config/         # Environment config schemas (Zod)
│   │       └── types/          # Shared types (PaginatedResponse, Result, ApiError)
│   │
│   ├── database/      # Drizzle ORM schema
│   │   ├── src/index.ts        # Table definitions, createDb()
│   │   └── drizzle/            # Migration files
│   │
│   ├── model/         # Domain types & validation
│   │   └── src/
│   │       ├── index.ts        # Core types
│   │       └── schemas/        # Zod schemas (submission, vote, comment, model)
│   │
│   └── ui/            # SolidStart frontend
│       ├── src/
│       │   ├── routes/         # File-based routing
│       │   ├── components/     # UI components
│       │   └── lib/            # API client, utilities
│       └── app.config.ts       # SolidStart config
│
├── e2e/               # Playwright E2E tests
├── scripts/           # Build/deploy scripts
└── docs/              # Documentation
```

## Data Flow

### Submission Creation

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Browser │    │   UI     │    │   API    │    │   DB     │    │Turnstile │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │               │
     │ 1. Fill form  │               │               │               │
     │──────────────►│               │               │               │
     │               │               │               │               │
     │               │ 2. POST /submissions          │               │
     │               │   + fingerprint               │               │
     │               │   + turnstile token           │               │
     │               │──────────────►│               │               │
     │               │               │               │               │
     │               │               │ 3. Verify token              │
     │               │               │──────────────────────────────►│
     │               │               │               │               │
     │               │               │ 4. Verified   │               │
     │               │               │◄──────────────────────────────│
     │               │               │               │
     │               │               │ 5. Hash fingerprint
     │               │               │   Generate edit token
     │               │               │               │
     │               │               │ 6. INSERT submission         │
     │               │               │──────────────►│
     │               │               │               │
     │               │               │ 7. Return + admin link       │
     │               │◄──────────────│◄──────────────│
     │               │               │               │
     │ 8. Show admin link           │               │
     │◄──────────────│               │               │
```

### Voting

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Browser │    │   API    │    │   DB     │
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     │ POST /submissions/:id/vote   │
     │ + fingerprint │               │
     │──────────────►│               │
     │               │               │
     │               │ 1. Hash fingerprint
     │               │ 2. Check existing vote
     │               │──────────────►│
     │               │               │
     │               │ 3. Vote state │
     │               │◄──────────────│
     │               │               │
     │               │ 4. Update/insert vote        │
     │               │   Update submission score    │
     │               │──────────────►│
     │               │               │
     │               │ 5. New score  │
     │               │◄──────────────│
     │               │               │
     │ 6. Return score + userVote   │
     │◄──────────────│               │
```

## Key Design Decisions

### Anonymous Identity

Users are identified by SHA-256 hash of browser fingerprint:

- No accounts required
- Privacy-preserving (hash is one-way)
- Allows vote tracking without PII
- Author hash stored on submissions/comments for ownership

### Admin Token Pattern

Each submission gets a random 32-char edit token:

- Returned once at creation
- Stored in DB (not exposed in GET responses)
- Required for edit/delete operations
- Allows anonymous ownership without accounts

### Rate Limiting

In-memory rate limiting with IP hashing:

- IP hashed to prevent storage of raw IPs
- Per-action limits (submit: 5/hr, comment: 10/hr, vote: 50/hr)
- Headers expose limit status to clients

### Turnstile Integration

Cloudflare Turnstile for bot protection:

- Client gets token from Turnstile widget
- Server verifies token with Cloudflare API
- Required for submission and comment creation

### Hugging Face Proxy

API proxies Hugging Face for:

- Model search (autocomplete)
- Trending models
- Quantization repo discovery
- GGUF file listing

Caches at edge via Cloudflare; reduces HF API load.

## Technology Stack

| Layer    | Technology           | Purpose                     |
| -------- | -------------------- | --------------------------- |
| Frontend | SolidStart           | SSR/SSG framework           |
|          | SolidJS              | Reactive UI                 |
|          | Tailwind CSS         | Styling                     |
| API      | Hono                 | Web framework               |
|          | Cloudflare Workers   | Serverless runtime          |
|          | Zod                  | Validation                  |
| Database | PostgreSQL (Neon)    | Primary data store          |
|          | Drizzle ORM          | Query builder, migrations   |
| Auth     | Browser fingerprint  | Anonymous identity          |
|          | Cloudflare Turnstile | Bot protection              |
| Testing  | Vitest               | Unit tests                  |
|          | Playwright           | E2E tests                   |
| Build    | pnpm                 | Package manager, workspaces |
|          | TypeScript           | Type safety                 |

## Deployment

### API (Cloudflare Workers)

```bash
# Set secrets
wrangler secret put DATABASE_URL
wrangler secret put TURNSTILE_SECRET_KEY

# Deploy
pnpm deploy:api
```

### UI (Cloudflare Pages)

```bash
# Build with env vars
VITE_API_URL=https://api.sharellama.io \
VITE_TURNSTILE_SITE_KEY=xxx \
pnpm --filter @sharellama/ui run build

# Deploy
pnpm deploy:ui
```

### Database (Neon)

1. Create project at console.neon.tech
2. Copy connection string to `DATABASE_URL`
3. Run migrations: `pnpm db:push`
