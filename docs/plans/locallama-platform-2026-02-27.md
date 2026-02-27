# LocalLlama - Community llama.cpp Benchmark Platform

**Status**: Planning  
**Created**: 2026-02-27  
**Updated**: 2026-02-27

## Summary

Build LocalLlama - a community-driven platform for sharing, discovering, and validating llama.cpp performance configurations, optimized commands, and benchmarks. Anonymous submissions with admin links, voting, comments, and powerful filtering.

## Context

- **Why**: Reddit/llama.cpp communities lack a centralized place to share and compare optimized configurations per hardware/model/quantization combination
- **Constraints**: Free tier hosting ($0/month), anonymous-first (no auth), cross-platform hardware detection
- **Architecture**: Monorepo with pnpm workspaces
- **Related**: ProtonDB-inspired UX

## Tech Stack

| Component | Technology | Free Tier |
|-----------|------------|-----------|
| Frontend | SolidStart + Tailwind | Cloudflare Pages |
| Backend | Hono | Cloudflare Workers (100k req/day) |
| Database | PostgreSQL + Drizzle ORM | Neon (512MB) |
| Captcha | Cloudflare Turnstile | Free |
| Detection | Shell/PowerShell scripts + Browser helper | Static files |

**Total Cost**: $0/month

## Monorepo Structure

```
localllama/
├── packages/
│   ├── db/
│   │   ├── src/
│   │   │   ├── schema.ts
│   │   │   ├── index.ts
│   │   │   └── migrations/
│   │   └── package.json
│   │
│   ├── shared/
│   │   ├── src/
│   │   │   ├── schemas/
│   │   │   │   ├── submission.ts
│   │   │   │   ├── vote.ts
│   │   │   │   └── comment.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   │   ├── submissions.ts
│   │   │   │   ├── votes.ts
│   │   │   │   └── comments.ts
│   │   │   ├── middleware/
│   │   │   │   ├── turnstile.ts
│   │   │   │   └── rateLimit.ts
│   │   │   └── lib/
│   │   ├── wrangler.toml
│   │   └── package.json
│   │
│   └── web/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── index.tsx
│       │   │   ├── detect.tsx
│       │   │   ├── submit.tsx
│       │   │   └── submissions/
│       │   │       ├── [id].tsx
│       │   │       └── [id]/admin/[token].tsx
│       │   ├── components/
│       │   │   ├── SubmissionCard.tsx
│       │   │   ├── FilterSidebar.tsx
│       │   │   ├── CommentThread.tsx
│       │   │   ├── Turnstile.tsx
│       │   │   └── VoteButtons.tsx
│       │   └── lib/
│       │       ├── fingerprint.ts
│       │       └── api.ts
│       ├── public/
│       │   ├── detect.sh
│       │   └── detect.ps1
│       ├── app.config.ts
│       └── package.json
│
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Database Schema

```typescript
// packages/db/schema.ts

export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  authorHash: varchar('author_hash', { length: 64 }).notNull(),
  editToken: varchar('edit_token', { length: 32 }).notNull(),
  
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  
  // Hardware
  cpu: varchar('cpu', { length: 200 }),        // Supports multiple: "2x AMD EPYC 7763"
  gpu: varchar('gpu', { length: 200 }),        // Supports multiple: "4x RTX 4090"
  ramGb: integer('ram_gb'),
  
  // Runtime
  runtime: varchar('runtime', { length: 50 }).notNull(),
  runtimeVersion: varchar('runtime_version', { length: 50 }),
  
  // Model
  modelName: varchar('model_name', { length: 100 }).notNull(),
  quantization: varchar('quantization', { length: 50 }),
  contextLength: integer('context_length'),
  
  // Command
  command: text('command'),
  inferenceParams: jsonb('inference_params').$type<Record<string, unknown>>(),
  
  // Sampling Parameters
  temperature: real('temperature'),
  topP: real('top_p'),
  topK: integer('top_k'),
  minP: real('min_p'),
  repeatPenalty: real('repeat_penalty'),
  mirostat: smallint('mirostat'),
  mirostatTau: real('mirostat_tau'),
  mirostatEta: real('mirostat_eta'),
  seed: integer('seed'),
  
  // Performance
  tokensPerSecond: real('tokens_per_second'),
  latencyMs: integer('latency_ms'),
  memoryMb: integer('memory_mb'),
  
  // Tags
  tags: jsonb('tags').$type<string[]>().default([]),
  
  score: integer('score').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const votes = pgTable('votes', {
  id: serial('id').primaryKey(),
  voterHash: varchar('voter_hash', { length: 64 }).notNull(),
  submissionId: integer('submission_id').references(() => submissions.id).notNull(),
  value: smallint('value').notNull(), // -1 or 1
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  voterSubmissionUnique: unique().on(table.voterHash, table.submissionId),
}));

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id').references(() => submissions.id).notNull(),
  authorHash: varchar('author_hash', { length: 64 }).notNull(),
  parentId: integer('parent_id').references((): any => comments.id),
  body: text('body').notNull(),
  score: integer('score').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Key Files

| File | Purpose |
|------|---------|
| `packages/db/src/schema.ts` | Drizzle schema definitions |
| `packages/shared/src/schemas/*.ts` | Zod validation schemas (shared) |
| `packages/api/src/index.ts` | Hono app entry point |
| `packages/api/src/routes/submissions.ts` | Submissions CRUD + admin tokens |
| `packages/web/src/routes/index.tsx` | Landing page |
| `packages/web/public/detect.sh` | Linux/macOS hardware detection |
| `packages/web/public/detect.ps1` | Windows hardware detection |

## Tasks

### Wave 1 (Parallel)

- [ ] **Task 1: Project Scaffolding & Tooling**
  - Objective: Initialize pnpm monorepo with web, api, db, shared packages
  - Files: `pnpm-workspace.yaml`, `package.json`, `tsconfig.json`, `.eslintrc`, `.prettierrc`
  - Done when: `pnpm install` works, TypeScript compiles, lint passes
  - Commit: `chore: init monorepo with pnpm workspaces`

- [ ] **Task 2: Database Schema & Migrations**
  - Objective: Define Drizzle schema for submissions, votes, comments
  - Files: `packages/db/src/schema.ts`, `packages/db/src/index.ts`, `drizzle.config.ts`
  - Done when: Schema defined, `drizzle-kit push` creates tables on Neon
  - Commit: `feat(db): add schema for submissions, votes, comments`

### Wave 2 (Parallel)

- [ ] **Task 3: Backend Core Setup (Hono + Workers)**
  - Objective: Hono app with CORS, logging, error handling, Zod validation
  - Files: `packages/api/src/index.ts`, `packages/api/wrangler.toml`
  - Done when: `wrangler dev` starts, `/health` returns 200
  - Commit: `feat(api): init Hono server for Cloudflare Workers`

- [ ] **Task 4: Frontend Core Setup (SolidStart)**
  - Objective: SolidStart app with Tailwind, browser fingerprinting utility
  - Files: `packages/web/src/`, `packages/web/app.config.ts`, `tailwind.config.js`
  - Done when: Dev server runs, styles apply, routes work
  - Commit: `feat(web): init SolidStart with Tailwind`

### Wave 3 (Parallel)

- [ ] **Task 5: Turnstile Integration**
  - Objective: Cloudflare Turnstile verification middleware
  - Files: `packages/api/src/middleware/turnstile.ts`, `packages/web/src/components/Turnstile.tsx`
  - Done when: Protected routes reject invalid tokens
  - Commit: `feat(api): add Turnstile captcha verification`

- [ ] **Task 6: Rate Limiting**
  - Objective: IP-hash based rate limiting for submissions/comments/votes
  - Files: `packages/api/src/middleware/rateLimit.ts`
  - Done when: Rate limits enforced, 429 returned on abuse
  - Commit: `feat(api): add anonymous rate limiting`

- [ ] **Task 7: Hardware Detection Scripts**
  - Objective: Shell/PowerShell scripts + browser helper for hardware detection
  - Files: 
    - `packages/web/public/detect.sh`
    - `packages/web/public/detect.ps1`
    - `packages/web/src/routes/detect.tsx`
  - Done when:
    - `curl detect.sh | bash` outputs hardware info (multiple CPUs/GPUs)
    - `iwr detect.ps1 | iex` works on Windows
    - `/detect` page works in browser
  - Commit: `feat(web): add hardware detection scripts and helper page`

### Wave 4 (Parallel)

- [ ] **Task 8: Submissions API**
  - Objective: CRUD endpoints with admin token generation, edit via admin link
  - Files: `packages/api/src/routes/submissions.ts`
  - Done when: Anonymous users can submit, admin link returned, `/admin/:token` routes work
  - Commit: `feat(api): add submissions CRUD with admin tokens`

- [ ] **Task 9: Submissions UI**
  - Objective: List/detail pages, create/edit forms, admin link display
  - Files:
    - `packages/web/src/routes/index.tsx`
    - `packages/web/src/routes/submit.tsx`
    - `packages/web/src/routes/submissions/[id].tsx`
    - `packages/web/src/routes/submissions/[id]/admin/[token].tsx`
    - `packages/web/src/components/SubmissionCard.tsx`
  - Done when: Full CRUD flow works, admin link shown after submit
  - Commit: `feat(web): add submissions pages and forms`

### Wave 5 (Parallel)

- [ ] **Task 10: Voting System API**
  - Objective: Upvote/downvote with fingerprint hash, unique constraint, score aggregation
  - Files: `packages/api/src/routes/votes.ts`
  - Done when: One vote per fingerprint per submission, scores update correctly
  - Commit: `feat(api): add voting with fingerprint tracking`

- [ ] **Task 11: Comments System API**
  - Objective: Threaded comments with anonymous authors, rate-limited
  - Files: `packages/api/src/routes/comments.ts`
  - Done when: Nested comments work, rate-limited
  - Commit: `feat(api): add threaded comments`

- [ ] **Task 12: Search & Filtering API**
  - Objective: Filter by model/GPU/CPU/quant/runtime, sort, paginate
  - Files: `packages/api/src/routes/submissions.ts` (extend)
  - Done when: Query params filter efficiently
  - Commit: `feat(api): add search and filtering`

### Wave 6 (Parallel)

- [ ] **Task 13: Voting & Comments UI**
  - Objective: Vote buttons with optimistic updates, comment thread component
  - Files:
    - `packages/web/src/components/VoteButtons.tsx`
    - `packages/web/src/components/CommentThread.tsx`
  - Done when: Voting and commenting work without page refresh
  - Commit: `feat(web): add voting and comments UI`

- [ ] **Task 14: Search & Filtering UI**
  - Objective: Filter sidebar, search bar, URL state sync
  - Files: `packages/web/src/components/FilterSidebar.tsx`
  - Done when: Filters update URL and results in real-time
  - Commit: `feat(web): add search and filter controls`

- [ ] **Task 15: Landing Page**
  - Objective: Hero section, stats, featured submissions, CTAs
  - Files: `packages/web/src/routes/index.tsx`
  - Done when: Landing page matches ProtonDB-inspired design
  - Commit: `feat(web): add landing page`

### Wave 7

- [ ] **Task 16: Tests**
  - Objective: Vitest for API, Playwright for e2e critical flows
  - Files: `packages/api/src/**/*.test.ts`, `e2e/*.spec.ts`
  - Done when: Core flows covered (submit, vote, comment, search)
  - Commit: `test: add integration and e2e tests`

### Wave 8

- [ ] **Task 17: Deployment**
  - Objective: Cloudflare Pages + Workers + Neon + env docs
  - Files: `wrangler.toml`, `.env.example`, `README.md`
  - Done when: Live at domain, all features work
  - Commit: `chore: add deployment config`

## Hardware Detection Script Details

### detect.sh (Linux/macOS)

```bash
#!/bin/bash
# Supports: Multiple CPUs, Multiple GPUs

echo "=== LocalLlama Hardware Detection ==="
echo ""

# CPU(s) - handles multiple sockets
if [[ "$OSTYPE" == "darwin"* ]]; then
  CPU=$(sysctl -n machdep.cpu.brand_string 2>/dev/null)
  CORES=$(sysctl -n hw.ncpu)
  SOCKETS=$(sysctl -n hw.packages 2>/dev/null || echo "1")
  echo "CPU: $CPU"
  echo "Cores: $CORES"
  [[ "$SOCKETS" != "1" ]] && echo "Sockets: $SOCKETS"
else
  # Linux - handle multiple CPUs
  CPU_MODEL=$(grep 'model name' /proc/cpuinfo 2>/dev/null | head -1 | cut -d: -f2 | xargs)
  CORES=$(nproc 2>/dev/null)
  SOCKETS=$(lscpu 2>/dev/null | grep 'Socket(s):' | awk '{print $2}' || echo "1")
  echo "CPU: $CPU_MODEL"
  echo "Cores: $CORES"
  [[ "$SOCKETS" != "1" ]] && echo "Sockets: $SOCKETS (multi-CPU system)"
fi

# RAM
if [[ "$OSTYPE" == "darwin"* ]]; then
  RAM=$(($(sysctl -n hw.memsize) / 1024 / 1024 / 1024))
else
  RAM=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print int($2/1024/1024 + 0.5)}')
fi
echo "RAM: ${RAM} GB"

# OS
echo "OS: $(uname -s) $(uname -r)"

# GPU(s) - handles multiple GPUs
echo ""
echo "GPU(s):"
if command -v nvidia-smi &> /dev/null; then
  nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null | while IFS=',' read -r name mem; do
    echo "  - ${name} (${mem})"
  done
elif [[ "$OSTYPE" == "darwin"* ]]; then
  system_profiler SPDisplaysDataType 2>/dev/null | grep "Chipset Model" | while IFS=':' read -r _ model; do
    echo "  - ${model}"
  done
else
  # Try AMD ROCm
  if command -v rocm-smi &> /dev/null; then
    rocm-smi --showproductname 2>/dev/null | grep -E "^Card" | while read -r line; do
      echo "  - $line"
    done
  else
    echo "  (none detected - CPU only system)"
  fi
fi

echo ""
echo "---"
echo "Copy the above to your submission!"
```

### detect.ps1 (Windows)

```powershell
# Supports: Multiple CPUs, Multiple GPUs

Write-Host "=== LocalLlama Hardware Detection ===" -ForegroundColor Cyan
Write-Host ""

# CPU(s) - handles multiple sockets
$cpus = Get-CimInstance Win32_Processor
$cpuCount = @($cpus).Count
foreach ($cpu in $cpus) {
  if ($cpuCount -gt 1) {
    Write-Host "CPU (Socket $($cpu.SocketDesignation)): $($cpu.Name) ($($cpu.NumberOfCores) cores, $($cpu.NumberOfLogicalProcessors) threads)"
  } else {
    Write-Host "CPU: $($cpu.Name) ($($cpu.NumberOfCores) cores, $($cpu.NumberOfLogicalProcessors) threads)"
  }
}

# RAM
$ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
Write-Host "RAM: $ram GB"

# OS
$os = Get-CimInstance Win32_OperatingSystem
Write-Host "OS: $($os.Caption) Build $($os.BuildNumber)"

# GPU(s) - handles multiple GPUs
Write-Host ""
Write-Host "GPU(s):"
$gpus = Get-CimInstance Win32_VideoController
foreach ($gpu in $gpus) {
  $vram = [math]::Round($gpu.AdapterRAM / 1GB)
  Write-Host "  - $($gpu.Name) ($vram GB)"
}

Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host "Copy the above to your submission!" -ForegroundColor Green
```

## Runtime Options

| Runtime | Description |
|---------|-------------|
| `llama.cpp` | Original, most common |
| `ikllama.cpp` | Apple Silicon optimized fork |
| `llamafile` | Mozilla's portable binaries |
| `ollama` | Easy wrapper, local API |
| `koboldcpp` | Focus on creative writing |
| `text-generation-webui` | Gradio UI wrapper |
| `lmstudio` | GUI application |
| `localai` | OpenAI-compatible API |
| `other` | Catch-all |

## Filter Dimensions

| Filter | Type | Description |
|--------|------|-------------|
| Model | Multi-select | Llama, Mistral, Qwen, etc. |
| Quantization | Multi-select | Q4_K_M, Q5_K_M, Q8_0, etc. |
| GPU | Multi-select | RTX 4090, A100, CPU-only, etc. |
| Runtime | Multi-select | llama.cpp, ollama, etc. |
| Min tok/s | Range | Performance threshold |
| Sort | Single | Top Rated, Newest, Fastest |

## Decisions Log

- 2026-02-27: Chose fully anonymous model (no OAuth) for zero-friction contribution
- 2026-02-27: Admin links (secret URLs) for edit/delete instead of accounts
- 2026-02-27: Cloudflare Turnstile for spam prevention (free, privacy-friendly)
- 2026-02-27: Shell/PowerShell scripts for hardware detection (no runtime required)
- 2026-02-27: SolidStart + Hono + Neon stack for $0/month hosting

## Notes

- Browser fingerprint stored as hash (privacy-preserving)
- Edit token in URL allows bookmark-style ownership
- Rate limits: 5 submissions/hour, 10 comments/hour per IP hash
- Tags limited to 10 per submission
- Comments support threading via parent_id

## Estimated Timeline

| Wave | Tasks | Time |
|------|-------|------|
| 1 | Scaffolding, Schema | 2-3h |
| 2 | Backend/Frontend Core | 2-3h |
| 3 | Turnstile, Rate Limit, Detection | 2-3h |
| 4 | Submissions API + UI | 3-4h |
| 5 | Voting, Comments, Search API | 3-4h |
| 6 | UI Polish + Landing | 4-5h |
| 7 | Tests | 2-3h |
| 8 | Deployment | 1-2h |
| **Total** | | **~20-27h** |
