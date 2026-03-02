# Types & Contracts

All validation schemas and types are in `packages/model/src/`.

## Schemas

### Submission

**Create Submission** (`createSubmissionSchema`)

| Field           | Type                    | Required | Constraints                 |
| --------------- | ----------------------- | -------- | --------------------------- |
| title           | string                  | Yes      | 1-200 chars                 |
| description     | string                  | No       | max 5000 chars              |
| cpu             | string                  | No       | max 200 chars               |
| gpu             | string                  | No       | max 200 chars               |
| ramGb           | number                  | No       | positive integer            |
| vramGb          | number                  | No       | positive integer            |
| runtime         | string                  | Yes      | 1-50 chars                  |
| runtimeVersion  | string                  | No       | max 50 chars                |
| modelSlug       | string                  | Yes      | 1-255 chars                 |
| quantization    | string                  | No       | max 50 chars                |
| quantSource     | string                  | No       | max 200 chars               |
| quantUrl        | string                  | No       | max 500 chars               |
| contextLength   | number                  | No       | positive integer            |
| command         | string                  | No       | max 5000 chars              |
| inferenceParams | Record<string, unknown> | No       | -                           |
| temperature     | number                  | No       | 0-2                         |
| topP            | number                  | No       | 0-1                         |
| topK            | number                  | No       | positive integer            |
| minP            | number                  | No       | 0-1                         |
| repeatPenalty   | number                  | No       | 0-10                        |
| mirostat        | number                  | No       | 0, 1, or 2                  |
| mirostatTau     | number                  | No       | 0-10                        |
| mirostatEta     | number                  | No       | 0-1                         |
| seed            | number                  | No       | integer                     |
| tokensPerSecond | number                  | No       | positive                    |
| latencyMs       | number                  | No       | positive integer            |
| memoryMb        | number                  | No       | positive integer            |
| tags            | string[]                | No       | max 10 items, 50 chars each |

**Update Submission** (`updateSubmissionSchema`)

Same as create, but all fields optional. Cannot update `modelSlug`.

**List Query** (`listSubmissionsQuerySchema`)

| Field        | Type   | Default   | Constraints                       |
| ------------ | ------ | --------- | --------------------------------- |
| q            | string | -         | max 200 chars                     |
| page         | number | 1         | positive integer                  |
| limit        | number | 20        | 1-100                             |
| sort         | enum   | createdAt | score, createdAt, tokensPerSecond |
| order        | enum   | desc      | asc, desc                         |
| modelSlug    | string | -         | -                                 |
| gpu          | string | -         | -                                 |
| cpu          | string | -         | -                                 |
| quantization | string | -         | -                                 |
| runtime      | string | -         | -                                 |
| quantSource  | string | -         | -                                 |
| vramMin      | number | -         | positive                          |
| vramMax      | number | -         | positive                          |
| ramMin       | number | -         | positive                          |
| ramMax       | number | -         | positive                          |
| minTps       | number | -         | positive                          |
| maxTps       | number | -         | positive                          |

### Vote

**Vote Value** (`voteValueSchema`)

| Value | Meaning  |
| ----- | -------- |
| 1     | Upvote   |
| -1    | Downvote |

**Create Vote** (`createVoteSchema`)

| Field | Type    | Required |
| ----- | ------- | -------- |
| value | 1 \| -1 | Yes      |

### Comment

**Create Comment** (`createCommentSchema`)

| Field    | Type   | Required | Constraints  |
| -------- | ------ | -------- | ------------ |
| body     | string | Yes      | 1-5000 chars |
| parentId | number | No       | positive int |

**List Query** (`listCommentsQuerySchema`)

| Field   | Type | Default | Options   |
| ------- | ---- | ------- | --------- |
| include | enum | flat    | flat, all |

**Vote Comment** (`voteCommentSchema`)

| Field | Type    | Required |
| ----- | ------- | -------- |
| value | 1 \| -1 | Yes      |

**CommentNode** (response type)

```typescript
interface CommentNode {
  id: number;
  submissionId: number;
  authorHash: string; // truncated to first 4 chars
  parentId: number | null;
  body: string;
  score: number;
  createdAt: string; // ISO timestamp
  replies?: CommentNode[]; // only when include=all
}
```

### Model

**List Query** (`listModelsQuerySchema`)

| Field | Type   | Default     | Constraints            |
| ----- | ------ | ----------- | ---------------------- |
| q     | string | -           | max 200 chars          |
| sort  | enum   | configCount | configCount, createdAt |
| order | enum   | desc        | asc, desc              |
| page  | number | 1           | positive integer       |
| limit | number | 20          | 1-100                  |

**Model** (response type)

```typescript
interface Model {
  slug: string;
  name: string;
  org: string | null;
  configCount: number;
  lastValidated: string | null;
  createdAt: string;
}
```

## Response Types

### PaginatedResponse

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### ApiError

```typescript
interface ApiError {
  error: string;
  message?: string;
}
```

### Submission Response

```typescript
interface SubmissionResponse {
  id: number;
  authorHash: string;
  title: string;
  description: string | null;
  cpu: string | null;
  gpu: string | null;
  ramGb: number | null;
  vramGb: number | null;
  runtime: string;
  runtimeVersion: string | null;
  modelSlug: string;
  quantization: string | null;
  quantSource: string | null;
  quantUrl: string | null;
  contextLength: number | null;
  command: string | null;
  inferenceParams: Record<string, unknown> | null;
  temperature: number | null;
  topP: number | null;
  topK: number | null;
  minP: number | null;
  repeatPenalty: number | null;
  mirostat: number | null;
  mirostatTau: number | null;
  mirostatEta: number | null;
  seed: number | null;
  tokensPerSecond: number | null;
  latencyMs: number | null;
  memoryMb: number | null;
  tags: string[];
  score: number;
  createdAt: string;
  updatedAt: string;
  userVote?: 1 | -1 | null; // included when fingerprint provided
}
```

### Vote Response

```typescript
interface VoteResponse {
  score: number;
  userVote: 1 | -1 | null;
}
```

### Submission Create Response

```typescript
interface CreateSubmissionResponse {
  submission: SubmissionResponse;
  adminLink: string; // URL for edit/delete
}
```

### Stats Response

```typescript
interface StatsResponse {
  totalSubmissions: number;
  totalVotes: number;
  uniqueGpus: number;
  uniqueModels: number;
}
```

### Meta Response

```typescript
interface MetaResponse {
  models: Array<{ slug: string; count: number }>;
  gpus: Array<{ name: string; count: number }>;
  runtimes: Array<{ name: string; count: number }>;
  quantizations: Array<{ name: string; count: number }>;
  quantSources: Array<{ name: string; count: number }>;
}
```

## Import Paths

```typescript
// Schemas
import { createSubmissionSchema } from "@sharellama/model/schemas/submission";
import { createVoteSchema, type VoteValue } from "@sharellama/model/schemas/vote";
import { createCommentSchema, type CommentNode } from "@sharellama/model/schemas/comment";
import { listModelsQuerySchema, type Model } from "@sharellama/model/schemas/model";

// Core types
import { type Submission, type PaginatedResponse, type ApiError } from "@sharellama/model";
```
