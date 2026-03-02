import { createSignal, For, Show } from "solid-js";

import { X } from "./icons";

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
        <div class="fixed inset-0 z-40 bg-black/65 lg:hidden" onClick={props.onClose} />
      </Show>

      <aside
        classList={{
          "fixed inset-y-0 left-0 z-50 w-72 transform border-r border-[color:var(--border)] bg-[color:var(--surface-soft)] shadow-xl transition-transform duration-300 lg:static lg:z-auto lg:w-64 lg:transform-none lg:shadow-none": true,
          "translate-x-0": props.isOpen,
          "-translate-x-full lg:translate-x-0": !props.isOpen,
        }}
      >
        <div class="flex h-full flex-col">
          <div class="flex items-center justify-between border-b border-[color:var(--border)] p-4 lg:hidden">
            <h2 class="text-lg font-semibold">Filters</h2>
            <button
              type="button"
              onClick={props.onClose}
              class="rounded p-1 text-[color:var(--text-muted)] hover:bg-[#173764] hover:text-[color:var(--text)]"
            >
              <X size={24} />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-4">
            <div class="mb-4 flex items-center justify-between">
              <span class="text-sm font-medium">
                Filters
                <Show when={activeFilterCount() > 0}>
                  <span class="tag ml-2 px-2 py-0.5 text-xs font-medium">
                    {activeFilterCount()}
                  </span>
                </Show>
              </span>
              <Show when={activeFilterCount() > 0}>
                <button
                  type="button"
                  onClick={clearAll}
                  class="text-sm text-[color:var(--brand)] hover:text-[color:var(--brand-strong)]"
                >
                  Clear all
                </button>
              </Show>
            </div>

            <div class="space-y-6">
              <div>
                <label class="mb-2 block text-sm font-medium">Sort by</label>
                <select
                  value={props.filters.sort}
                  onChange={handleSortChange}
                  class="select px-3 py-2 text-sm"
                >
                  <For each={sortOptions}>
                    {(opt) => <option value={opt.value}>{opt.label}</option>}
                  </For>
                </select>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">Model</label>
                <div class="max-h-48 space-y-2 overflow-y-auto rounded border border-[color:var(--border)] bg-[color:var(--surface)] p-2">
                  <Show when={!props.meta?.models.length}>
                    <p class="text-muted text-sm">No models available</p>
                  </Show>
                  <For each={props.meta?.models ?? []}>
                    {(model) => (
                      <label class="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={props.filters.model.includes(model.name)}
                          onChange={() => toggleArrayFilter("model", model.name)}
                          class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                        />
                        <span class="truncate">{model.name}</span>
                        <span class="text-muted ml-auto text-xs">({model.count})</span>
                      </label>
                    )}
                  </For>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">GPU</label>
                <input
                  type="text"
                  placeholder="Search GPUs..."
                  value={gpuSearch()}
                  onInput={(e) => setGpuSearch(e.currentTarget.value)}
                  class="input mb-2 px-2 py-1 text-sm"
                />
                <div class="max-h-48 space-y-2 overflow-y-auto rounded border border-[color:var(--border)] bg-[color:var(--surface)] p-2">
                  <Show when={!filteredGpus().length}>
                    <p class="text-muted text-sm">No GPUs found</p>
                  </Show>
                  <For each={filteredGpus()}>
                    {(gpu) => (
                      <label class="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={props.filters.gpu.includes(gpu.name)}
                          onChange={() => toggleArrayFilter("gpu", gpu.name)}
                          class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                        />
                        <span class="truncate">{gpu.name}</span>
                        <span class="text-muted ml-auto text-xs">({gpu.count})</span>
                      </label>
                    )}
                  </For>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">CPU</label>
                <input
                  type="text"
                  placeholder="e.g., Ryzen 9"
                  value={props.filters.cpu}
                  onInput={handleCpuChange}
                  class="input px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium">Quantization</label>
                <div class="flex flex-wrap gap-2">
                  <Show when={!props.meta?.quantizations.length}>
                    <p class="text-muted text-sm">No quantizations available</p>
                  </Show>
                  <For each={props.meta?.quantizations ?? []}>
                    {(q) => (
                      <label class="flex cursor-pointer items-center gap-1 rounded border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-sm has-[:checked]:border-[color:var(--brand)] has-[:checked]:bg-[#173764]">
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
                <label class="mb-2 block text-sm font-medium">Runtime</label>
                <div class="flex flex-wrap gap-2">
                  <Show when={!props.meta?.runtimes.length}>
                    <p class="text-muted text-sm">No runtimes available</p>
                  </Show>
                  <For each={props.meta?.runtimes ?? []}>
                    {(r) => (
                      <label class="flex cursor-pointer items-center gap-1 rounded border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-sm has-[:checked]:border-[color:var(--brand)] has-[:checked]:bg-[#173764]">
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
                <label class="mb-2 block text-sm font-medium">Min tok/s</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Any"
                  value={props.filters.minTps ?? ""}
                  onChange={handleMinTpsChange}
                  class="input px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
