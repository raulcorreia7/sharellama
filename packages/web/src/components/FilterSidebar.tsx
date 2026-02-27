import { For, Show, createSignal } from "solid-js";

interface FilterMeta {
  models: Array<{ name: string; count: number }>;
  gpus: Array<{ name: string; count: number }>;
  runtimes: Array<{ name: string; count: number }>;
  quantizations: Array<{ name: string; count: number }>;
}

export interface FilterState {
  q: string;
  model: string[];
  gpu: string[];
  cpu: string;
  quantization: string[];
  runtime: string[];
  minTps: number | undefined;
  sort: "score" | "createdAt" | "tokensPerSecond";
  order: "asc" | "desc";
}

export const defaultFilters: FilterState = {
  q: "",
  model: [],
  gpu: [],
  cpu: "",
  quantization: [],
  runtime: [],
  minTps: undefined,
  sort: "createdAt",
  order: "desc",
};

interface FilterSidebarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  meta: FilterMeta | null;
  isOpen: boolean;
  onClose: () => void;
}

const sortOptions = [
  { value: "createdAt", label: "Newest" },
  { value: "score", label: "Top Rated" },
  { value: "tokensPerSecond", label: "Fastest" },
] as const;

export function FilterSidebar(props: FilterSidebarProps) {
  const [gpuSearch, setGpuSearch] = createSignal("");

  const activeFilterCount = () => {
    let count = 0;
    if (props.filters.q) count++;
    if (props.filters.model.length > 0) count++;
    if (props.filters.gpu.length > 0) count++;
    if (props.filters.cpu) count++;
    if (props.filters.quantization.length > 0) count++;
    if (props.filters.runtime.length > 0) count++;
    if (props.filters.minTps !== undefined) count++;
    return count;
  };

  const clearAll = () => {
    props.onChange({ ...defaultFilters, sort: props.filters.sort, order: props.filters.order });
  };

  const toggleArrayFilter = (key: "model" | "gpu" | "quantization" | "runtime", value: string) => {
    const current = props.filters[key];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    props.onChange({ ...props.filters, [key]: updated });
  };

  const filteredGpus = () => {
    const search = gpuSearch().toLowerCase();
    if (!search) return props.meta?.gpus ?? [];
    return (props.meta?.gpus ?? []).filter((g) => g.name.toLowerCase().includes(search));
  };

  const handleMinTpsChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const value = target.value ? parseFloat(target.value) : undefined;
    props.onChange({ ...props.filters, minTps: value && value > 0 ? value : undefined });
  };

  const handleSortChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const value = target.value as typeof props.filters.sort;
    props.onChange({ ...props.filters, sort: value });
  };

  const handleCpuChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    props.onChange({ ...props.filters, cpu: target.value });
  };

  return (
    <>
      <Show when={props.isOpen}>
        <div
          class="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={props.onClose}
        />
      </Show>

      <aside
        classList={{
          "fixed inset-y-0 left-0 z-50 w-72 transform bg-white shadow-xl transition-transform duration-300 dark:bg-gray-900 lg:static lg:z-auto lg:w-64 lg:transform-none lg:shadow-none": true,
          "translate-x-0": props.isOpen,
          "-translate-x-full lg:translate-x-0": !props.isOpen,
        }}
      >
        <div class="flex h-full flex-col">
          <div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700 lg:hidden">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
            <button
              type="button"
              onClick={props.onClose}
              class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-4">
            <div class="mb-4 flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filters
                <Show when={activeFilterCount() > 0}>
                  <span class="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {activeFilterCount()}
                  </span>
                </Show>
              </span>
              <Show when={activeFilterCount() > 0}>
                <button
                  type="button"
                  onClick={clearAll}
                  class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Clear all
                </button>
              </Show>
            </div>

            <div class="space-y-6">
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sort by
                </label>
                <select
                  value={props.filters.sort}
                  onChange={handleSortChange}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <For each={sortOptions}>
                    {(opt) => <option value={opt.value}>{opt.label}</option>}
                  </For>
                </select>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Model
                </label>
                <div class="max-h-48 space-y-2 overflow-y-auto rounded border border-gray-200 p-2 dark:border-gray-700">
                  <Show when={!props.meta?.models.length}>
                    <p class="text-sm text-gray-400">No models available</p>
                  </Show>
                  <For each={props.meta?.models ?? []}>
                    {(model) => (
                      <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={props.filters.model.includes(model.name)}
                          onChange={() => toggleArrayFilter("model", model.name)}
                          class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                        />
                        <span class="truncate">{model.name}</span>
                        <span class="ml-auto text-xs text-gray-400">({model.count})</span>
                      </label>
                    )}
                  </For>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  GPU
                </label>
                <input
                  type="text"
                  placeholder="Search GPUs..."
                  value={gpuSearch()}
                  onInput={(e) => setGpuSearch(e.currentTarget.value)}
                  class="mb-2 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
                <div class="max-h-48 space-y-2 overflow-y-auto rounded border border-gray-200 p-2 dark:border-gray-700">
                  <Show when={!filteredGpus().length}>
                    <p class="text-sm text-gray-400">No GPUs found</p>
                  </Show>
                  <For each={filteredGpus()}>
                    {(gpu) => (
                      <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={props.filters.gpu.includes(gpu.name)}
                          onChange={() => toggleArrayFilter("gpu", gpu.name)}
                          class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                        />
                        <span class="truncate">{gpu.name}</span>
                        <span class="ml-auto text-xs text-gray-400">({gpu.count})</span>
                      </label>
                    )}
                  </For>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  CPU
                </label>
                <input
                  type="text"
                  placeholder="e.g., Ryzen 9"
                  value={props.filters.cpu}
                  onInput={handleCpuChange}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantization
                </label>
                <div class="flex flex-wrap gap-2">
                  <Show when={!props.meta?.quantizations.length}>
                    <p class="text-sm text-gray-400">No quantizations available</p>
                  </Show>
                  <For each={props.meta?.quantizations ?? []}>
                    {(q) => (
                      <label class="flex cursor-pointer items-center gap-1 rounded border border-gray-200 px-2 py-1 text-sm has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:border-gray-700 dark:has-[:checked]:bg-blue-900/20">
                        <input
                          type="checkbox"
                          checked={props.filters.quantization.includes(q.name)}
                          onChange={() => toggleArrayFilter("quantization", q.name)}
                          class="sr-only"
                        />
                        <span>{q.name}</span>
                      </label>
                    )}
                  </For>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Runtime
                </label>
                <div class="flex flex-wrap gap-2">
                  <Show when={!props.meta?.runtimes.length}>
                    <p class="text-sm text-gray-400">No runtimes available</p>
                  </Show>
                  <For each={props.meta?.runtimes ?? []}>
                    {(r) => (
                      <label class="flex cursor-pointer items-center gap-1 rounded border border-gray-200 px-2 py-1 text-sm has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:border-gray-700 dark:has-[:checked]:bg-blue-900/20">
                        <input
                          type="checkbox"
                          checked={props.filters.runtime.includes(r.name)}
                          onChange={() => toggleArrayFilter("runtime", r.name)}
                          class="sr-only"
                        />
                        <span>{r.name}</span>
                      </label>
                    )}
                  </For>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Min tok/s
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Any"
                  value={props.filters.minTps ?? ""}
                  onChange={handleMinTpsChange}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
