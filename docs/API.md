# API Reference

Base URL: `https://api.sharellama.io` (production) or `http://localhost:8787` (development)

All endpoints return JSON. Error responses follow this format:

```json
{
  "error": "Error type",
  "message": "Detailed message (optional)"
}
```

## Authentication

Most read endpoints are public. Write operations require:

- `X-Fingerprint`: Browser fingerprint (SHA-256 hashed server-side for anonymity)
- `X-Turnstile-Token`: Cloudflare Turnstile token (for submission/comment creation)

## Rate Limits

| Action  | Limit       | Window |
| ------- | ----------- | ------ |
| Submit  | 5 requests  | 1 hour |
| Comment | 10 requests | 1 hour |
| Vote    | 50 requests | 1 hour |

Rate limit headers:

- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Seconds until window resets

---

## Health

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Models

### GET /models

List models with pagination.

**Query Parameters:**

| Parameter | Type   | Default     | Description                         |
| --------- | ------ | ----------- | ----------------------------------- |
| q         | string | -           | Search by model name                |
| sort      | string | configCount | Sort field (configCount, createdAt) |
| order     | string | desc        | Sort order (asc, desc)              |
| page      | number | 1           | Page number                         |
| limit     | number | 20          | Items per page (max 100)            |

**Response:**

```json
{
  "data": [
    {
      "slug": "meta-llama/Llama-3-8B",
      "name": "Llama-3-8B",
      "org": "meta-llama",
      "configCount": 42,
      "lastValidated": null,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### GET /models/search

Search Hugging Face models (proxied).

**Query Parameters:**

| Parameter | Type   | Default | Description                |
| --------- | ------ | ------- | -------------------------- |
| q         | string | -       | Search query (min 2 chars) |
| limit     | number | 10      | Max results (max 20)       |

**Response:**

```json
{
  "data": [
    {
      "id": "654321",
      "modelId": "meta-llama/Llama-3-8B",
      "author": "meta-llama",
      "downloads": 500000,
      "likes": 1200,
      "pipeline_tag": "text-generation",
      "library_name": "transformers"
    }
  ]
}
```

### GET /models/:slug

Get model details with configurations.

**Query Parameters:**

| Parameter    | Type   | Default | Description                                    |
| ------------ | ------ | ------- | ---------------------------------------------- |
| gpu          | string | -       | Filter by GPU (partial match)                  |
| quantization | string | -       | Filter by quantization                         |
| quantSource  | string | -       | Filter by quantization source                  |
| sort         | string | score   | Sort field (score, createdAt, tokensPerSecond) |
| page         | number | 1       | Page number                                    |
| limit        | number | 20      | Items per page (max 100)                       |

**Response:**

```json
{
  "data": {
    "slug": "meta-llama/Llama-3-8B",
    "name": "Llama-3-8B",
    "org": "meta-llama",
    "configCount": 42,
    "lastValidated": null,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "configurations": [...],
  "pagination": {...}
}
```

---

## Submissions

### GET /submissions

List submissions with filtering and pagination.

**Query Parameters:**

| Parameter    | Type   | Default   | Description                                    |
| ------------ | ------ | --------- | ---------------------------------------------- |
| q            | string | -         | Search title/description                       |
| page         | number | 1         | Page number                                    |
| limit        | number | 20        | Items per page (max 100)                       |
| sort         | string | createdAt | Sort field (score, createdAt, tokensPerSecond) |
| order        | string | desc      | Sort order (asc, desc)                         |
| modelSlug    | string | -         | Filter by model slug                           |
| gpu          | string | -         | Filter by GPU (partial match)                  |
| cpu          | string | -         | Filter by CPU (partial match)                  |
| quantization | string | -         | Filter by quantization                         |
| runtime      | string | -         | Filter by runtime                              |
| quantSource  | string | -         | Filter by quantization source                  |
| vramMin      | number | -         | Min VRAM (GB)                                  |
| vramMax      | number | -         | Max VRAM (GB)                                  |
| ramMin       | number | -         | Min RAM (GB)                                   |
| ramMax       | number | -         | Max RAM (GB)                                   |
| minTps       | number | -         | Min tokens/second                              |
| maxTps       | number | -         | Max tokens/second                              |

**Response:**

```json
{
  "data": [
    {
      "id": 123,
      "authorHash": "a1b2c3d4...",
      "title": "RTX 4090 Config",
      "description": "Optimized for speed",
      "cpu": null,
      "gpu": "NVIDIA RTX 4090",
      "ramGb": 64,
      "vramGb": 24,
      "runtime": "llama.cpp",
      "runtimeVersion": "b2670",
      "modelSlug": "meta-llama/Llama-3-8B",
      "quantization": "Q4_K_M",
      "quantSource": null,
      "quantUrl": null,
      "contextLength": 8192,
      "command": "./llama-cli -m model.gguf -p ...",
      "inferenceParams": {},
      "temperature": 0.7,
      "topP": 0.9,
      "topK": 40,
      "minP": 0.05,
      "repeatPenalty": 1.1,
      "mirostat": 0,
      "mirostatTau": null,
      "mirostatEta": null,
      "seed": null,
      "tokensPerSecond": 85.5,
      "latencyMs": 120,
      "memoryMb": 6144,
      "tags": ["fast", "gaming"],
      "score": 15,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "userVote": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "totalPages": 25
  }
}
```

### GET /submissions/stats

Get platform statistics.

**Response:**

```json
{
  "totalSubmissions": 1234,
  "totalVotes": 5678,
  "uniqueGpus": 45,
  "uniqueModels": 120
}
```

### GET /submissions/meta

Get filter metadata (unique values for filters).

**Response:**

```json
{
  "models": [{ "slug": "meta-llama/Llama-3-8B", "count": 42 }],
  "gpus": [{ "name": "NVIDIA RTX 4090", "count": 15 }],
  "runtimes": [{ "name": "llama.cpp", "count": 100 }],
  "quantizations": [{ "name": "Q4_K_M", "count": 50 }],
  "quantSources": [{ "name": "TheBloke", "count": 30 }]
}
```

### GET /submissions/:id

Get single submission.

**Headers:**

- `X-Fingerprint` (optional): Returns `userVote` field

**Response:**

```json
{
  "data": {
    "id": 123,
    "authorHash": "a1b2c3d4...",
    "title": "RTX 4090 Config",
    ...
    "userVote": 1
  }
}
```

### POST /submissions

Create a new submission.

**Headers:**

- `X-Fingerprint`: Required
- `X-Turnstile-Token`: Required

**Request Body:**

```json
{
  "title": "RTX 4090 Config",
  "description": "Optimized for speed",
  "cpu": "AMD Ryzen 9 7950X",
  "gpu": "NVIDIA RTX 4090",
  "ramGb": 64,
  "vramGb": 24,
  "runtime": "llama.cpp",
  "runtimeVersion": "b2670",
  "modelSlug": "meta-llama/Llama-3-8B",
  "quantization": "Q4_K_M",
  "quantSource": "TheBloke",
  "quantUrl": "https://huggingface.co/...",
  "contextLength": 8192,
  "command": "./llama-cli -m model.gguf",
  "inferenceParams": { "threads": 8 },
  "temperature": 0.7,
  "topP": 0.9,
  "topK": 40,
  "minP": 0.05,
  "repeatPenalty": 1.1,
  "mirostat": 0,
  "mirostatTau": 5.0,
  "mirostatEta": 0.1,
  "seed": 42,
  "tokensPerSecond": 85.5,
  "latencyMs": 120,
  "memoryMb": 6144,
  "tags": ["fast", "gaming"]
}
```

**Response (201):**

```json
{
  "submission": {...},
  "adminLink": "https://sharellama.io/submissions/123/admin/abc123token"
}
```

### PATCH /submissions/:id/admin/:token

Update submission (requires admin token from creation).

**Request Body:** Partial submission object (cannot change `modelSlug`)

**Response:**

```json
{
  "data": {...}
}
```

### DELETE /submissions/:id/admin/:token

Delete submission (requires admin token).

**Response:** 204 No Content

---

## Votes

### POST /submissions/:id/vote

Vote on a submission.

**Headers:**

- `X-Fingerprint`: Required

**Request Body:**

```json
{
  "value": 1
}
```

`value`: `1` (upvote) or `-1` (downvote)

**Behavior:**

- Same vote: removes vote
- Different vote: updates vote
- No vote: creates vote

**Response:**

```json
{
  "score": 16,
  "userVote": 1
}
```

### GET /submissions/:id/vote

Get current user's vote on a submission.

**Headers:**

- `X-Fingerprint`: Required

**Response:**

```json
{
  "value": 1
}
```

---

## Comments

### GET /submissions/:id/comments

List comments for a submission.

**Query Parameters:**

| Parameter | Type   | Default | Description                   |
| --------- | ------ | ------- | ----------------------------- |
| include   | string | flat    | `flat` (list) or `all` (tree) |

**Response (flat):**

```json
{
  "data": [
    {
      "id": 1,
      "submissionId": 123,
      "authorHash": "a1b2",
      "parentId": null,
      "body": "Great config!",
      "score": 5,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Response (tree with `include=all`):**

```json
{
  "data": [
    {
      "id": 1,
      "submissionId": 123,
      "authorHash": "a1b2",
      "parentId": null,
      "body": "Great config!",
      "score": 5,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "replies": [
        {
          "id": 2,
          "parentId": 1,
          "body": "Thanks!",
          ...
        }
      ]
    }
  ]
}
```

### POST /submissions/:id/comments

Create a comment.

**Headers:**

- `X-Fingerprint`: Required
- `X-Turnstile-Token`: Required

**Request Body:**

```json
{
  "body": "Great config! Works well on my setup.",
  "parentId": 1
}
```

`parentId` is optional for replies.

**Response (201):**

```json
{
  "data": {...}
}
```

### POST /comments/:id/vote

Vote on a comment.

**Headers:**

- `X-Fingerprint`: Required

**Request Body:**

```json
{
  "value": 1
}
```

### DELETE /comments/:id

Soft-delete a comment (author only).

**Headers:**

- `X-Fingerprint`: Required

**Response:**

```json
{
  "data": {
    "id": 1,
    "body": "[deleted]",
    ...
  }
}
```

---

## Hugging Face Proxy

### GET /hf/trending

Get trending models from Hugging Face.

**Response:**

```json
{
  "models": [
    {
      "id": "meta-llama/Llama-3-8B",
      "downloads": 500000,
      "likes": 1200,
      "pipeline_tag": "text-generation"
    }
  ],
  "source": "trending"
}
```

### GET /hf/top-liked

Fallback endpoint for most-liked models.

### GET /hf/models/:slug

Get model details from Hugging Face.

**Response:**

```json
{
  "data": {
    "id": "meta-llama/Llama-3-8B",
    "modelId": "Llama-3-8B",
    "author": "meta-llama",
    "downloads": 500000,
    "likes": 1200,
    "pipeline_tag": "text-generation",
    "library_name": "transformers",
    "tags": ["transformers", "safetensors", "llama"]
  }
}
```

### GET /hf/models/:slug/quantizations

Find quantization repos for a model.

**Response:**

```json
{
  "data": [
    {
      "id": "TheBloke/Llama-3-8B-GGUF",
      "provider": "TheBloke",
      "downloads": 100000,
      "likes": 500,
      "quantType": "GGUF",
      "url": "https://huggingface.co/TheBloke/Llama-3-8B-GGUF"
    }
  ]
}
```

### GET /hf/repos/:repoId/files

List GGUF files in a quantization repo.

**Response:**

```json
{
  "repo": {
    "id": "TheBloke/Llama-3-8B-GGUF",
    "downloads": 100000,
    "likes": 500
  },
  "files": [
    {
      "name": "Q4_K_M",
      "filename": "llama-3-8b.Q4_K_M.gguf",
      "sizeBytes": 4980000000,
      "url": "https://huggingface.co/TheBloke/Llama-3-8B-GGUF/resolve/main/llama-3-8b.Q4_K_M.gguf"
    }
  ]
}
```
