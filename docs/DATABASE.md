# Database Schema

PostgreSQL database managed via Drizzle ORM.

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│   models    │◄──────│   submissions   │───────│    votes    │
└─────────────┘       └─────────────────┘       └─────────────┘
      ▲                     │
      │                     │
┌─────────────┐     ┌───────┴───────┐
│org_avatars  │     ▼               ▼
└─────────────┘ ┌─────────────┐ ┌─────────────────┐
                │  comments   │ │  comment_votes  │
                └─────────────┘ └─────────────────┘

┌─────────────┐       ┌─────────────────┐
│  hf_cache   │       │ scheduled_tasks │
└─────────────┘       └─────────────────┘
```

---

## Tables

### models

Model registry (auto-populated from submissions).

| Column        | Type         | Constraints             | Description                                           |
| ------------- | ------------ | ----------------------- | ----------------------------------------------------- |
| slug          | varchar(255) | PK                      | Hugging Face model ID (e.g., `meta-llama/Llama-3-8B`) |
| name          | varchar(200) | NOT NULL                | Display name                                          |
| org           | varchar(200) |                         | Organization/author                                   |
| orgAvatar     | varchar(500) |                         | Organization avatar URL                               |
| configCount   | integer      | DEFAULT 0, NOT NULL     | Number of configurations                              |
| lastValidated | timestamp    |                         | Last HF validation check                              |
| createdAt     | timestamp    | DEFAULT NOW(), NOT NULL | Record creation time                                  |

**Indexes:**

- `org` (for org-based filtering)
- `configCount` (for sorting by popularity)

---

### hf_cache

Hugging Face API response cache.

| Column    | Type      | Constraints             | Description          |
| --------- | --------- | ----------------------- | -------------------- |
| key       | varchar   | PK                      | Cache key            |
| data      | jsonb     | NOT NULL                | Cached response data |
| fetchedAt | timestamp | DEFAULT NOW(), NOT NULL | Cache timestamp      |

---

### org_avatars

Organization avatar cache.

| Column    | Type      | Constraints             | Description          |
| --------- | --------- | ----------------------- | -------------------- |
| org       | varchar   | PK                      | Organization name    |
| avatarUrl | varchar   | NOT NULL                | Avatar image URL     |
| fetchedAt | timestamp | DEFAULT NOW(), NOT NULL | Last fetch timestamp |

**Indexes:**

- `org` (for lookups)

---

### scheduled_tasks

Background task scheduler.

| Column          | Type      | Constraints             | Description                  |
| --------------- | --------- | ----------------------- | ---------------------------- |
| id              | serial    | PK                      | Auto-increment ID            |
| name            | varchar   | UNIQUE, NOT NULL        | Task name                    |
| enabled         | boolean   | DEFAULT true, NOT NULL  | Task enabled flag            |
| intervalSeconds | integer   | NOT NULL                | Run interval in seconds      |
| lastRun         | timestamp |                         | Last execution timestamp     |
| nextRun         | timestamp | NOT NULL                | Next scheduled run timestamp |
| lastError       | text      |                         | Last error message           |
| createdAt       | timestamp | DEFAULT NOW(), NOT NULL | Creation timestamp           |

---

### submissions

Configuration submissions.

| Column          | Type             | Constraints                | Description                        |
| --------------- | ---------------- | -------------------------- | ---------------------------------- |
| id              | serial           | PK                         | Auto-increment ID                  |
| authorHash      | varchar(64)      | NOT NULL                   | SHA-256 hash of fingerprint        |
| editToken       | varchar(32)      | NOT NULL                   | Admin edit/delete token            |
| title           | varchar(200)     | NOT NULL                   | Submission title                   |
| description     | text             |                            | Optional description               |
| cpu             | varchar(200)     |                            | CPU model                          |
| gpu             | varchar(200)     |                            | GPU model                          |
| ramGb           | integer          |                            | System RAM in GB                   |
| vramGb          | integer          |                            | GPU VRAM in GB                     |
| runtime         | varchar(50)      | NOT NULL                   | Runtime (e.g., `llama.cpp`)        |
| runtimeVersion  | varchar(50)      |                            | Runtime version                    |
| modelSlug       | varchar(255)     | FK → models.slug, NOT NULL | Associated model                   |
| quantization    | varchar(50)      |                            | Quantization type (e.g., `Q4_K_M`) |
| quantSource     | varchar(200)     |                            | Quantization provider              |
| quantUrl        | varchar(500)     |                            | Direct download URL                |
| contextLength   | integer          |                            | Context window size                |
| command         | text             |                            | Full command string                |
| inferenceParams | jsonb            |                            | Additional inference params        |
| temperature     | real             |                            | Sampling temperature (0-2)         |
| topP            | real             |                            | Top-p sampling (0-1)               |
| topK            | integer          |                            | Top-k sampling                     |
| minP            | real             |                            | Min-p sampling (0-1)               |
| repeatPenalty   | real             |                            | Repetition penalty (0-10)          |
| mirostat        | smallint         |                            | Mirostat mode (0-2)                |
| mirostatTau     | real             |                            | Mirostat tau                       |
| mirostatEta     | real             |                            | Mirostat eta                       |
| seed            | integer          |                            | Random seed                        |
| tokensPerSecond | real             |                            | Generation speed                   |
| latencyMs       | integer          |                            | First token latency                |
| memoryMb        | integer          |                            | Peak memory usage                  |
| tags            | jsonb (string[]) | DEFAULT [], NOT NULL       | User-defined tags                  |
| score           | integer          | DEFAULT 0, NOT NULL        | Net vote score                     |
| createdAt       | timestamp        | DEFAULT NOW(), NOT NULL    | Creation timestamp                 |
| updatedAt       | timestamp        | NOT NULL                   | Last update timestamp              |

**Indexes:**

- `modelSlug` (FK, filtering)
- `gpu` (filtering)
- `tokensPerSecond` (sorting)
- `score` (sorting)
- `createdAt` (sorting)

---

### votes

Submission votes (one per user per submission).

| Column       | Type        | Constraints                   | Description                 |
| ------------ | ----------- | ----------------------------- | --------------------------- |
| id           | serial      | PK                            | Auto-increment ID           |
| voterHash    | varchar(64) | NOT NULL                      | SHA-256 hash of fingerprint |
| submissionId | integer     | FK → submissions.id, NOT NULL | Target submission           |
| value        | smallint    | NOT NULL                      | Vote value: 1 or -1         |
| createdAt    | timestamp   | DEFAULT NOW(), NOT NULL       | Vote timestamp              |

**Constraints:**

- UNIQUE(voterHash, submissionId) - one vote per user per submission

---

### comments

Nested comments on submissions.

| Column       | Type        | Constraints                   | Description                  |
| ------------ | ----------- | ----------------------------- | ---------------------------- |
| id           | serial      | PK                            | Auto-increment ID            |
| submissionId | integer     | FK → submissions.id, NOT NULL | Parent submission            |
| authorHash   | varchar(64) | NOT NULL                      | SHA-256 hash of fingerprint  |
| parentId     | integer     | FK → comments.id              | Parent comment (for replies) |
| body         | text        | NOT NULL                      | Comment content              |
| score        | integer     | DEFAULT 0, NOT NULL           | Net vote score               |
| createdAt    | timestamp   | DEFAULT NOW(), NOT NULL       | Creation timestamp           |

**Self-referential:** `parentId` references `comments.id` for threaded replies.

---

### comment_votes

Comment votes (one per user per comment).

| Column    | Type        | Constraints                | Description                 |
| --------- | ----------- | -------------------------- | --------------------------- |
| id        | serial      | PK                         | Auto-increment ID           |
| voterHash | varchar(64) | NOT NULL                   | SHA-256 hash of fingerprint |
| commentId | integer     | FK → comments.id, NOT NULL | Target comment              |
| value     | smallint    | NOT NULL                   | Vote value: 1 or -1         |
| createdAt | timestamp   | DEFAULT NOW(), NOT NULL    | Vote timestamp              |

**Constraints:**

- UNIQUE(voterHash, commentId) - one vote per user per comment

---

## Migrations

Migrations are managed by Drizzle Kit.

```bash
# Generate migration from schema changes
pnpm db:generate

# Push schema changes directly (dev)
pnpm db:push

# View database in browser
pnpm dev:db
```

Migration files are stored in `packages/database/drizzle/`.
