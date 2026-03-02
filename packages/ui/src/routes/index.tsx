import { Title } from "@solidjs/meta";
import { A, useNavigate } from "@solidjs/router";
import { For, Show, createSignal, createResource } from "solid-js";
import { api, DEFAULT_SUBMISSIONS } from "../lib/api";
import { useResourceWithDefault } from "../lib/useResourceWithDefault";
import { SubmissionCard } from "../components/SubmissionCard";
import { HeroMesh } from "../components/HeroMesh";
import { SearchBar } from "../components/SearchBar";
import { Button } from "../components/display/Button";
import { Layout } from "../components/layout";
import { Section } from "../components/layout/Section";
import { ChevronRight, Plus, LayoutGrid, TrendingUp, ArrowRight, Heart } from "../components/icons";
import { formatModelName, getTrendingModels, formatDownloads } from "../lib/huggingface";

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

          <div class="hero-actions">
            <A href="/submissions" class="btn btn--primary btn--lg">
              <LayoutGrid size={18} />
              Browse Configurations
            </A>
            <A href="/submit" class="btn btn--outline btn--lg">
              <Plus size={18} />
              Submit Your Config
            </A>
          </div>

          <form onSubmit={handleSearch} class="hero-search-form">
            <SearchBar
              value={searchQuery()}
              onChange={setSearchQuery}
              placeholder="Search by model, GPU, or hardware..."
              debounceMs={300}
              showSuggestions={true}
            />
            <Button type="submit" variant="primary">
              Search
            </Button>
          </form>
        </div>
      </section>

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
              <p class="text-muted mb-4">No configurations yet. Be the first to share yours!</p>
              <A href="/submit" class="btn btn--primary">
                <Plus size={16} />
                Submit Configuration
              </A>
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

      <Section>
        <div class="section-header">
          <h2 class="section-heading section-heading--with-icon">
            <TrendingUp size={20} />
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
            <p class="text-muted" style={{ padding: "2rem 0", "text-align": "center" }}>
              No rated configurations yet.
            </p>
          </Show>

          <Show when={topSubmissions()!.data.length > 0}>
            <div
              class="stagger-in featured-grid"
              style={{ "grid-template-columns": "repeat(auto-fill, minmax(280px, 1fr))" }}
            >
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
                <A href={`/models/${model.id}`} class="card card--hover popular-model-card">
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
        <div class="cta-banner">
          <div class="cta-content">
            <h3 class="cta-title">Have a configuration to share?</h3>
            <p class="cta-description">
              Help the community by sharing your llama.cpp benchmarks and settings.
            </p>
          </div>
          <A href="/submit" class="btn btn--primary btn--lg">
            <Plus size={18} />
            Submit Your Config
          </A>
        </div>
      </Section>
    </Layout>
  );
}
