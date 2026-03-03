# ShareLlama Model Specifications System

**Status**: Planning
**Created**: 2026-03-03
**Updated**: 2026-03-03

## Summary

Add user-submitted model specifications, architecture docs, and running configurations to enhance model detail pages with technical specs, VRAM requirements, generation presets, and community-verified commands.

## Context

- **Why**: Users need technical specs (architecture, VRAM, commands) alongside configs. Research from r/LocalLLaMA shows these are the most requested details.
- **Constraints**: User-submitted only (no automated scraping), must integrate with existing submission flow, maintain backward compatibility
- **Architecture**: Monorepo with packages/database, packages/api, packages/ui, packages/model
- **Related**: Database schema in packages/database/src/index.ts, API routes in packages/api/src/routes/models.ts

## Key Files

- `packages/database/src/index.ts` — Add modelSpecs table
- `packages/model/src/schemas/model.ts` — Add Zod validation schemas
- `packages/api/src/routes/models.ts` — Add CRUD endpoints
- `packages/ui/src/routes/models/[...slug].tsx` — Enhance detail page
- `packages/ui/src/components/display/` — New spec display components

## Tasks

### Phase 1: Foundation (Sequential)
- [ ] Task 1: Add modelSpecs table to database schema
  - Objective: Create PostgreSQL table for user-submitted specs
  - Files: packages/database/src/index.ts, migrations/
  - Done when: Table created, types generated, exports updated

- [ ] Task 2: Create model spec Zod schemas
  - Objective: Define validation for spec create/update
  - Files: packages/model/src/schemas/model.ts
  - Done when: createModelSpecSchema and updateModelSpecSchema exported

- [ ] Task 3: Add GET/POST endpoints for model specs
  - Objective: REST API for fetching/submitting specs
  - Files: packages/api/src/routes/models.ts
  - Done when: /models/:slug/specs supports GET list and POST create

- [ ] Task 4: Add PATCH endpoint and verification logic
  - Objective: Enable spec updates and primary designation
  - Files: packages/api/src/routes/models.ts
  - Done when: PATCH /models/:slug/specs/:sourceType works with author verification

### Phase 2: UI Components (Fully Parallel - 5 tasks)
- [ ] Task 5: Create SpecsGrid component
  - Objective: Display architecture specs in grid
  - Files: packages/ui/src/components/display/SpecsGrid.tsx
  - Done when: Renders params, layers, context, attention with icons

- [ ] Task 6: Create VramCard component
  - Objective: Show VRAM requirements per quant
  - Files: packages/ui/src/components/display/VramCard.tsx
  - Done when: Displays quant, VRAM, GPU recommendation

- [ ] Task 7: Create PresetTabs component
  - Objective: Tabbed generation presets
  - Files: packages/ui/src/components/display/PresetTabs.tsx
  - Done when: Shows default/thinking/code/creative params

- [ ] Task 8: Create CommandBlock component
  - Objective: Copyable inference commands
  - Files: packages/ui/src/components/display/CommandBlock.tsx
  - Done when: Syntax highlighted commands with copy button

- [ ] Task 9: Create CommunityRefs component
  - Objective: List reddit discussions
  - Files: packages/ui/src/components/display/CommunityRefs.tsx
  - Done when: Shows posts with upvotes and links

### Phase 3: UI Page Integration (Parallel after Phase 2)
- [ ] Task 10: Enhance model detail page header
  - Objective: Add architecture badges
  - Files: packages/ui/src/routes/models/[...slug].tsx
  - Done when: Header shows arch type, params, context badges

- [ ] Task 11: Add architecture specs section
  - Objective: Display full specs grid
  - Files: packages/ui/src/routes/models/[...slug].tsx
  - Done when: Section renders all spec fields

- [ ] Task 12: Add VRAM requirements section
  - Objective: Hardware requirements display
  - Files: packages/ui/src/routes/models/[...slug].tsx
  - Done when: Shows 3+ VRAM cards

- [ ] Task 13: Add running commands section
  - Objective: Copyable commands for engines
  - Files: packages/ui/src/routes/models/[...slug].tsx
  - Done when: Tabbed llama.cpp/vLLM/Ollama commands

- [ ] Task 14: Add generation presets section
  - Objective: Sampling parameters by use case
  - Files: packages/ui/src/routes/models/[...slug].tsx
  - Done when: Tabbed presets for modes

- [ ] Task 15: Add community references section
  - Objective: Link to discussions
  - Files: packages/ui/src/routes/models/[...slug].tsx
  - Done when: Lists reddit posts with metadata

### Phase 4: Submission Flow (Parallel with Phase 3)
- [ ] Task 16: Add model specs fields to submission form
  - Objective: Submit specs with configs
  - Files: packages/ui/src/routes/submit.tsx
  - Done when: Optional spec section in form

- [ ] Task 17: Create dedicated spec submission route
  - Objective: Separate spec-only flow
  - Files: packages/ui/src/routes/models/[...slug]/submit-spec.tsx
  - Done when: Route with form and validation

- [ ] Task 18: Enhance command parser for spec extraction
  - Objective: Auto-detect from commands
  - Files: packages/ui/src/lib/commandParser.ts
  - Done when: Extracts context, temp, top-p from pasted commands

### Phase 5: Integration & Polish (Final)
- [ ] Task 19: Auto-populate specs from HuggingFace README
  - Objective: Fetch initial specs from HF
  - Files: packages/api/src/routes/models.ts
  - Done when: Background task extracts HF metadata

- [ ] Task 20: Add model filtering by architecture
  - Objective: Filter by MoE, Dense, context
  - Files: packages/ui/src/components/FilterSidebar.tsx
  - Done when: Sidebar has arch filters

- [ ] Task 21: Add CSS styles for new components
  - Objective: Consistent styling
  - Files: packages/ui/src/styles/specs.css
  - Done when: All components match design system

- [ ] Task 22: Add loading skeletons and error states
  - Objective: Graceful loading/errors
  - Files: packages/ui/src/routes/models/[...slug].tsx
  - Done when: Skeletons and error banners for all sections

## Decisions Log

- 2026-03-03: Specs will be user-submitted (not auto-scraped) per requirement
- 2026-03-03: Multiple specs per model allowed, one flagged as primary
- 2026-03-03: Separate submission flow from configs but linkable
- 2026-03-03: Community-driven verification with isVerified flag

## Notes

**Parallel Execution Groups:**
- Group A (Sequential): Tasks 1-4 (Database → API)
- Group B (Parallel): Tasks 5-9 (Components - all independent)
- Group C (Parallel): Tasks 10-15 (Page sections - after components)
- Group D (Parallel): Tasks 16-18 (Submission flow)
- Group E (Sequential): Tasks 19-22 (Integration & polish)

**Critical Path:** 1 → 2 → 3 → 4 → (5-9 parallel) → (10-15 parallel)

**Testing Requirements:**
- API: Vitest tests for CRUD endpoints
- UI: Playwright E2E for spec submission flow
- Type checking: All new schemas and components

**Security Notes:**
- Sanitize user-submitted commands (XSS prevention)
- Rate limit spec submissions (use existing Turnstile)
- Validate all URLs in references

**Research Source:**
- r/LocalLLaMA posts analyzed for common parameter patterns
- llama.cpp, vLLM, Ollama command formats documented
- Unsloth and TheBloke quantization references
