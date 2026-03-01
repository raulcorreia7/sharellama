import { Title } from "@solidjs/meta";
import { A, useNavigate } from "@solidjs/router";
import { createResource, For, Show, createSignal, onMount, type JSX } from "solid-js";
import { api } from "../lib/api";
import { SubmissionCard } from "../components/SubmissionCard";
import { HeroMesh } from "../components/HeroMesh";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { animateCountUp, formatNumber } from "../lib/animations";

const POPULAR_MODELS = ["Llama 3.1", "Mistral", "Qwen"];

export default function Index() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = createSignal("");
  const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

  const [stats] = createResource(() => api.getStats());
  const [featured] = createResource(() =>
    api.getSubmissions({ sort: "score", order: "desc", limit: 6 }),
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
    <div class="min-h-screen">
      <Title>ShareLlama - Find the best llama.cpp configuration for your hardware</Title>

      <header class="relative z-10 mx-auto max-w-6xl px-4 py-6">
        <nav class="flex items-center justify-between">
          <A href="/" class="flex items-center gap-2 text-xl font-bold">
            <span class="text-2xl">🦙</span>
            <span>ShareLlama</span>
          </A>
          <div class="flex items-center gap-4">
            <A href="/submissions" class="ll-nav-link">
              Browse
            </A>
            <A href="/submit" class="ll-btn ll-btn-primary ll-btn-sm">
              Submit
            </A>
          </div>
        </nav>
      </header>

      <section class="hero-section relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <HeroMesh />

        <div class="hero-content flex flex-col items-center gap-8 lg:flex-row lg:gap-16">
          <div class="flex-1 text-center lg:text-left">
            <h1 class="mb-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              <span class="text-5xl sm:text-6xl lg:text-7xl">🦙</span>
              <br class="sm:hidden" />
              <span class="text-gradient">ShareLlama</span>
            </h1>
            <p class="mb-2 text-lg text-[color:var(--text-secondary)] sm:text-xl">
              Find the best llama.cpp configuration for your hardware
            </p>
            <p class="text-sm text-[color:var(--text-muted)] sm:text-base">
              Community-driven benchmarks and optimizations
            </p>
          </div>

          <div class="w-full max-w-md flex-1">
            <form onSubmit={handleSearch} class="flex gap-2">
              <input
                type="text"
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
                placeholder="Search configurations, GPUs, models..."
                class="ll-input flex-1 px-4 py-3 text-base"
              />
              <button type="submit" class="ll-btn ll-btn-primary px-6 py-3">
                Search
              </button>
            </form>

            <div class="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start">
              <For each={POPULAR_MODELS}>
                {(model) => (
                  <A href={`/submissions?model=${encodeURIComponent(model)}`} class="home-pill">
                    {model}
                  </A>
                )}
              </For>
            </div>
          </div>
        </div>
      </section>

      <section class="mx-auto max-w-4xl px-4 py-8">
        <Show when={stats()}>
          <StatsGrid stats={stats()!} />
        </Show>
        <Show when={stats.loading}>
          <div class="stagger-in grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        </Show>
      </section>

      <section class="mx-auto max-w-4xl px-4 py-8">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-2xl font-semibold tracking-tight">Featured Configurations</h2>
          <A href="/submissions?sort=score" class="ll-btn ll-btn-ghost ll-btn-sm">
            View all
            <svg
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </A>
        </div>

        <Show when={featured.loading}>
          <div class="py-8 text-center text-[color:var(--text-muted)]">Loading...</div>
        </Show>

        <Show when={featured.error}>
          <div class="ll-card border-red-500/50 bg-red-500/10 p-4 text-red-400">
            Error loading configurations
          </div>
        </Show>

        <Show when={!featured.loading && featured()}>
          <Show when={featured()!.data.length === 0}>
            <div class="ll-card p-8 text-center">
              <p class="text-[color:var(--text-muted)]">
                No configurations yet. Be the first to submit one!
              </p>
              <A href="/submit" class="ll-btn ll-btn-primary mt-4">
                Submit Configuration
              </A>
            </div>
          </Show>

          <Show when={featured()!.data.length > 0}>
            <div class="stagger-in grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <For each={featured()!.data}>
                {(submission) => <SubmissionCard submission={submission} />}
              </For>
            </div>
          </Show>
        </Show>
      </section>

      <section class="mx-auto max-w-4xl px-4 py-12">
        <div class="ll-card p-6">
          <h2 class="mb-4 text-xl font-semibold tracking-tight">Quick Links</h2>
          <div class="grid gap-4 sm:grid-cols-3">
            <QuickLink
              href="/detect"
              title="Hardware Detection"
              description="Detect your GPU and CPU specs automatically"
              icon={
                <svg
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
                  />
                </svg>
              }
            />
            <QuickLink
              href="/submissions"
              title="Browse All"
              description="Explore all community benchmarks"
              icon={
                <svg
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                  />
                </svg>
              }
            />
            <QuickLink
              href="https://github.com/locallama/locallama"
              title="GitHub"
              description="Contribute or report issues"
              external
              icon={
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fill-rule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clip-rule="evenodd"
                  />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      <footer class="relative z-10 mt-12 border-t border-[color:var(--border)] bg-[color:var(--bg-secondary)]">
        <div class="mx-auto max-w-4xl px-4 py-8">
          <div class="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div class="flex items-center gap-2 text-[color:var(--text-muted)]">
              <span>🦙</span>
              <span class="font-semibold">ShareLlama</span>
            </div>
            <ThemeSwitcher />
            <nav class="flex flex-wrap justify-center gap-6 text-sm text-[color:var(--text-muted)]">
              <A href="/detect" class="ll-nav-link">
                About
              </A>
              <a
                href={`${apiBaseUrl}/submissions?limit=1`}
                target="_blank"
                rel="noopener noreferrer"
                class="ll-nav-link"
              >
                API
              </a>
              <a href="https://github.com/sharellama/sharellama" class="ll-nav-link">
                GitHub
              </a>
            </nav>
          </div>
          <div class="mt-6 flex flex-col items-center justify-between gap-4 border-t border-[color:var(--border)] pt-4 sm:flex-row">
            <p class="text-sm text-[color:var(--text-muted)]">MIT License</p>
            <Show when={stats()}>
              <p class="text-xs text-[color:var(--text-muted)]">
                {stats()!.totalSubmissions} configurations | {stats()!.uniqueModels} models |{" "}
                {stats()!.uniqueGpus} GPUs
              </p>
            </Show>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatsGrid(props: {
  stats: { totalSubmissions: number; totalVotes: number; uniqueGpus: number; uniqueModels: number };
}) {
  let containerRef: HTMLDivElement | undefined;

  onMount(() => {
    if (containerRef) {
      const counters = containerRef.querySelectorAll<HTMLElement>("[data-count]");
      counters.forEach((el, index) => {
        const end = parseInt(el.dataset.count || "0", 10);
        setTimeout(() => {
          animateCountUp(el, 0, end, 800);
        }, index * 100);
      });
    }
  });

  return (
    <div ref={containerRef} class="stagger-in grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard label="Configurations" value={props.stats.totalSubmissions} />
      <StatCard label="Total Votes" value={props.stats.totalVotes} />
      <StatCard label="Unique GPUs" value={props.stats.uniqueGpus} />
      <StatCard label="Models" value={props.stats.uniqueModels} />
    </div>
  );
}

function StatCard(props: { label: string; value: number }) {
  return (
    <div class="ll-card ll-card-hover p-4 text-center">
      <div class="stat-value" data-count={props.value}>
        {formatNumber(props.value)}
      </div>
      <div class="stat-label">{props.label}</div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div class="ll-card p-4 text-center">
      <div class="mx-auto h-8 w-16 animate-pulse rounded bg-[color:var(--surface-high)]" />
      <div class="mx-auto mt-2 h-4 w-20 animate-pulse rounded bg-[color:var(--surface-high)]" />
    </div>
  );
}

function QuickLink(props: {
  href: string;
  title: string;
  description: string;
  icon?: JSX.Element;
  external?: boolean;
}) {
  const content = (
    <>
      <div class="flex items-center gap-3">
        <span class="text-[color:var(--accent)]">{props.icon}</span>
        <span class="text-display font-semibold">{props.title}</span>
        {props.external && (
          <svg
            class="h-4 w-4 text-[color:var(--text-dim)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        )}
      </div>
      <p class="mt-1 text-sm text-[color:var(--text-muted)]">{props.description}</p>
    </>
  );

  if (props.external) {
    return (
      <a
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        class="rounded-lg p-3 transition-all hover:bg-[color:var(--surface-high)]"
      >
        {content}
      </a>
    );
  }

  return (
    <A href={props.href} class="rounded-lg p-3 transition-all hover:bg-[color:var(--surface-high)]">
      {content}
    </A>
  );
}
