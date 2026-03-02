# Deployment Guide

## Prerequisites

- Cloudflare account
- Neon database account

## 1. Create Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project
3. Copy the connection string (includes password)

## 2. Configure Turnstile

1. Go to [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Create a new site
3. Copy:
   - Site Key (public, used in UI)
   - Secret Key (private, used in API)

## 3. Deploy API

### Set Secrets

```bash
cd packages/api

# Database connection
wrangler secret put DATABASE_URL
# Paste Neon connection string

# Turnstile secret
wrangler secret put TURNSTILE_SECRET_KEY
# Paste Turnstile secret key
```

### Deploy

```bash
# From project root
pnpm deploy:api
```

API will be available at `https://sharellama-api.<your-subdomain>.workers.dev`

### Custom Domain (Optional)

1. Go to Workers > your worker > Settings > Triggers
2. Add custom domain: `api.sharellama.io`

## 4. Deploy UI

### Build

```bash
VITE_API_URL=https://api.sharellama.io \
VITE_TURNSTILE_SITE_KEY=your-site-key \
pnpm --filter @sharellama/ui run build
```

### Deploy

```bash
pnpm deploy:ui
```

UI will be available at `https://sharellama.pages.dev`

### Custom Domain (Optional)

1. Go to Pages > your project > Custom domains
2. Add: `sharellama.io`

## 5. Initialize Database

After first deployment, run migrations against production:

```bash
# Set production DB URL temporarily
export DATABASE_URL="postgresql://..."

# Push schema
pnpm db:push
```

Or use Neon's SQL editor to run migration SQL.

## Environment Variables Summary

### API (Cloudflare Workers Secrets)

Set via `wrangler secret put <NAME>` or GitHub Secrets:

| Secret                 | Source                 | Required |
| ---------------------- | ---------------------- | -------- |
| `DATABASE_URL`         | Neon connection string | Yes      |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile   | Yes      |
| `ENVIRONMENT`          | Environment name       | No       |
| `BASE_URL`             | Base URL for links     | No       |

### UI (Build-time Environment Variables)

Set during build/deploy:

| Variable                  | Value                       | Required |
| ------------------------- | --------------------------- | -------- |
| `VITE_API_URL`            | `https://api.sharellama.io` | Yes      |
| `VITE_TURNSTILE_SITE_KEY` | Turnstile site key          | Yes      |

### Local Development (.env)

Copy `.env.example` to `.env`:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sharellama
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA  # Test key
VITE_API_URL=http://localhost:8787
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA  # Test key
```

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow     | Trigger           | Description                |
| ------------ | ----------------- | -------------------------- |
| `ci.yml`     | Push to main, PRs | Run tests, lint, typecheck |
| `deploy.yml` | On tag (v\*)      | Deploy to production       |
| `e2e.yml`    | Push to main, PRs | Run Playwright E2E tests   |

### Required GitHub Secrets

| Secret                  | Purpose                           | Required For      |
| ----------------------- | --------------------------------- | ----------------- |
| `CLOUDFLARE_API_TOKEN`  | Workers and Pages deployment      | Production deploy |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identification | Production deploy |
| `NEON_DATABASE_URL`     | Production database migrations    | Database setup    |
| `TURNSTILE_SECRET_KEY`  | API Turnstile verification        | API deployment    |

### Deployment Flow

1. **CI Pipeline** (on PR/push):
   - Install dependencies
   - Run typecheck
   - Run lint
   - Run unit tests
   - Run E2E tests

2. **CD Pipeline** (on tag):
   - Build all packages
   - Deploy API to Cloudflare Workers
   - Deploy UI to Cloudflare Pages
   - Run database migrations (if any)

### Manual Deployment

For hotfixes or manual deploys:

```bash
# Deploy everything
pnpm deploy

# Deploy API only
pnpm deploy:api

# Deploy UI only
pnpm deploy:ui
```

## Monitoring

### Cloudflare Dashboard

- Workers: Analytics, logs, errors
- Pages: Deployments, analytics

### Neon Dashboard

- Database metrics
- Connection pooling status

## Rollback

### API

```bash
# List deployments
wrangler deployments list

# Rollback to previous
wrangler rollback
```

### UI

1. Go to Pages > project > Deployments
2. Click "Rollback" on previous deployment

## Troubleshooting

### API returns 500

1. Check Workers logs in dashboard
2. Verify DATABASE_URL secret is set
3. Verify TURNSTILE_SECRET_KEY is set

### UI can't connect to API

1. Check VITE_API_URL is correct
2. Verify API is deployed and healthy
3. Check CORS settings (should allow your domain)

### Turnstile fails

1. Verify site key matches domain
2. Check secret key is correct
3. Ensure Turnstile widget loads in browser

### Database connection fails

1. Verify Neon project is active (not suspended)
2. Check connection string format
3. Ensure IP allowlist includes Cloudflare IPs (or disabled)
