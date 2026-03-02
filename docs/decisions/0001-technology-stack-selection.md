# 0001 - Technology Stack Selection

## Status

Accepted

## Context

ShareLlama needed a modern, scalable, and cost-effective technology stack for building a community platform to share llama.cpp configurations. The platform needed to:

- Handle moderate traffic with minimal infrastructure cost
- Provide fast, responsive UI for browsing and searching
- Support anonymous submissions without user accounts
- Integrate with Hugging Face for model discovery
- Be easy to develop, test, and deploy

## Decision

We chose the following technology stack:

### Frontend: SolidStart + SolidJS

**Decision:** Use SolidStart (meta-framework) with SolidJS (reactive library)

**Rationale:**

- Excellent performance (fine-grained reactivity without virtual DOM)
- Simple mental model (similar to React but more predictable)
- Built-in SSR/SSG support via SolidStart
- Small bundle size
- TypeScript-first

**Alternatives Considered:**

- **Next.js/React:** More popular but heavier, complex re-renders
- **Svelte/SvelteKit:** Good DX but smaller ecosystem
- **Vue/Nuxt:** Viable but team had less experience

### Backend: Hono on Cloudflare Workers

**Decision:** Use Hono framework deployed on Cloudflare Workers

**Rationale:**

- Edge deployment (low latency globally)
- Extremely cost-effective (generous free tier)
- Fast cold starts
- Hono provides familiar Express-like API
- Native TypeScript support
- Easy integration with Cloudflare services (Turnstile, Pages)

**Alternatives Considered:**

- **Node.js + Express:** More familiar but requires server management
- **Fastify:** Faster but similar ops overhead
- **Serverless (Vercel/Netlify):** More expensive at scale
- **Go/Rust:** Better perf but slower development

### Database: PostgreSQL (Neon) + Drizzle ORM

**Decision:** Use Neon's serverless PostgreSQL with Drizzle ORM

**Rationale:**

- PostgreSQL: Battle-tested, excellent for relational data
- Neon: Serverless, auto-scaling, generous free tier
- Drizzle: Type-safe, lightweight, easy migrations
- SQL familiarity (team experience)

**Alternatives Considered:**

- **PlanetScale (MySQL):** Good but MySQL less featureful
- **Supabase:** More features but heavier
- **SQLite (Turso):** Simpler but less powerful
- **Prisma:** More popular but heavier runtime

### Validation: Zod

**Decision:** Use Zod for runtime validation and type inference

**Rationale:**

- TypeScript-first with excellent type inference
- Runtime validation for API inputs
- Can derive TypeScript types from schemas
- Large ecosystem, well-maintained
- Works seamlessly with Hono (@hono/zod-validator)

**Alternatives Considered:**

- **Yup:** Older, less TypeScript-native
- **Valibot:** Lighter but smaller ecosystem
- **io-ts:** Functional style, steeper learning curve
- **Manual validation:** Error-prone, repetitive

### Authentication: Browser Fingerprint + Turnstile

**Decision:** Anonymous identity via SHA-256 hashed fingerprint + Cloudflare Turnstile for bot protection

**Rationale:**

- No user accounts required (lower barrier to entry)
- Privacy-preserving (one-way hash)
- Turnstile provides excellent bot protection
- Free tier sufficient for expected traffic
- Simple implementation

**Alternatives Considered:**

- **Full auth system (Auth0, Clerk):** Overkill for anonymous platform
- **Session-based:** Requires server state, less scalable
- **JWT:** Still needs user accounts
- **No auth:** Vulnerable to spam/bots

### Testing: Vitest + Playwright

**Decision:** Vitest for unit tests, Playwright for E2E tests

**Rationale:**

- Vitest: Fast, Vite-native, compatible with existing tooling
- Playwright: Best browser automation, cross-browser support
- Both have excellent TypeScript support
- Good DX with watch mode, snapshots, etc.

**Alternatives Considered:**

- **Jest:** More popular but slower, more config
- **Cypress:** Good for E2E but slower than Playwright
- **Testing Library:** Component testing (not needed for our architecture)

## Consequences

### Positive

- **Low cost:** Free tiers sufficient for early stages
- **Fast development:** Modern tools with good DX
- **Good performance:** Edge deployment, efficient frontend
- **Type safety:** End-to-end TypeScript
- **Scalable:** Cloudflare Workers auto-scale

### Negative

- **Cloudflare lock-in:** Heavy reliance on Cloudflare ecosystem
- **Workers limitations:** 15s timeout, memory limits
- **Learning curve:** SolidJS less familiar than React
- **Cold starts:** Can occur on Workers (mitigated by Cloudflare)
- **Neon cold starts:** Free tier has 5min idle timeout

### Mitigations

- Abstract database access (easy to migrate)
- Keep Workers stateless (easy to move)
- Use standard protocols (REST, PostgreSQL)
- Document architecture clearly

## Alternatives Considered

1. **Full-stack Next.js on Vercel**
   - Pros: Simpler deployment, more popular
   - Cons: More expensive, vendor lock-in anyway

2. **Traditional Node.js + Docker**
   - Pros: Full control, no vendor lock-in
   - Cons: More ops overhead, slower iteration

3. **Supabase stack**
   - Pros: More features out of box (auth, realtime)
   - Cons: Heavier, more expensive at scale

## References

- [SolidJS Docs](https://www.solidjs.com)
- [Hono Docs](https://hono.dev)
- [Cloudflare Workers](https://workers.cloudflare.com)
- [Drizzle ORM](https://orm.drizzle.team)
- [Zod](https://zod.dev)
- [Neon](https://neon.tech)
