# AGENTS.md — Development Guide for ShareLlama

## Quick Start

```bash
pnpm install                    # Install dependencies
pnpm db:up                      # Start PostgreSQL container
pnpm db:push                    # Push schema to database
pnpm dev                        # Run both API and UI dev servers
```

## Commands

### Root Commands

```bash
pnpm dev                        # Run API (port 8787) + UI (port 3000)
pnpm build                      # Build all packages
pnpm test                       # Run all tests
pnpm test:e2e                   # Run Playwright e2e tests
pnpm test:e2e:ui               # Playwright UI mode
pnpm lint                       # ESLint check
pnpm format                     # Prettier format
pnpm format:check              # Prettier check
pnpm typecheck                 # TypeScript check all packages
pnpm db:push                   # Push Drizzle schema to DB
pnpm db:generate              # Generate Drizzle migrations
pnpm db:studio                # Open Drizzle Studio
```

### Package-Specific Commands

```bash
# API (packages/api)
pnpm --filter @sharellama/api run dev
pnpm --filter @sharellama/api run test          # Run all tests
pnpm --filter @sharellama/api run test:watch    # Watch mode
pnpm --filter @sharellama/api run typecheck
pnpm --filter @sharellama/api run build

# UI (packages/ui)
pnpm --filter @sharellama/ui run dev
pnpm --filter @sharellama/ui run typecheck
pnpm --filter @sharellama/ui run build

# Database (packages/database)
pnpm --filter @sharellama/database run build
pnpm --filter @sharellama/database run typecheck
```

### Running Single Tests

```bash
# API tests (Vitest)
pnpm --filter @sharellama/api run test path/to/test.test.ts
pnpm --filter @sharellama/api run test -t "test name pattern"

# UI tests (Playwright)
pnpm test:e2e -- path/to/test.spec.ts
pnpm test:e2e:ui                                 # Interactive UI
```

## Linting & Formatting

### Commands

```bash
pnpm lint                # Run ESLint
pnpm lint --fix          # Auto-fix issues
pnpm format              # Format with Prettier
pnpm format:check        # Check formatting
```

### Import Sorting (ESLint)

Imports are automatically sorted into groups (excludes test files):

1. SolidJS packages (`solid-js`, `@solidjs`)
2. Other scoped packages (`@\\w`)
3. Lucide icons (`lucide-solid`)
4. Internal packages (`@sharellama`)
5. Relative imports (`../`, `./`)

Run `pnpm lint --fix` to auto-sort imports.

### Code Formatting (Prettier)

- **Semi**: true
- **Quotes**: double
- **Trailing comma**: all (ES5)
- **Tab width**: 2
- **Print width**: 100

Run `pnpm format` to format all files.

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** - no `any` types in new code
- **Explicit return types** on public functions
- **Interface over type** for object shapes
- **Optional fields** use `?` not `| undefined`
- **Null handling** - use `?.` and `??` operators

### Imports

```typescript
// Order: SolidJS, Solid Router, Lucide, Internal, Components
import { Title } from "@solidjs/meta";
import { createResource, Show, For } from "solid-js";
import { useParams } from "@solidjs/router";
import { ExternalLink, Download } from "lucide-solid";
import { api } from "../../lib/api";
import { Layout, Section } from "../../components/layout";
```

### Naming Conventions

- **Components**: PascalCase (`SubmissionCard`, `PageHeader`)
- **Functions/Variables**: camelCase (`formatNumber`, `handleSearch`)
- **Interfaces/Types**: PascalCase (`Model`, `SubmissionInput`)
- **Constants**: UPPER_SNAKE_CASE (`CACHE_TTL`, `STALE_THRESHOLD`)
- **Boolean variables**: `isX`, `hasX`, `shouldX` (`isLoading`, `hasError`)
- **Event handlers**: `handleX`, `onX` (`handleSubmit`, `onClick`)

### File Organization

```
packages/ui/src/
  routes/          # SolidStart file-based routing
  components/      # Reusable components
    layout/        # Layout components (Header, Footer, Section)
    display/       # Display components (Button, Badge)
    forms/         # Form components (Input, Textarea)
  lib/            # Utilities, API client, hooks
```

### Error Handling

```typescript
// API routes - return proper HTTP status codes
if (!model[0]) {
  return c.json({ error: "Model not found" }, 404);
}

// Frontend - graceful degradation with fallbacks
<Show when={model()} fallback={<LoadingState />}>
  {(m) => <ModelDetail data={m()} />}
</Show>

// Never swallow errors - log with context
try {
  await fetchData();
} catch (error) {
  console.error("Failed to fetch models:", error);
  throw error; // or return fallback
}
```

### Database Patterns

- **Drizzle ORM** for all database operations
- **Schema in** `packages/database/src/index.ts`
- **Migrations**: `pnpm db:generate` then `pnpm db:push`
- **Always add fields as optional** or with defaults for backward compatibility

### API Design

- **Hono** framework with Zod validation
- **Return consistent shapes**: `{ data: T, pagination?: {...} }`
- **Error responses**: `{ error: string }`
- **Sanitize output**: Remove sensitive fields (editToken, passwords)

## Durable Lessons (Learned the Hard Way)

### 1. Dependencies

- **Always add `zod` as direct dependency** if using `z.object()` - workspace re-exports don't work at runtime
- Check `package.json` dependencies, not just imports
- After adding dependencies: `pnpm install` in root

### 2. Database Schema Changes

```bash
# WRONG - manual SQL files
# RIGHT - Drizzle ORM workflow:
1. Update schema in packages/database/src/index.ts
2. pnpm db:push  # applies to local DB
3. Rebuild: pnpm --filter @sharellama/database run build
```

### 3. TypeScript Interface Changes

When updating interfaces (e.g., adding `orgAvatar` to `Model`):

```bash
# Must rebuild dependent packages
pnpm --filter @sharellama/model run build
pnpm --filter @sharellama/database run build
pnpm typecheck  # verify no errors
```

### 4. SolidStart Routing

- **Dynamic routes**: `[slug].tsx` → `/models/Qwen`
- **Catch-all routes**: `[...slug].tsx` → `/models/Qwen/Qwen3.5-35B-A3B`
- **Access params**: `const params = useParams(); params.slug`
- For nested paths with slashes, use `[...slug]` and `join("/")`

### 5. Page Titles

Always use format: `"ShareLlama - [Page Name]"`

```tsx
<Title>ShareLlama - Browse Models</Title>
<Title>ShareLlama - {modelName()}</Title>
```

### 6. API Response Consistency

If frontend expects a field, backend MUST return it:

```typescript
// Database schema
export const models = pgTable("models", {
  orgAvatar: varchar("org_avatar", { length: 500 }),
  // ...
});

// API response includes it
return c.json({
  data: { ...modelData, orgAvatar },
  // ...
});
```

### 7. Auto-Fetch Missing Data

Don't require manual updates - fetch on-demand:

```typescript
// In API route - fetch org avatar if missing
if (modelData.org && !modelData.orgAvatar) {
  const orgAvatar = await fetchOrgAvatar(modelData.org);
  if (orgAvatar) {
    await db.update(models).set({ orgAvatar }).where(...);
    modelData.orgAvatar = orgAvatar;
  }
}
```

### 8. External Assets

- **HuggingFace logo**: `https://huggingface.co/front/assets/huggingface_logo-noborder.svg`
- **Org avatars**: `https://cdn-avatars.huggingface.co/v1/production/uploads/{org}/{hash}.png`
- Always provide fallbacks (onError handlers)

### 9. Component Props

Support both JSX icons and URL icons:

```typescript
interface SectionProps {
  icon?: JSX.Element; // Lucide icon
  iconUrl?: string; // External URL
}
```

### 10. Background Tasks

Use Cloudflare Workers `waitUntil()` for non-blocking:

```typescript
// In Hono middleware
c.executionCtx.waitUntil(checkAndRunTasks(c));
```

### 11. Spacing & Layout

- **Breadcrumbs**: `margin-bottom: 0.75rem`
- **Page headers**: `margin-top: 0.5rem`, `margin-bottom: 1.5rem`
- **Sections**: Always have breathing room
- **Tags/badges**: Use `flex-wrap: wrap` for mobile

### 12. Testing

- **Unit tests** for business logic (Vitest)
- **E2E tests** for critical flows (Playwright)
- **Always test** with real database (docker container)
- **Run typecheck** before committing

## Architecture Notes

### Tech Stack

- **Frontend**: SolidJS + SolidStart + Vinxi
- **Backend**: Hono (Cloudflare Workers)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod
- **Styling**: Custom CSS (no Tailwind runtime)
- **Icons**: Lucide Solid

### Key Patterns

- **Database-driven task scheduler** for background jobs
- **Auto-populate** on first visit (not cron-dependent)
- **Cache with TTL** for external API calls (HF metadata: 6h)
- **Graceful degradation** - app works even if HF API is down

### Project Structure

```
packages/
  api/         # Hono API, Cloudflare Workers
  ui/          # SolidJS frontend
  database/    # Drizzle schema, migrations
  model/       # Shared types, Zod schemas
  core/        # Shared utilities, config
```

## Common Pitfalls to Avoid

1. ❌ Don't use manual SQL - use Drizzle ORM
2. ❌ Don't forget to rebuild after interface changes
3. ❌ Don't add zod imports without adding dependency
4. ❌ Don't use `[slug]` for paths with slashes - use `[...slug]`
5. ❌ Don't return null for arrays - return `[]`
6. ❌ Don't block requests on background tasks - use `waitUntil()`
7. ❌ Don't hardcode external URLs - use constants/CDN
8. ❌ Don't skip error handling - always provide fallbacks

## Getting Help

- **Drizzle docs**: https://orm.drizzle.team
- **SolidJS docs**: https://www.solidjs.com
- **Hono docs**: https://hono.dev
- **Existing code**: Search for similar patterns in codebase
