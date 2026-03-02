# Runbook

Operational procedures and troubleshooting for ShareLlama.

## Health Checks

### API Health

```bash
curl https://api.sharellama.io/health
```

Expected:

```json
{ "status": "ok", "timestamp": "..." }
```

### Database Connectivity

```bash
# Via API (if DB unreachable, will return 500)
curl https://api.sharellama.io/submissions/stats
```

### UI Health

```bash
curl -I https://sharellama.io
```

Expected: 200 OK

---

## Incident Response

### API Returning 500 Errors

1. Check Cloudflare Workers logs
   - Dashboard > Workers > sharellama-api > Logs
2. Verify database connectivity
   - Check Neon dashboard for connection limits
3. Check for recent deployments
   - `wrangler deployments list`
4. Rollback if needed
   - `wrangler rollback`

### UI Not Loading

1. Check Cloudflare Pages status
   - Dashboard > Pages > sharellama > Deployments
2. Verify build succeeded
3. Check for JS errors in browser console
4. Verify API URL is correct (network tab)

### Database Issues

1. Check Neon dashboard
   - Project status (active/suspended)
   - Connection count
   - Storage usage
2. If suspended (free tier): wake up in console
3. If connection limit: check for connection leaks

### Turnstile Failures

1. Verify site key matches domain
2. Check Cloudflare Turnstile dashboard for errors
3. Test with Turnstile demo page

---

## Common Operations

### Force Delete a Submission

When admin token is lost:

```sql
-- Connect to Neon SQL editor or via psql
DELETE FROM votes WHERE submission_id = <id>;
DELETE FROM comments WHERE submission_id = <id>;
DELETE FROM submissions WHERE id = <id>;
-- Update model config count
UPDATE models SET config_count = config_count - 1 WHERE slug = '<model_slug>';
```

### Reset User Votes

```sql
-- Remove all votes from a specific voter (by fingerprint hash)
DELETE FROM votes WHERE voter_hash = '<hash>';
-- Recalculate submission scores (requires app logic or manual update)
```

### Ban Malicious Fingerprint

```sql
-- Find submissions by fingerprint
SELECT id, title FROM submissions WHERE author_hash = '<hash>';

-- Delete all content from fingerprint
DELETE FROM comment_votes WHERE voter_hash = '<hash>';
DELETE FROM votes WHERE voter_hash = '<hash>';
DELETE FROM comments WHERE author_hash = '<hash>';
DELETE FROM submissions WHERE author_hash = '<hash>';
```

### Update Model Config Counts

If counts drift:

```sql
UPDATE models m
SET config_count = (
  SELECT COUNT(*) FROM submissions s WHERE s.model_slug = m.slug
);
```

---

## Database Maintenance

### Backup

Neon automatically creates branches/backs up. To export:

```bash
pg_dump $DATABASE_URL > backup.sql
```

### Restore

```bash
psql $DATABASE_URL < backup.sql
```

### Migrations

```bash
# Generate from schema changes
pnpm db:generate

# Apply to production
export DATABASE_URL="production_url"
pnpm db:push
```

---

## Deployment

### Emergency Rollback

**API:**

```bash
wrangler rollback
```

**UI:**

1. Dashboard > Pages > sharellama > Deployments
2. Find last known good
3. Click "Rollback"

### Deploy Hotfix

```bash
# Make fix, then:
pnpm deploy:api  # or deploy:ui
```

---

## Monitoring

### Key Metrics

| Metric          | Source             | Alert Threshold |
| --------------- | ------------------ | --------------- |
| API error rate  | Cloudflare Workers | > 1%            |
| API latency p99 | Cloudflare Workers | > 2s            |
| DB connections  | Neon dashboard     | > 80% limit     |
| DB storage      | Neon dashboard     | > 80% limit     |

### Log Queries

**Workers logs:**

```bash
wrangler tail
```

**Recent API errors:**

```bash
wrangler tail --format json | jq 'select(.event.request.status >= 500)'
```

---

## Security

### Rotate Turnstile Keys

1. Generate new keys in Cloudflare dashboard
2. Update API secret:
   ```bash
   wrangler secret put TURNSTILE_SECRET_KEY
   ```
3. Update UI env var and redeploy:
   ```bash
   VITE_TURNSTILE_SITE_KEY=new-key pnpm deploy:ui
   ```

### Database Credentials

1. Reset password in Neon dashboard
2. Update API secret:
   ```bash
   wrangler secret put DATABASE_URL
   ```

---

## Rate Limiting

Current limits (in-memory, per IP):

| Action  | Limit | Window |
| ------- | ----- | ------ |
| Submit  | 5     | 1 hour |
| Comment | 10    | 1 hour |
| Vote    | 50    | 1 hour |

To change: edit `packages/api/src/middleware/rateLimit.ts`

**Note:** Rate limits reset on Worker cold start (in-memory storage).

---

## Performance

### Slow Queries

Check Drizzle Studio or Neon dashboard for:

- Long-running queries
- Missing indexes
- Table bloat

### API Latency

1. Check Workers analytics
2. Profile with `wrangler dev --local`
3. Add caching headers for static data

### Database Optimization

Common indexes (already created):

- `submissions(model_slug)`
- `submissions(gpu)`
- `submissions(score)`
- `submissions(created_at)`
- `models(config_count)`

Add new indexes in `packages/database/src/index.ts` and run `pnpm db:push`.
