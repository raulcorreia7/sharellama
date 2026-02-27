import { Title } from "@solidjs/meta";
import { createResource, Show, Suspense, type JSX } from "solid-js";
import { useParams } from "@solidjs/router";
import { api } from "../../lib/api";

function CopyButton(props: { text: string }) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(props.text);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
    >
      Copy
    </button>
  );
}

function Section(props: { title: string; children: JSX.Element }) {
  return (
    <section class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {props.title}
      </h3>
      {props.children}
    </section>
  );
}

function Field(props: { label: string; value: string | number | null }) {
  return (
    <Show when={props.value !== null && props.value !== undefined}>
      <div class="flex justify-between py-1">
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {props.label}
        </span>
        <span class="text-sm font-medium text-gray-900 dark:text-white">
          {props.value}
        </span>
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

  const [submission] = createResource(id, (i) => api.getSubmission(i));

  return (
    <main class="mx-auto max-w-4xl px-4 py-8">
      <Title>
        <Suspense>{submission()?.title ?? "Loading..."}</Suspense> -
        LocalLlama
      </Title>

      <Show when={submission.loading}>
        <div class="py-12 text-center text-gray-500">Loading...</div>
      </Show>

      <Show when={submission.error}>
        <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Error: {submission.error?.message}
        </div>
      </Show>

      <Show when={submission()}>
        {(s) => (
          <>
            <header class="mb-6">
              <h1 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                {s().title}
              </h1>
              <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span class="rounded bg-blue-100 px-2 py-0.5 font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {s().runtime}
                  {s().runtimeVersion && ` ${s().runtimeVersion}`}
                </span>
                <span>
                  Submitted {timeAgo(s().createdAt)}
                </span>
                <span class="font-medium text-gray-700 dark:text-gray-300">
                  Score: {s().score}
                </span>
              </div>
            </header>

            <div class="mb-6 flex gap-2">
              <button
                type="button"
                class="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Upvote"
              >
                ▲
              </button>
              <button
                type="button"
                class="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Downvote"
              >
                ▼
              </button>
            </div>

            <Show when={s().description}>
              <p class="mb-6 text-gray-700 dark:text-gray-300">
                {s().description}
              </p>
            </Show>

            <div class="grid gap-4 md:grid-cols-2">
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
                <Field label="Tokens/sec" value={s().tokensPerSecond != null ? s().tokensPerSecond!.toFixed(2) : null} />
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
                  <div class="flex items-start justify-between gap-2">
                    <code class="flex-1 overflow-x-auto rounded bg-gray-100 p-2 text-sm dark:bg-gray-800">
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
                      <span class="rounded bg-gray-100 px-2 py-1 text-sm dark:bg-gray-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                </Section>
              </Show>
            </div>

            <section class="mt-8">
              <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Comments
              </h2>
              <p class="text-gray-500 dark:text-gray-400">
                Comments coming soon...
              </p>
            </section>
          </>
        )}
      </Show>
    </main>
  );
}
