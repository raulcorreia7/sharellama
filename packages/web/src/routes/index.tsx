import { Title } from "@solidjs/meta";
import { A, useNavigate } from "@solidjs/router";
import { createResource, For, Show, createSignal } from "solid-js";
import { api } from "../lib/api";
import { SubmissionCard } from "../components/SubmissionCard";

const POPULAR_MODELS = ["Llama 3.1", "Mistral", "Qwen"];

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export default function Index() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = createSignal("");

  const [stats] = createResource(() => api.getStats());
  const [featured] = createResource(() =>
    api.getSubmissions({ sort: "score", order: "desc", limit: 6 })
  );

  const handleSearch = (e: Event) => {
    e.preventDefault();
    const query = searchQuery().trim();
    if (query) {
      navigate(`/submissions?q=${encodeURIComponent(query)}`);
    } else {
      navigate("/submissions");
    }
  };

  return (
    <div class="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Title>LocalLlama - Find the best llama.cpp configuration for your hardware</Title>

      <header class="mx-auto max-w-6xl px-4 py-4">
        <nav class="flex items-center justify-between">
          <A href="/" class="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
            <span>🦙</span>
            <span>LocalLlama</span>
          </A>
          <div class="flex items-center gap-4">
            <A
              href="/submissions"
              class="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Browse
            </A>
            <A
              href="/submit"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Submit
            </A>
          </div>
        </nav>
      </header>

      <section class="mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
        <h1 class="mb-4 text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl">
          🦙 LocalLlama
        </h1>
        <p class="mb-2 text-xl text-gray-600 dark:text-gray-300">
          Find the best llama.cpp configuration for your hardware
        </p>
        <p class="mb-8 text-gray-500 dark:text-gray-400">
          Community-driven benchmarks and optimizations
        </p>

        <form onSubmit={handleSearch} class="mx-auto mb-6 max-w-xl">
          <div class="flex gap-2">
            <input
              type="text"
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              placeholder="Search configurations, GPUs, models..."
              class="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
            <button
              type="submit"
              class="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </form>

        <div class="flex flex-wrap justify-center gap-2">
          <For each={POPULAR_MODELS}>
            {(model) => (
              <A
                href={`/submissions?model=${encodeURIComponent(model)}`}
                class="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              >
                {model}
              </A>
            )}
          </For>
        </div>
      </section>

      <section class="mx-auto max-w-4xl px-4 py-8">
        <Show when={stats()}>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Configurations"
              value={formatNumber(stats()!.totalSubmissions)}
            />
            <StatCard label="Total Votes" value={formatNumber(stats()!.totalVotes)} />
            <StatCard label="Unique GPUs" value={formatNumber(stats()!.uniqueGpus)} />
            <StatCard label="Models" value={formatNumber(stats()!.uniqueModels)} />
          </div>
        </Show>
        <Show when={stats.loading}>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        </Show>
      </section>

      <section class="mx-auto max-w-4xl px-4 py-8">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
            Featured Configurations
          </h2>
          <A
            href="/submissions?sort=score"
            class="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            View all
          </A>
        </div>

        <Show when={featured.loading}>
          <div class="py-8 text-center text-gray-500">Loading...</div>
        </Show>

        <Show when={featured.error}>
          <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            Error loading configurations
          </div>
        </Show>

        <Show when={!featured.loading && featured()}>
          <Show when={featured()!.data.length === 0}>
            <div class="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
              <p class="text-gray-500 dark:text-gray-400">
                No configurations yet. Be the first to submit one!
              </p>
              <A
                href="/submit"
                class="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Submit Configuration
              </A>
            </div>
          </Show>

          <Show when={featured()!.data.length > 0}>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <For each={featured()!.data}>
                {(submission) => <SubmissionCard submission={submission} />}
              </For>
            </div>
          </Show>
        </Show>
      </section>

      <section class="mx-auto max-w-4xl px-4 py-12">
        <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Quick Links</h2>
          <div class="grid gap-4 sm:grid-cols-3">
            <QuickLink
              href="#"
              title="Hardware Detection"
              description="Detect your GPU and CPU specs automatically"
            />
            <QuickLink
              href="/submissions"
              title="How it Works"
              description="Learn about benchmarking methodology"
            />
            <QuickLink
              href="https://github.com/locallama/locallama"
              title="GitHub"
              description="Contribute or report issues"
              external
            />
          </div>
        </div>
      </section>

      <footer class="mt-12 border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
        <div class="mx-auto max-w-4xl px-4 py-8">
          <div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span>🦙</span>
              <span class="font-medium">LocalLlama</span>
            </div>
            <nav class="flex flex-wrap justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <A href="#" class="hover:text-gray-900 dark:hover:text-white">
                About
              </A>
              <A href="#" class="hover:text-gray-900 dark:hover:text-white">
                API
              </A>
              <a
                href="https://github.com/locallama/locallama"
                class="hover:text-gray-900 dark:hover:text-white"
              >
                GitHub
              </a>
            </nav>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              MIT License
            </p>
          </div>
          <Show when={stats()}>
            <p class="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
              {stats()!.totalSubmissions} configurations | {stats()!.uniqueModels} models |{" "}
              {stats()!.uniqueGpus} GPUs
            </p>
          </Show>
        </div>
      </footer>
    </div>
  );
}

function StatCard(props: { label: string; value: string }) {
  return (
    <div class="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-800">
      <div class="text-2xl font-bold text-gray-900 dark:text-white">{props.value}</div>
      <div class="text-sm text-gray-500 dark:text-gray-400">{props.label}</div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div class="animate-pulse rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-800">
      <div class="mx-auto h-7 w-16 rounded bg-gray-200 dark:bg-gray-700" />
      <div class="mx-auto mt-2 h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

function QuickLink(props: { href: string; title: string; description: string; external?: boolean }) {
  const linkProps = props.external ? { target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <A
      href={props.href}
      {...linkProps}
      class="group rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
    >
      <div class="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
        {props.title}
        {props.external && (
          <svg
            class="h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        )}
      </div>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{props.description}</p>
    </A>
  );
}
