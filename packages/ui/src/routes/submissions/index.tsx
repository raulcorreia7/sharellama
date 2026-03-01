import { Title } from "@solidjs/meta";
import { createSignal, createResource, For, Show, createEffect, on } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { api, type SubmissionFilters } from "../../lib/api";
import { SubmissionCard } from "../../components/SubmissionCard";
import { FilterSidebar, defaultFilters, type FilterState } from "../../components/FilterSidebar";
import { SearchBar } from "../../components/SearchBar";

function parseFiltersFromParams(params: Record<string, string | undefined>): FilterState {
  return {
    q: params.q ?? "",
    model: params.model ? params.model.split(",").filter(Boolean) : [],
    gpu: params.gpu ? params.gpu.split(",").filter(Boolean) : [],
    cpu: params.cpu ?? "",
    quantization: params.quantization ? params.quantization.split(",").filter(Boolean) : [],
    runtime: params.runtime ? params.runtime.split(",").filter(Boolean) : [],
    minTps: params.minTps ? parseFloat(params.minTps) : undefined,
    sort: (params.sort as FilterState["sort"]) ?? "createdAt",
    order: (params.order as FilterState["order"]) ?? "desc",
  };
}

function filtersToParams(filters: FilterState): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.q) params.q = filters.q;
  if (filters.model.length > 0) params.model = filters.model.join(",");
  if (filters.gpu.length > 0) params.gpu = filters.gpu.join(",");
  if (filters.cpu) params.cpu = filters.cpu;
  if (filters.quantization.length > 0) params.quantization = filters.quantization.join(",");
  if (filters.runtime.length > 0) params.runtime = filters.runtime.join(",");
  if (filters.minTps !== undefined) params.minTps = String(filters.minTps);
  if (filters.sort !== "createdAt") params.sort = filters.sort;
  if (filters.order !== "desc") params.order = filters.order;
  return params;
}

function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.q) count++;
  if (filters.model.length > 0) count++;
  if (filters.gpu.length > 0) count++;
  if (filters.cpu) count++;
  if (filters.quantization.length > 0) count++;
  if (filters.runtime.length > 0) count++;
  if (filters.minTps !== undefined) count++;
  return count;
}

export default function SubmissionsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = createSignal<FilterState>(
    parseFiltersFromParams(searchParams as Record<string, string | undefined>),
  );
  const [page, setPage] = createSignal(1);
  const [sidebarOpen, setSidebarOpen] = createSignal(false);

  const [meta] = createResource(() => api.getSubmissionsMeta());

  const apiFilters = (): SubmissionFilters => ({
    ...filters(),
    page: page(),
    limit: 20,
  });

  const [submissions] = createResource(apiFilters, (f) => api.getSubmissions(f));

  createEffect(
    on(
      filters,
      (f) => {
        const params = filtersToParams(f);
        setSearchParams(params, { replace: true });
        setPage(1);
      },
      { defer: true },
    ),
  );

  const handleFiltersChange = (newFilters: FilterState) => setFilters(newFilters);
  const handleSearchChange = (q: string) => setFilters((prev) => ({ ...prev, q }));

  const removeFilter = (type: keyof FilterState, value?: string) => {
    setFilters((prev) => {
      const updated = { ...prev };
      if (type === "model" || type === "gpu" || type === "quantization" || type === "runtime") {
        updated[type] = value ? prev[type].filter((v) => v !== value) : [];
      } else if (type === "minTps") {
        updated.minTps = undefined;
      } else if (type === "q" || type === "cpu") {
        updated[type] = "";
      }
      return updated;
    });
  };

  const clearAllFilters = () => {
    setFilters({ ...defaultFilters, sort: filters().sort, order: filters().order });
  };

  const canGoBack = () => page() > 1;
  const canGoForward = () =>
    !submissions.loading && submissions() && page() < submissions()!.pagination.totalPages;
  const activeFilterCount = () => countActiveFilters(filters());

  return (
    <main class="ll-page max-w-7xl">
      <Title>Submissions - ShareLlama</Title>

      <nav class="mb-8 flex items-center gap-2 text-sm">
        <a href="/" class="ll-nav-link">
          Home
        </a>
        <span class="text-[color:var(--text-dim)]">/</span>
        <span class="font-medium text-[color:var(--text)]">Submissions</span>
      </nav>

      <header class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-display text-2xl font-bold">Submissions</h1>
          <p class="text-sm text-[color:var(--text-muted)]">
            Community benchmarks and configurations
          </p>
        </div>
        <a href="/submit" class="ll-btn ll-btn-primary ll-btn-sm">
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Submit
        </a>
      </header>

      <div class="mb-4 flex items-center gap-4 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          class="ll-btn ll-btn-secondary ll-btn-sm"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
          <Show when={activeFilterCount() > 0}>
            <span class="ll-chip">{activeFilterCount()}</span>
          </Show>
        </button>
      </div>

      <div class="flex gap-6">
        <FilterSidebar
          filters={filters()}
          onChange={handleFiltersChange}
          meta={meta() ?? null}
          isOpen={sidebarOpen()}
          onClose={() => setSidebarOpen(false)}
        />

        <div class="flex-1">
          <div class="mb-4">
            <SearchBar
              value={filters().q}
              onChange={handleSearchChange}
              placeholder="Search by title, description, or model..."
            />
          </div>

          <Show when={activeFilterCount() > 0}>
            <div class="mb-4 flex flex-wrap items-center gap-2">
              <span class="text-sm text-[color:var(--text-muted)]">Filters:</span>
              <For each={filters().model}>
                {(m) => (
                  <button type="button" onClick={() => removeFilter("model", m)} class="ll-chip">
                    Model: {m}
                    <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </For>
              <For each={filters().gpu}>
                {(g) => (
                  <button type="button" onClick={() => removeFilter("gpu", g)} class="ll-chip">
                    GPU: {g}
                    <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </For>
              <Show when={filters().cpu}>
                <button type="button" onClick={() => removeFilter("cpu")} class="ll-chip">
                  CPU: {filters().cpu}
                  <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
              </Show>
              <For each={filters().quantization}>
                {(q) => (
                  <button
                    type="button"
                    onClick={() => removeFilter("quantization", q)}
                    class="ll-chip"
                  >
                    Quant: {q}
                    <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </For>
              <For each={filters().runtime}>
                {(r) => (
                  <button type="button" onClick={() => removeFilter("runtime", r)} class="ll-chip">
                    Runtime: {r}
                    <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </For>
              <Show when={filters().minTps !== undefined}>
                <button type="button" onClick={() => removeFilter("minTps")} class="ll-chip">
                  Min tok/s: {filters().minTps}
                  <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
              </Show>
              <button
                type="button"
                onClick={clearAllFilters}
                class="text-sm text-[color:var(--accent-text)] hover:underline"
              >
                Clear all
              </button>
            </div>
          </Show>

          <Show when={submissions.loading}>
            <div class="py-12 text-center text-[color:var(--text-muted)]">Loading...</div>
          </Show>

          <Show when={submissions.error}>
            <div class="ll-card border-red-500/50 bg-red-500/10 p-4 text-red-400">
              Error loading submissions: {submissions.error?.message}
            </div>
          </Show>

          <Show when={!submissions.loading && submissions()}>
            <div class="mb-4 text-sm text-[color:var(--text-muted)]">
              {submissions()!.pagination.total} submission
              {submissions()!.pagination.total !== 1 ? "s" : ""}
            </div>

            <Show when={submissions()!.data.length === 0}>
              <div class="ll-card p-8 text-center">
                <p class="text-[color:var(--text-muted)]">
                  No submissions found matching your criteria.
                </p>
                <button type="button" onClick={clearAllFilters} class="ll-btn ll-btn-ghost mt-2">
                  Clear all filters
                </button>
              </div>
            </Show>

            <div class="stagger-in grid gap-4 sm:grid-cols-2">
              <For each={submissions()!.data}>
                {(submission) => <SubmissionCard submission={submission} />}
              </For>
            </div>

            <Show when={submissions()!.pagination.totalPages > 1}>
              <nav class="mt-8 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!canGoBack()}
                  class="ll-btn ll-btn-secondary ll-btn-sm disabled:opacity-50"
                >
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <span class="text-mono text-sm text-[color:var(--text-muted)]">
                  {page()} / {submissions()!.pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!canGoForward()}
                  class="ll-btn ll-btn-secondary ll-btn-sm disabled:opacity-50"
                >
                  Next
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </nav>
            </Show>
          </Show>
        </div>
      </div>
    </main>
  );
}
