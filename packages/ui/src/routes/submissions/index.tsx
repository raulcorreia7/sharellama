import { Title } from "@solidjs/meta";
import { createSignal, For, Show, createEffect, on } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { api, type SubmissionFilters, DEFAULT_META, DEFAULT_SUBMISSIONS } from "../../lib/api";
import { useResourceWithDefault } from "../../lib/useResourceWithDefault";
import { SubmissionCard } from "../../components/SubmissionCard";
import { FilterSidebar, defaultFilters, type FilterState } from "../../components/FilterSidebar";
import { SearchBar } from "../../components/SearchBar";
import { Layout, Breadcrumbs, PageHeader, EmptyState, LoadingState } from "../../components/layout";
import { Button } from "../../components/display/Button";
import { Plus, Filter, ChevronLeft, ChevronRight, X } from "../../components/icons";

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

  const meta = useResourceWithDefault(() => api.getSubmissionsMeta(), DEFAULT_META);

  const apiFilters = (): SubmissionFilters => ({
    ...filters(),
    page: page(),
    limit: 20,
  });

  const submissions = useResourceWithDefault(
    apiFilters,
    (f) => api.getSubmissions(f),
    DEFAULT_SUBMISSIONS,
  );

  const stats = useResourceWithDefault(() => api.getStats(), {
    totalSubmissions: 0,
    totalVotes: 0,
    uniqueGpus: 0,
    uniqueModels: 0,
  });

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
      <Title>ShareLlama - Submissions</Title>

      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Submissions" }]} />

      <PageHeader
        title="Submissions"
        description="Community benchmarks and configurations"
        actions={
          <a href="/submit" class="btn btn--primary btn--sm">
            <Plus size={14} />
            Submit
          </a>
        }
      />

      <div class="filter-toggle lg:hidden" style={{ "margin-bottom": "1rem" }}>
        <Button type="button" onClick={() => setSidebarOpen(true)} variant="secondary" size="sm">
          <Filter size={14} />
          Filters
          <Show when={activeFilterCount() > 0}>
            <span class="tag">{activeFilterCount()}</span>
          </Show>
        </Button>
      </div>

      <div class="submissions-layout">
        <FilterSidebar
          filters={filters()}
          onChange={handleFiltersChange}
          meta={meta() ?? null}
          isOpen={sidebarOpen()}
          onClose={() => setSidebarOpen(false)}
        />

        <div class="submissions-main">
          <div style={{ "margin-bottom": "1rem" }}>
            <SearchBar
              value={filters().q}
              onChange={handleSearchChange}
              placeholder="Search by title, description, or model..."
              showSuggestions={true}
            />
          </div>

          <Show when={activeFilterCount() > 0}>
            <div class="active-filters" style={{ "margin-bottom": "1rem" }}>
              <span class="text-muted" style={{ "font-size": "0.875rem" }}>
                Filters:
              </span>
              <For each={filters().model}>
                {(m) => (
                  <button
                    type="button"
                    onClick={() => removeFilter("model", m)}
                    class="tag tag--removable"
                  >
                    Model: {m}
                    <X size={12} />
                  </button>
                )}
              </For>
              <For each={filters().gpu}>
                {(g) => (
                  <button
                    type="button"
                    onClick={() => removeFilter("gpu", g)}
                    class="tag tag--removable"
                  >
                    GPU: {g}
                    <X size={12} />
                  </button>
                )}
              </For>
              <Show when={filters().cpu}>
                <button
                  type="button"
                  onClick={() => removeFilter("cpu")}
                  class="tag tag--removable"
                >
                  CPU: {filters().cpu}
                  <X size={12} />
                </button>
              </Show>
              <For each={filters().quantization}>
                {(q) => (
                  <button
                    type="button"
                    onClick={() => removeFilter("quantization", q)}
                    class="tag tag--removable"
                  >
                    Quant: {q}
                    <X size={12} />
                  </button>
                )}
              </For>
              <For each={filters().runtime}>
                {(r) => (
                  <button
                    type="button"
                    onClick={() => removeFilter("runtime", r)}
                    class="tag tag--removable"
                  >
                    Runtime: {r}
                    <X size={12} />
                  </button>
                )}
              </For>
              <Show when={filters().minTps !== undefined}>
                <button
                  type="button"
                  onClick={() => removeFilter("minTps")}
                  class="tag tag--removable"
                >
                  Min tok/s: {filters().minTps}
                  <X size={12} />
                </button>
              </Show>
              <button type="button" onClick={clearAllFilters} class="link">
                Clear all
              </button>
            </div>
          </Show>

          <Show when={submissions.loading}>
            <LoadingState />
          </Show>

          <Show when={!submissions.loading && submissions()}>
            <div class="text-muted" style={{ "font-size": "0.875rem", "margin-bottom": "1rem" }}>
              {submissions()!.pagination.total} submission
              {submissions()!.pagination.total !== 1 ? "s" : ""}
            </div>

            <Show when={submissions()!.data.length === 0}>
              <EmptyState
                message="No submissions found matching your criteria."
                action={
                  <Button type="button" onClick={clearAllFilters} variant="ghost">
                    Clear all filters
                  </Button>
                }
              />
            </Show>

            <div class="stagger-in submissions-grid">
              <For each={submissions()!.data}>
                {(submission) => <SubmissionCard submission={submission} />}
              </For>
            </div>

            <Show when={submissions()!.pagination.totalPages > 1}>
              <nav class="pagination">
                <Button
                  type="button"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!canGoBack()}
                  variant="secondary"
                  size="sm"
                >
                  <ChevronLeft size={14} />
                  Previous
                </Button>
                <span class="font-mono" style={{ "font-size": "0.875rem" }}>
                  {page()} / {submissions()!.pagination.totalPages}
                </span>
                <Button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!canGoForward()}
                  variant="secondary"
                  size="sm"
                >
                  Next
                  <ChevronRight size={14} />
                </Button>
              </nav>
            </Show>
          </Show>
        </div>
      </div>
    </Layout>
  );
}
