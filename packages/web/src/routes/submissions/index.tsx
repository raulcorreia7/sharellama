import { Title } from "@solidjs/meta";
import { createSignal, createResource, For, Show } from "solid-js";
import { api } from "../../lib/api";
import { SubmissionCard } from "../../components/SubmissionCard";

export default function SubmissionsList() {
  const [page, setPage] = createSignal(1);
  const pageSize = 20;

  const [submissions] = createResource(page, (p) =>
    api.getSubmissions(p, pageSize)
  );

  const canGoBack = () => page() > 1;
  const canGoForward = () =>
    !submissions.loading &&
    submissions() &&
    page() < submissions()!.totalPages;

  return (
    <main class="mx-auto max-w-4xl px-4 py-8">
      <Title>Submissions - LocalLlama</Title>

      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Submissions
        </h1>
        <a
          href="/submit"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Submit Benchmark
        </a>
      </div>

      <Show when={submissions.loading}>
        <div class="py-12 text-center text-gray-500">Loading...</div>
      </Show>

      <Show when={submissions.error}>
        <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Error loading submissions: {submissions.error?.message}
        </div>
      </Show>

      <Show when={!submissions.loading && submissions()}>
        <div class="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {submissions()!.total} submission{submissions()!.total !== 1 ? "s" : ""}
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <For each={submissions()!.data}>
            {(submission) => <SubmissionCard submission={submission} />}
          </For>
        </div>

        <Show when={submissions()!.totalPages > 1}>
          <nav class="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={!canGoBack()}
              class="rounded border border-gray-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
            >
              Previous
            </button>
            <span class="text-sm text-gray-600 dark:text-gray-400">
              Page {page()} of {submissions()!.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!canGoForward()}
              class="rounded border border-gray-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
            >
              Next
            </button>
          </nav>
        </Show>
      </Show>
    </main>
  );
}
