import { createResource, createSignal, For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { A, useNavigate } from "@solidjs/router";

import { Button } from "../components/display/Button";
import { HeroMesh } from "../components/HeroMesh";
import { ArrowRight, ChevronRight, Heart, LayoutGrid, TrendingUp } from "../components/icons";
import { Layout } from "../components/layout";
import { Section } from "../components/layout/Section";
import { SearchBar } from "../components/SearchBar";
import { SubmissionCard } from "../components/SubmissionCard";
import { api, DEFAULT_SUBMISSIONS } from "../lib/api";
import { formatDownloads, formatModelName, getTrendingModels } from "../lib/huggingface";
import { markModelNavigationTransition } from "../lib/modelNavigation";
import { useResourceWithDefault } from "../lib/useResourceWithDefault";

export default function Index() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = createSignal("");

  const recentSubmissions = useResourceWithDefault(
    () => api.getSubmissions({ sort: "createdAt", order: "desc", limit: 8 }),
    DEFAULT_SUBMISSIONS,
  );

  const topSubmissions = useResourceWithDefault(
    () => api.getSubmissions({ sort: "score", order: "desc", limit: 4 }),
    DEFAULT_SUBMISSIONS,
  );

  const [trendingModels] = createResource(() => getTrendingModels(12));

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
    <Layout>
      <Title>ShareLlama - Share and discover llama.cpp configurations</Title>

      <section class="hero">
        <HeroMesh />
        <div class="hero-content">
          <h1 class="hero-title">
            <span class="hero-emoji">🦙</span>
            <span class="text-gradient">ShareLlama</span>
          </h1>
          <p class="hero-subtitle">Share and discover optimal llama.cpp configurations</p>
          <p class="hero-description">Community-driven benchmarks for local LLM inference</p>

          <form onSubmit={handleSearch} class="hero-search-form">
            <SearchBar
              value={searchQuery()}
              onChange={setSearchQuery}
              placeholder="Search by model, GPU, or hardware..."
              debounceMs={300}
              showSuggestions={true}
            />
            <Button type="submit" variant="primary" size="lg">
              Search
            </Button>
          </form>
        </div>
      </section>

      <Section>
        <div class="section-header">
          <h2 class="section-heading section-heading--with-icon">
            <TrendingUp size={20} />
            Trending on Hugging Face
          </h2>
          <A href="/models" class="btn btn--ghost btn--sm">
            View all
            <ChevronRight size={14} />
          </A>
        </div>

        <Show when={trendingModels.loading}>
          <div class="text-muted" style={{ padding: "2rem 0", "text-align": "center" }}>
            Loading trending models...
          </div>
        </Show>

        <Show when={!trendingModels.loading && trendingModels()}>
          <div class="popular-models-grid">
            <For each={trendingModels()!.slice(0, 6)}>
              {(model) => (
                <A
                  href={`/models/${model.id}`}
                  class="card card--hover popular-model-card"
                  onClick={markModelNavigationTransition}
                >
                  <div class="popular-model-header">
                    <Show when={model.authorAvatar}>
                      <img
                        src={model.authorAvatar}
                        alt={model.author}
                        class="popular-model-org-avatar"
                      />
                    </Show>
                    <span class="popular-model-name">{formatModelName(model.id)}</span>
                  </div>
                  <div class="popular-model-stats">
                    <span class="popular-model-stat">
                      {formatDownloads(model.downloads)} downloads
                    </span>
                    <Show when={model.likes > 0}>
                      <span class="popular-model-stat">
                        <Heart size={12} />
                        {formatDownloads(model.likes)}
                      </span>
                    </Show>
                  </div>
                  <ArrowRight size={18} class="popular-model-arrow" />
                </A>
              )}
            </For>
          </div>
        </Show>
      </Section>

      <Section>
        <div class="section-header">
          <h2 class="section-heading section-heading--with-icon">
            <Heart size={20} />
            Top Rated
          </h2>
          <A href="/submissions?sort=score" class="btn btn--ghost btn--sm">
            View all
            <ChevronRight size={14} />
          </A>
        </div>

        <Show when={topSubmissions.loading}>
          <div class="text-muted" style={{ padding: "2rem 0", "text-align": "center" }}>
            Loading configurations...
          </div>
        </Show>

        <Show when={!topSubmissions.loading && topSubmissions()}>
          <Show when={topSubmissions()!.data.length === 0}>
            <div class="card" style={{ padding: "2rem", "text-align": "center" }}>
              <p class="text-muted">No rated configurations yet. Check back soon!</p>
            </div>
          </Show>

          <Show when={topSubmissions()!.data.length > 0}>
            <div class="stagger-in featured-grid">
              <For each={topSubmissions()!.data}>
                {(submission) => <SubmissionCard submission={submission} />}
              </For>
            </div>
          </Show>
        </Show>
      </Section>

      <Section>
        <div class="section-header">
          <h2 class="section-heading section-heading--with-icon">
            <LayoutGrid size={20} />
            Recent Configurations
          </h2>
          <A href="/submissions?sort=createdAt" class="btn btn--ghost btn--sm">
            View all
            <ChevronRight size={14} />
          </A>
        </div>

        <Show when={recentSubmissions.loading}>
          <div class="text-muted" style={{ padding: "2rem 0", "text-align": "center" }}>
            Loading configurations...
          </div>
        </Show>

        <Show when={!recentSubmissions.loading && recentSubmissions()}>
          <Show when={recentSubmissions()!.data.length === 0}>
            <div class="card" style={{ padding: "2rem", "text-align": "center" }}>
              <p class="text-muted">No configurations yet. Check back soon!</p>
            </div>
          </Show>

          <Show when={recentSubmissions()!.data.length > 0}>
            <div class="stagger-in featured-grid">
              <For each={recentSubmissions()!.data}>
                {(submission) => <SubmissionCard submission={submission} />}
              </For>
            </div>
          </Show>
        </Show>
      </Section>
    </Layout>
  );
}
