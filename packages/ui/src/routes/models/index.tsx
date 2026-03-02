import { createEffect, createResource, createSignal, For, onMount, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";

import type { HFModelResult } from "@sharellama/model";

import { ChevronRight, LayoutGrid } from "../../components/icons";
import {
  Breadcrumbs,
  EmptyState,
  Layout,
  LoadingState,
  PageHeader,
  Section,
} from "../../components/layout";
import { SearchBar } from "../../components/SearchBar";
import { api } from "../../lib/api";

function timeAgo(dateString: string | null): string {
  if (!dateString) return "never";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function ImportModal(props: { isOpen: boolean; onClose: () => void; onImport: () => void }) {
  const [searchQuery, setSearchQuery] = createSignal("");
  const [searchResults, setSearchResults] = createSignal<HFModelResult[]>([]);
  const [isSearching, setIsSearching] = createSignal(false);
  const [isImporting, setIsImporting] = createSignal(false);
  const [importUrl, setImportUrl] = createSignal("");
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  let searchTimeout: ReturnType<typeof setTimeout>;

  createEffect(() => {
    const query = searchQuery();
    clearTimeout(searchTimeout);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    searchTimeout = setTimeout(async () => {
      try {
        const results = await api.searchModels(query);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  });

  const handleImportModel = async (slug: string) => {
    setIsImporting(true);
    setErrorMessage(null);
    try {
      await api.ensureModel(slug);
      setSuccessMessage(`Imported ${slug}`);
      props.onImport();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch {
      setErrorMessage(`Failed to import ${slug}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportByUrl = async () => {
    const url = importUrl().trim();
    if (!url) return;

    let slug = url;
    if (url.startsWith("https://huggingface.co/")) {
      slug = url.replace("https://huggingface.co/", "").split("/")[0] + "/" + url.split("/")[1];
    } else if (!url.includes("/")) {
      setErrorMessage("Please enter a full model slug (e.g., org/model-name) or URL");
      return;
    }

    await handleImportModel(slug);
    if (!errorMessage()) {
      setImportUrl("");
    }
  };

  const handleImportTop100 = async () => {
    setIsImporting(true);
    setErrorMessage(null);
    try {
      const result = await api.populateModels({ limit: 100 });
      setSuccessMessage(`Imported ${result.added} new models, updated ${result.updated}`);
      props.onImport();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch {
      setErrorMessage("Failed to import models");
    } finally {
      setIsImporting(false);
    }
  };

  if (!props.isOpen) return null;

  return (
    <div
      class="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div class="modal" style={{ "max-width": "600px", width: "100%" }}>
        <div class="modal__header">
          <h2>Import Models</h2>
          <button class="btn btn--ghost" onClick={props.onClose}>
            ×
          </button>
        </div>

        <div class="modal__body">
          <Show when={successMessage()}>
            <div class="alert alert--success" style={{ "margin-bottom": "1rem" }}>
              {successMessage()}
            </div>
          </Show>

          <Show when={errorMessage()}>
            <div class="alert alert--error" style={{ "margin-bottom": "1rem" }}>
              {errorMessage()}
            </div>
          </Show>

          <div style={{ "margin-bottom": "1.5rem" }}>
            <label class="label">Search HuggingFace</label>
            <SearchBar
              value={searchQuery()}
              onChange={setSearchQuery}
              placeholder="Search for models..."
              debounceMs={300}
              showSuggestions={false}
            />
            <Show when={isSearching()}>
              <p class="text-muted" style={{ "margin-top": "0.5rem" }}>
                Searching...
              </p>
            </Show>
            <Show when={!isSearching() && searchResults().length > 0}>
              <div style={{ "margin-top": "0.5rem", "max-height": "200px", overflow: "auto" }}>
                <For each={searchResults()}>
                  {(model) => (
                    <div
                      style={{
                        display: "flex",
                        "justify-content": "space-between",
                        "align-items": "center",
                        padding: "0.5rem",
                        "border-bottom": "1px solid var(--border-color)",
                      }}
                    >
                      <div>
                        <strong>{model.modelId}</strong>
                        <span class="text-muted" style={{ "margin-left": "0.5rem" }}>
                          {model.downloads?.toLocaleString() ?? 0} downloads
                        </span>
                      </div>
                      <button
                        class="btn btn--ghost btn--sm"
                        onClick={() => handleImportModel(model.id)}
                        disabled={isImporting()}
                      >
                        Import
                      </button>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>

          <div style={{ "margin-bottom": "1.5rem" }}>
            <label class="label">Import by URL or Slug</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                class="input"
                placeholder="e.g., meta-llama/Llama-3.2-3B or https://huggingface.co/..."
                value={importUrl()}
                onInput={(e) => setImportUrl(e.currentTarget.value)}
                disabled={isImporting()}
              />
              <button
                class="btn btn--primary"
                onClick={handleImportByUrl}
                disabled={isImporting() || !importUrl().trim()}
              >
                Import
              </button>
            </div>
          </div>

          <div
            style={{
              padding: "1rem",
              "background-color": "var(--bg-secondary)",
              "border-radius": "var(--radius)",
            }}
          >
            <p style={{ margin: "0 0 0.75rem", "font-size": "0.875rem" }}>
              Import the top 100 most downloaded models from HuggingFace
            </p>
            <button
              class="btn btn--secondary"
              onClick={handleImportTop100}
              disabled={isImporting()}
              style={{ width: "100%" }}
            >
              <Show when={isImporting()} fallback="Import Top 100 Models">
                Importing...
              </Show>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModelsList() {
  const [searchQuery, setSearchQuery] = createSignal("");
  const [sort, setSort] = createSignal<"configCount" | "createdAt">("configCount");
  const [page, setPage] = createSignal(1);
  const [showImportModal, setShowImportModal] = createSignal(false);

  const [modelsResource, { refetch: refetchModels }] = createResource(
    () => ({
      q: searchQuery(),
      sort: sort(),
      order: "desc" as const,
      page: page(),
      limit: 30,
    }),
    (params) => api.getModels(params),
  );

  const [statusResource, { refetch: refetchStatus }] = createResource(() =>
    api.getPopulateStatus(),
  );

  const models = () => modelsResource()?.data ?? [];
  const pagination = () => modelsResource()?.pagination;
  const loading = () => modelsResource.loading;
  const status = () => statusResource();
  const isStale = () => status()?.isStale ?? true;
  const lastRun = () => status()?.lastRun ?? null;
  const modelCount = () => pagination()?.total ?? 0;

  onMount(() => {
    if (isStale()) {
      api.triggerPopulate().catch(() => {});
    }
  });

  createEffect(() => {
    if (isStale()) {
      api.triggerPopulate().catch(() => {});
    }
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleImport = () => {
    refetchModels();
    refetchStatus();
  };

  const handleRefresh = async () => {
    try {
      await api.triggerPopulate();
      refetchModels();
      refetchStatus();
    } catch {
      console.error("Failed to refresh models");
    }
  };

  return (
    <Layout>
      <Title>ShareLlama - Browse Models</Title>

      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Models" }]} />

      <PageHeader
        title="Browse Models"
        description="Discover and explore models with community-submitted configurations"
        actions={
          <div style={{ display: "flex", gap: "0.5rem", "align-items": "center" }}>
            <select
              value={sort()}
              onChange={(e) => {
                setSort(e.currentTarget.value as "configCount" | "createdAt");
                setPage(1);
              }}
              class="input"
              style={{ width: "auto" }}
            >
              <option value="configCount">Most Configurations</option>
              <option value="createdAt">Recently Added</option>
            </select>
          </div>
        }
      />

      <Section>
        <div style={{ "margin-bottom": "1.5rem" }}>
          <SearchBar
            value={searchQuery()}
            onChange={handleSearch}
            placeholder="Search models..."
            debounceMs={300}
            showSuggestions={false}
          />
        </div>

        <Show when={loading()}>
          <LoadingState />
        </Show>

        <Show when={!loading() && models().length === 0}>
          <EmptyState
            message={
              searchQuery() ? "No models match your search." : "No models have been added yet."
            }
            action={
              !searchQuery() ? (
                <div style={{ display: "flex", gap: "0.5rem", "flex-direction": "column" }}>
                  <button class="btn btn--primary" onClick={() => setShowImportModal(true)}>
                    Import from HuggingFace
                  </button>
                  <A href="/submit" class="btn btn--secondary">
                    Submit Configuration
                  </A>
                </div>
              ) : undefined
            }
          />
        </Show>

        <Show when={!loading() && models().length > 0}>
          <div
            style={{
              display: "grid",
              gap: "1rem",
              "grid-template-columns": "repeat(auto-fill, minmax(300px, 1fr))",
            }}
          >
            <For each={models()}>
              {(model) => (
                <A
                  href={`/models/${model.slug}`}
                  class="card card--hover"
                  style={{ padding: "1.25rem", "text-decoration": "none" }}
                >
                  <div style={{ "margin-bottom": "0.5rem" }}>
                    <h3 style={{ "font-size": "1rem", "font-weight": "600", margin: 0 }}>
                      {model.name || model.slug.split("/").pop()}
                    </h3>
                    <Show when={model.org && model.org !== model.name}>
                      <p
                        class="text-muted"
                        style={{ "font-size": "0.875rem", margin: "0.25rem 0 0" }}
                      >
                        by {model.org}
                      </p>
                    </Show>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      "align-items": "center",
                      gap: "0.75rem",
                      "margin-top": "0.75rem",
                    }}
                  >
                    <span class="tag">
                      <LayoutGrid size={14} />
                      {model.configCount} {model.configCount === 1 ? "config" : "configs"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      "justify-content": "flex-end",
                      "margin-top": "0.5rem",
                    }}
                  >
                    <ChevronRight size={16} class="text-muted" />
                  </div>
                </A>
              )}
            </For>
          </div>

          <Show when={pagination() && pagination()!.totalPages > 1}>
            <div class="pagination">
              <button
                class="btn btn--ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page() === 1}
              >
                Previous
              </button>
              <span class="text-muted">
                Page {page()} of {pagination()!.totalPages}
              </span>
              <button
                class="btn btn--ghost"
                onClick={() => setPage((p) => Math.min(pagination()!.totalPages, p + 1))}
                disabled={page() === pagination()!.totalPages}
              >
                Next
              </button>
            </div>
          </Show>
        </Show>

        <div
          style={{
            "margin-top": "1.5rem",
            padding: "0.75rem 0",
            "border-top": "1px solid var(--border-color)",
            display: "flex",
            "justify-content": "space-between",
            "align-items": "center",
            "flex-wrap": "wrap",
            gap: "0.5rem",
          }}
        >
          <span class="text-muted" style={{ "font-size": "0.875rem" }}>
            {modelCount()} models • Updated {timeAgo(lastRun())}
          </span>
          <div style={{ display: "flex", gap: "0.5rem", "align-items": "center" }}>
            <Show when={isStale()}>
              <button class="btn btn--ghost btn--sm" onClick={handleRefresh}>
                Refresh to get latest models
              </button>
            </Show>
            <button class="btn btn--ghost btn--sm" onClick={() => setShowImportModal(true)}>
              Import Models
            </button>
          </div>
        </div>
      </Section>

      <ImportModal
        isOpen={showImportModal()}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />
    </Layout>
  );
}
