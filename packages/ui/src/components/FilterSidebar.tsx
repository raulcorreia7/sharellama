import { createSignal, For, Show } from "solid-js";

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
  collapsed?: boolean;
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
        <div class="filter-overlay" onClick={props.onClose} />
      </Show>

      <aside
        classList={{
          "filter-sidebar": true,
          "filter-sidebar--open": props.isOpen,
          "filter-sidebar--collapsed": props.collapsed,
        }}
        role="complementary"
        aria-label="Filters"
      >
        <div class="filter-header">
          <h2 class="filter-title">Filters</h2>
          <Show when={activeFilterCount() > 0}>
            <span class="filter-count">{activeFilterCount()}</span>
          </Show>
          <Show when={activeFilterCount() > 0}>
            <button type="button" onClick={clearAll} class="filter-clear-btn">
              Clear all
            </button>
          </Show>
        </div>

        <div class="filter-content">
          <div class="filter-group">
            <label class="filter-label">Sort by</label>
            <select value={props.filters.sort} onChange={handleSortChange} class="input w-full">
              <For each={sortOptions}>
                {(opt) => <option value={opt.value}>{opt.label}</option>}
              </For>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">Model</label>
            <div class="filter-options-box">
              <Show when={!props.meta?.models.length}>
                <p class="text-muted text-sm">No models available</p>
              </Show>
              <For each={props.meta?.models ?? []}>
                {(model) => (
                  <label class="filter-checkbox-label">
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

          <div class="filter-group">
            <label class="filter-label">GPU</label>
            <input
              type="text"
              placeholder="Search GPUs..."
              value={gpuSearch()}
              onInput={(e) => setGpuSearch(e.currentTarget.value)}
              class="input mb-2 w-full"
            />
            <div class="filter-options-box">
              <Show when={!filteredGpus().length}>
                <p class="text-muted text-sm">No GPUs found</p>
              </Show>
              <For each={filteredGpus()}>
                {(gpu) => (
                  <label class="filter-checkbox-label">
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

          <div class="filter-group">
            <label class="filter-label">CPU</label>
            <input
              type="text"
              placeholder="e.g., Ryzen 9"
              value={props.filters.cpu}
              onInput={handleCpuChange}
              class="input w-full"
            />
          </div>

          <div class="filter-group">
            <label class="filter-label">Quantization</label>
            <div class="filter-tags-wrap">
              <Show when={!props.meta?.quantizations.length}>
                <p class="text-muted text-sm">No quantizations available</p>
              </Show>
              <For each={props.meta?.quantizations ?? []}>
                {(q) => (
                  <label class="filter-tag">
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

          <div class="filter-group">
            <label class="filter-label">Runtime</label>
            <div class="filter-tags-wrap">
              <Show when={!props.meta?.runtimes.length}>
                <p class="text-muted text-sm">No runtimes available</p>
              </Show>
              <For each={props.meta?.runtimes ?? []}>
                {(r) => (
                  <label class="filter-tag">
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

          <div class="filter-group">
            <label class="filter-label">Min tok/s</label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="Any"
              value={props.filters.minTps ?? ""}
              onChange={handleMinTpsChange}
              class="input w-full"
            />
          </div>
        </div>
      </aside>
    </>
  );
}
