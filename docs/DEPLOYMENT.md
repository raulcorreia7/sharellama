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

| Secret                 | Source                 |
| ---------------------- | ---------------------- |
| `DATABASE_URL`         | Neon connection string |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile   |

### UI (Build-time)

| Variable                  | Value                       |
| ------------------------- | --------------------------- |
| `VITE_API_URL`            | `https://api.sharellama.io` |
| `VITE_TURNSTILE_SITE_KEY` | Turnstile site key          |

## CI/CD

GitHub Actions workflow in `.github/workflows/`:

1. On push to main: run tests
2. On tag: deploy to production

### Required GitHub Secrets

- `CLOUDFLARE_API_TOKEN` - for Workers/Pages deploy
- `NEON_DATABASE_URL` - for production migrations

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
