import { Title } from "@solidjs/meta";
import { createResource, createSignal, Show, Suspense, onMount, type JSX } from "solid-js";
import { useParams } from "@solidjs/router";
import { api } from "../../lib/api";
import { generateFingerprint } from "../../lib/fingerprint";
import { VoteButtons } from "../../components/VoteButtons";
import { CommentThread } from "../../components/CommentThread";

function CopyButton(props: { text: string }) {
  const [copied, setCopied] = createSignal(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(props.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      class={`ll-btn ll-btn-sm ${copied() ? "ll-btn-primary" : "ll-btn-secondary"}`}
    >
      <Show when={copied()} fallback="Copy">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Copied
      </Show>
    </button>
  );
}

function Section(props: { title: string; children: JSX.Element }) {
  return (
    <section class="ll-card p-4">
      <h3 class="text-display mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        {props.title}
      </h3>
      {props.children}
    </section>
  );
}

function Field(props: { label: string; value: string | number | null }) {
  return (
    <Show when={props.value !== null && props.value !== undefined}>
      <div class="flex items-center justify-between py-1.5">
        <span class="text-sm text-[color:var(--text-muted)]">{props.label}</span>
        <span class="text-mono text-sm font-medium">{props.value}</span>
      </div>
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

  const [submission] = createResource(id, (i) => api.getSubmission(i));

  return (
    <main class="ll-page max-w-4xl">
      <Title>
        <Suspense>{submission()?.title ?? "Loading..."}</Suspense> - ShareLlama
      </Title>

      <nav class="mb-8 flex items-center gap-2 text-sm">
        <a href="/" class="ll-nav-link">
          Home
        </a>
        <span class="text-[color:var(--text-dim)]">/</span>
        <a href="/submissions" class="ll-nav-link">
          Submissions
        </a>
        <span class="text-[color:var(--text-dim)]">/</span>
        <span class="font-medium text-[color:var(--text)]">Details</span>
      </nav>

      <Show when={submission.loading}>
        <div class="py-12 text-center text-[color:var(--text-muted)]">Loading...</div>
      </Show>

      <Show when={submission.error}>
        <div class="ll-card border-red-500/50 bg-red-500/10 p-4 text-red-400">
          Error: {submission.error?.message}
        </div>
      </Show>

      <Show when={submission()}>
        {(s) => (
          <>
            <header class="mb-6">
              <h1 class="text-display mb-3 text-2xl font-bold sm:text-3xl">{s().title}</h1>
              <div class="flex flex-wrap items-center gap-3 text-sm">
                <span class="ll-chip">
                  {s().runtime}
                  {s().runtimeVersion && ` ${s().runtimeVersion}`}
                </span>
                <span class="text-[color:var(--text-muted)]">
                  Submitted {timeAgo(s().createdAt)}
                </span>
                <span class="text-mono font-medium text-[color:var(--accent-text)]">
                  Score: {s().score}
                </span>
              </div>
            </header>

            <div class="mb-6">
              <Show
                when={fingerprint()}
                fallback={
                  <div class="text-sm text-[color:var(--text-muted)]">Loading vote controls...</div>
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
              <p class="mb-6 text-[color:var(--text)]">{s().description}</p>
            </Show>

            <div class="mb-6 grid gap-4 md:grid-cols-2">
              <Section title="Hardware">
                <Field label="CPU" value={s().cpu} />
                <Field label="GPU" value={s().gpu} />
                <Field label="RAM" value={s().ramGb ? `${s().ramGb} GB` : null} />
              </Section>

              <Section title="Model">
                <Field label="Name" value={s().modelName} />
                <Field label="Quantization" value={s().quantization} />
                <Field label="Context Length" value={s().contextLength} />
              </Section>

              <Section title="Runtime">
                <Field label="Runtime" value={s().runtime} />
                <Field label="Version" value={s().runtimeVersion} />
              </Section>

              <Section title="Performance">
                <Field
                  label="Tokens/sec"
                  value={s().tokensPerSecond != null ? `${s().tokensPerSecond!.toFixed(2)}` : null}
                />
                <Field label="Latency" value={s().latencyMs ? `${s().latencyMs} ms` : null} />
                <Field label="Memory" value={s().memoryMb ? `${s().memoryMb} MB` : null} />
              </Section>

              <Section title="Sampling">
                <Field label="Temperature" value={s().temperature} />
                <Field label="Top P" value={s().topP} />
                <Field label="Top K" value={s().topK} />
                <Field label="Min P" value={s().minP} />
                <Field label="Repeat Penalty" value={s().repeatPenalty} />
                <Field label="Mirostat" value={s().mirostat} />
                <Field label="Mirostat Tau" value={s().mirostatTau} />
                <Field label="Mirostat Eta" value={s().mirostatEta} />
                <Field label="Seed" value={s().seed} />
              </Section>

              <Show when={s().command}>
                <Section title="Command">
                  <div class="flex items-start justify-between gap-3">
                    <code class="ll-textarea text-mono flex-1 overflow-x-auto text-sm">
                      {s().command}
                    </code>
                    <CopyButton text={s().command!} />
                  </div>
                </Section>
              </Show>

              <Show when={s().tags && s().tags.length > 0}>
                <Section title="Tags">
                  <div class="flex flex-wrap gap-2">
                    {s().tags.map((tag) => (
                      <span class="ll-chip">{tag}</span>
                    ))}
                  </div>
                </Section>
              </Show>
            </div>

            <Show
              when={fingerprint()}
              fallback={
                <section class="mt-8">
                  <p class="text-[color:var(--text-muted)]">Loading comments...</p>
                </section>
              }
            >
              <CommentThread submissionId={s().id} fingerprint={fingerprint()} />
            </Show>
          </>
        )}
      </Show>
    </main>
  );
}
