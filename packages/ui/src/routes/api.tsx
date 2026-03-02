import { Title } from "@solidjs/meta";
import { For, Show } from "solid-js";
import { Layout, Breadcrumbs, PageHeader, Section } from "../components/layout";
import { CopyButton } from "../components/forms";
import { CodeBlock } from "../components/display";
import { api, DEFAULT_STATS } from "../lib/api";
import { useResourceWithDefault } from "../lib/useResourceWithDefault";
import { getUiConfig } from "../lib/config";

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  curl: string;
  requiresAuth?: boolean;
}

function getEndpoints(apiBase: string): Endpoint[] {
  return [
    {
      method: "GET",
      path: "/submissions",
      description: "List submissions with optional filters",
      curl: `curl "${apiBase}/submissions?limit=5&sort=score&order=desc"`,
    },
    {
      method: "GET",
      path: "/submissions/:id",
      description: "Get a single submission by ID",
      curl: `curl "${apiBase}/submissions/123"`,
    },
    {
      method: "POST",
      path: "/submissions",
      description: "Create a new submission",
      requiresAuth: true,
      curl: `curl -X POST "${apiBase}/submissions" \\
  -H "Content-Type: application/json" \\
  -H "X-Turnstile-Token: <token>" \\
  -H "X-Fingerprint: <fingerprint>" \\
  -d '{
    "title": "My Benchmark",
    "runtime": "llama.cpp",
    "runtimeVersion": "b1234",
    "modelSlug": "meta-llama/Llama-3-8B",
    "quantization": "Q4_K_M",
    "tokensPerSecond": 45.2
  }'`,
    },
    {
      method: "GET",
      path: "/submissions/stats",
      description: "Get aggregate statistics",
      curl: `curl "${apiBase}/submissions/stats"`,
    },
    {
      method: "GET",
      path: "/submissions/meta",
      description: "Get filter metadata (models, GPUs, runtimes)",
      curl: `curl "${apiBase}/submissions/meta"`,
    },
    {
      method: "POST",
      path: "/submissions/:id/votes",
      description: "Vote on a submission",
      requiresAuth: true,
      curl: `curl -X POST "${apiBase}/submissions/123/votes" \\
  -H "Content-Type: application/json" \\
  -H "X-Fingerprint: <fingerprint>" \\
  -d '{"value": 1}'`,
    },
    {
      method: "GET",
      path: "/submissions/:id/comments",
      description: "Get comments for a submission",
      curl: `curl "${apiBase}/submissions/123/comments"`,
    },
    {
      method: "POST",
      path: "/submissions/:id/comments",
      description: "Add a comment to a submission",
      requiresAuth: true,
      curl: `curl -X POST "${apiBase}/submissions/123/comments" \\
  -H "Content-Type: application/json" \\
  -H "X-Turnstile-Token: <token>" \\
  -H "X-Fingerprint: <fingerprint>" \\
  -d '{"content": "Great benchmark!"}'`,
    },
    {
      method: "PATCH",
      path: "/submissions/:id/admin/:token",
      description: "Update a submission (requires admin token)",
      curl: `curl -X PATCH "${apiBase}/submissions/123/admin/<token>" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Updated Title"}'`,
    },
    {
      method: "DELETE",
      path: "/submissions/:id/admin/:token",
      description: "Delete a submission (requires admin token)",
      curl: `curl -X DELETE "${apiBase}/submissions/123/admin/<token>"`,
    },
  ];
}

function MethodBadge(props: { method: string }) {
  const methodClass = `api-method api-method--${props.method.toLowerCase()}`;
  return <span class={methodClass}>{props.method}</span>;
}

function EndpointCard(props: { endpoint: Endpoint }) {
  return (
    <div class="card">
      <div class="submit-grid submit-grid--2col">
        <div class="submit-grid" style={{ "grid-template-columns": "auto 1fr" }}>
          <MethodBadge method={props.endpoint.method} />
          <code class="api-path">{props.endpoint.path}</code>
        </div>
        <Show when={props.endpoint.requiresAuth}>
          <span class="tag" style={{ "justify-self": "end" }}>
            Auth
          </span>
        </Show>
      </div>
      <p class="text-muted">{props.endpoint.description}</p>
      <div class="api-code-wrapper">
        <CodeBlock code={props.endpoint.curl} />
        <div class="api-code-copy">
          <CopyButton text={props.endpoint.curl} />
        </div>
      </div>
    </div>
  );
}

export default function ApiDocs() {
  const stats = useResourceWithDefault(() => api.getStats(), DEFAULT_STATS);
  const apiBase = getUiConfig().api.url;
  const endpoints = getEndpoints(apiBase);

  const footerStats = () => {
    if (stats.loading || !stats()) return undefined;
    return {
      totalSubmissions: stats()!.totalSubmissions,
      uniqueModels: stats()!.uniqueModels,
      uniqueGpus: stats()!.uniqueGpus,
    };
  };

  return (
    <Layout stats={footerStats()}>
      <Title>API Documentation - ShareLlama</Title>

      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "API" }]} />

      <PageHeader
        title="API Documentation"
        description={`REST API for ShareLlama. Base URL: ${apiBase}`}
      />

      <Section card title="Authentication">
        <div class="submit-grid">
          <div>
            <h3 class="font-medium" style={{ "margin-bottom": "0.25rem" }}>
              X-Turnstile-Token
            </h3>
            <p class="text-muted" style={{ "font-size": "0.875rem" }}>
              Cloudflare Turnstile token for bot protection. Required for POST requests that create
              content.
            </p>
          </div>
          <div>
            <h3 class="font-medium" style={{ "margin-bottom": "0.25rem" }}>
              X-Fingerprint
            </h3>
            <p class="text-muted" style={{ "font-size": "0.875rem" }}>
              Browser fingerprint for rate limiting and vote tracking. Generate client-side or use
              any unique identifier.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Endpoints">
        <div
          class="stagger-in"
          style={{ display: "flex", "flex-direction": "column", gap: "1rem" }}
        >
          <For each={endpoints}>{(endpoint) => <EndpointCard endpoint={endpoint} />}</For>
        </div>
      </Section>

      <Section card title="Query Parameters">
        <table class="table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Type</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-mono">limit</td>
              <td>number</td>
              <td class="text-muted">Results per page (default: 20)</td>
            </tr>
            <tr>
              <td class="font-mono">page</td>
              <td>number</td>
              <td class="text-muted">Page number (default: 1)</td>
            </tr>
            <tr>
              <td class="font-mono">sort</td>
              <td>string</td>
              <td class="text-muted">Sort field: createdAt, score, tokensPerSecond</td>
            </tr>
            <tr>
              <td class="font-mono">order</td>
              <td>string</td>
              <td class="text-muted">Sort order: asc, desc</td>
            </tr>
            <tr>
              <td class="font-mono">q</td>
              <td>string</td>
              <td class="text-muted">Search query</td>
            </tr>
            <tr>
              <td class="font-mono">modelSlug</td>
              <td>string</td>
              <td class="text-muted">Filter by model slug (e.g., meta-llama/Llama-3-8B)</td>
            </tr>
            <tr>
              <td class="font-mono">gpu</td>
              <td>string</td>
              <td class="text-muted">Filter by GPU</td>
            </tr>
            <tr>
              <td class="font-mono">minTps</td>
              <td>number</td>
              <td class="text-muted">Minimum tokens per second</td>
            </tr>
          </tbody>
        </table>
      </Section>
    </Layout>
  );
}
