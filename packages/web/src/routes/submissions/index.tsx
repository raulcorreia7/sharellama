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
    parseFiltersFromParams(searchParams as Record<string, string | undefined>)
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
    on(filters, (f) => {
      const params = filtersToParams(f);
      setSearchParams(params, { replace: true });
      setPage(1);
    }, { defer: true })
  );

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleSearchChange = (q: string) => {
    setFilters((prev) => ({ ...prev, q }));
  };

  const removeFilter = (type: keyof FilterState, value?: string) => {
    setFilters((prev) => {
      const updated = { ...prev };
      if (type === "model" || type === "gpu" || type === "quantization" || type === "runtime") {
        if (value) {
          updated[type] = prev[type].filter((v) => v !== value);
        } else {
          updated[type] = [];
        }
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
    !submissions.loading &&
    submissions() &&
    page() < submissions()!.pagination.totalPages;

  const activeFilterCount = () => countActiveFilters(filters());

  return (
    <main class="mx-auto max-w-7xl px-4 py-8">
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

      <div class="mb-4 flex items-center gap-4 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          class="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          <Show when={activeFilterCount() > 0}>
            <span class="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
              {activeFilterCount()}
            </span>
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
              <span class="text-sm text-gray-500 dark:text-gray-400">Active filters:</span>
              <For each={filters().model}>
                {(m) => (
                  <button
                    type="button"
                    onClick={() => removeFilter("model", m)}
                    class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                  >
                    Model: {m}
                    <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </button>
                )}
              </For>
              <For each={filters().gpu}>
                {(g) => (
                  <button
                    type="button"
                    onClick={() => removeFilter("gpu", g)}
                    class="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
                  >
                    GPU: {g}
                    <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </button>
                )}
              </For>
              <Show when={filters().cpu}>
                <button
                  type="button"
                  onClick={() => removeFilter("cpu")}
                  class="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800"
                >
                  CPU: {filters().cpu}
                  <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </Show>
              <For each={filters().quantization}>
                {(q) => (
                  <button
                    type="button"
                    onClick={() => removeFilter("quantization", q)}
                    class="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:hover:bg-yellow-800"
                  >
                    Quant: {q}
                    <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </button>
                )}
              </For>
              <For each={filters().runtime}>
                {(r) => (
                  <button
                    type="button"
                    onClick={() => removeFilter("runtime", r)}
                    class="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:hover:bg-orange-800"
                  >
                    Runtime: {r}
                    <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </button>
                )}
              </For>
              <Show when={filters().minTps !== undefined}>
                <button
                  type="button"
                  onClick={() => removeFilter("minTps")}
                  class="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
                >
                  Min tok/s: {filters().minTps}
                  <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </Show>
              <button
                type="button"
                onClick={clearAllFilters}
                class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Clear all
              </button>
            </div>
          </Show>

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
              {submissions()!.pagination.total} submission{submissions()!.pagination.total !== 1 ? "s" : ""}
            </div>

            <Show when={submissions()!.data.length === 0}>
              <div class="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <p class="text-gray-600 dark:text-gray-400">No submissions found matching your criteria.</p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  class="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Clear all filters
                </button>
              </div>
            </Show>

            <div class="grid gap-4 sm:grid-cols-2">
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
                  class="rounded border border-gray-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
                >
                  Previous
                </button>
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  Page {page()} of {submissions()!.pagination.totalPages}
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
        </div>
      </div>
    </main>
  );
}
