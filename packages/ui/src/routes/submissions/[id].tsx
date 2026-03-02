import { Title } from "@solidjs/meta";
import { createResource, createSignal, Show, Suspense, onMount, createMemo, For } from "solid-js";
import { useParams } from "@solidjs/router";
import { api, DEFAULT_STATS } from "../../lib/api";
import { useResourceWithDefault } from "../../lib/useResourceWithDefault";
import { generateFingerprint } from "../../lib/fingerprint";
import { getUiConfig } from "../../lib/config";
import { VoteButtons } from "../../components/VoteButtons";
import { CommentThread } from "../../components/CommentThread";
import {
  Layout,
  Breadcrumbs,
  PageHeader,
  Section,
  EmptyState,
  LoadingState,
} from "../../components/layout";
import { CopyButton } from "../../components/forms";
import { Button } from "../../components/display/Button";

interface FieldGroup {
  title: string;
  fields: { label: string; value: string | number | null; highlight?: boolean }[];
}

function FieldGroup(props: { group: FieldGroup }) {
  const hasContent = () => props.group.fields.some((f) => f.value !== null);

  return (
    <Show when={hasContent()}>
      <section class="card section">
        <h3 class="section-title">{props.group.title}</h3>
        <For each={props.group.fields.filter((f) => f.value !== null)}>
          {(field) => (
            <div class="detail-field">
              <span class="detail-label">{field.label}</span>
              <span class={`detail-value ${field.highlight ? "detail-value--highlight" : ""}`}>
                {field.value}
              </span>
            </div>
          )}
        </For>
      </section>
    </Show>
  );
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function SubmissionDetail() {
  const params = useParams();
  const id = () => Number(params.id);
  const [fingerprint, setFingerprint] = createSignal("");

  onMount(async () => {
    const fp = await generateFingerprint();
    setFingerprint(fp);
  });

  const submissionResource = createResource(id, (i) => api.getSubmission(i));
  const submission = submissionResource[0];
  const { refetch } = submissionResource[1];

  const stats = useResourceWithDefault(() => api.getStats(), DEFAULT_STATS);

  const apiCurl = createMemo(() => {
    const s = submission();
    if (!s) return "";
    return `curl "${getUiConfig().api.url}/submissions/${s.id}"`;
  });

  const fieldGroups = createMemo((): FieldGroup[] => {
    const s = submission();
    if (!s) return [];

    return [
      {
        title: "Hardware",
        fields: [
          { label: "CPU", value: s.cpu },
          { label: "GPU", value: s.gpu },
          { label: "RAM", value: s.ramGb ? `${s.ramGb} GB` : null },
          { label: "VRAM", value: s.vramGb ? `${s.vramGb} GB` : null },
        ],
      },
      {
        title: "Model",
        fields: [
          { label: "Model", value: s.modelSlug },
          { label: "Quantization", value: s.quantization },
          { label: "Quant Source", value: s.quantSource },
          { label: "Context Length", value: s.contextLength },
        ],
      },
      {
        title: "Performance",
        fields: [
          {
            label: "Tokens/sec",
            value: s.tokensPerSecond != null ? s.tokensPerSecond!.toFixed(2) : null,
            highlight: true,
          },
          { label: "Latency", value: s.latencyMs ? `${s.latencyMs} ms` : null },
          { label: "Memory", value: s.memoryMb ? `${s.memoryMb} MB` : null },
        ],
      },
      {
        title: "Sampling",
        fields: [
          { label: "Temperature", value: s.temperature },
          { label: "Top P", value: s.topP },
          { label: "Top K", value: s.topK },
          { label: "Min P", value: s.minP },
          { label: "Repeat Penalty", value: s.repeatPenalty },
          { label: "Mirostat", value: s.mirostat },
          { label: "Mirostat Tau", value: s.mirostatTau },
          { label: "Mirostat Eta", value: s.mirostatEta },
          { label: "Seed", value: s.seed },
        ],
      },
    ];
  });

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
      <Title>
        ShareLlama - <Suspense>{submission()?.title ?? "Loading..."}</Suspense>
      </Title>

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Submissions", href: "/submissions" },
          { label: "Details" },
        ]}
      />

      <Show when={submission.loading}>
        <LoadingState />
      </Show>

      <Show when={submission.error}>
        <EmptyState
          message="Unable to load this submission. It may have been removed or there's a connection issue."
          action={
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button type="button" onClick={() => refetch()} variant="secondary">
                Try Again
              </Button>
              <a href="/submissions">
                <Button type="button" variant="ghost">
                  Browse All
                </Button>
              </a>
            </div>
          }
        />
      </Show>

      <Show when={submission()}>
        {(s) => (
          <>
            <PageHeader
              title={s().title}
              actions={
                <div style={{ display: "flex", "align-items": "center", gap: "0.75rem" }}>
                  <span class="tag">
                    {s().runtime}
                    {s().runtimeVersion && ` ${s().runtimeVersion}`}
                  </span>
                  <span class="text-muted" style={{ "font-size": "0.875rem" }}>
                    Submitted {timeAgo(s().createdAt)}
                  </span>
                  <span class="font-mono" style={{ "font-weight": 500 }}>
                    Score: {s().score}
                  </span>
                </div>
              }
            />

            <div style={{ "margin-bottom": "1.5rem" }}>
              <Show
                when={fingerprint()}
                fallback={
                  <div class="text-muted" style={{ "font-size": "0.875rem" }}>
                    Loading vote controls...
                  </div>
                }
              >
                <VoteButtons
                  submissionId={s().id}
                  initialScore={s().score}
                  fingerprint={fingerprint()}
                />
              </Show>
            </div>

            <Show when={s().description}>
              <p style={{ "margin-bottom": "1.5rem" }}>{s().description}</p>
            </Show>

            <div
              class="stagger-in"
              style={{
                display: "grid",
                gap: "1rem",
                "grid-template-columns": "repeat(auto-fit, minmax(280px, 1fr))",
                "margin-bottom": "1.5rem",
              }}
            >
              <For each={fieldGroups()}>{(group) => <FieldGroup group={group} />}</For>
            </div>

            <Show when={s().command}>
              <Section
                card
                title="Command"
                headerAction={<CopyButton text={s().command!} label="Copy Command" />}
              >
                <pre class="section-code">{s().command}</pre>
              </Section>
            </Show>

            <Show when={s().tags && s().tags.length > 0}>
              <Section card title="Tags">
                <div class="submission-tags">
                  <For each={s().tags}>{(tag) => <span class="tag">{tag}</span>}</For>
                </div>
              </Section>
            </Show>

            <Section
              card
              title="API Access"
              headerAction={<CopyButton text={apiCurl()} label="Copy curl" />}
            >
              <pre class="section-code">{apiCurl()}</pre>
              <p class="section-hint">
                Fetch this submission programmatically. See{" "}
                <a href="/api" class="link">
                  API docs
                </a>{" "}
                for more endpoints.
              </p>
            </Section>

            <Show
              when={fingerprint()}
              fallback={
                <section style={{ "margin-top": "2rem" }}>
                  <p class="text-muted">Loading comments...</p>
                </section>
              }
            >
              <CommentThread submissionId={s().id} fingerprint={fingerprint()} />
            </Show>
          </>
        )}
      </Show>
    </Layout>
  );
}
