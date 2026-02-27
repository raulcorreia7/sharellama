import { createSignal, createEffect, on } from "solid-js";
import { useDebounce } from "../lib/useDebounce";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchBar(props: SearchBarProps) {
  const placeholder = () => props.placeholder ?? "Search submissions...";
  const debounceMs = () => props.debounceMs ?? 300;

  const [localValue, setLocalValue] = createSignal(props.value);

  const debouncedValue = useDebounce(localValue, debounceMs());

  createEffect(
    on(debouncedValue, (v) => {
      if (v !== props.value) {
        props.onChange(v);
      }
    })
  );

  createEffect(
    on(
      () => props.value,
      (v) => {
        if (v !== localValue()) {
          setLocalValue(v);
        }
      }
    )
  );

  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setLocalValue(target.value);
  };

  const handleClear = () => {
    setLocalValue("");
    props.onChange("");
  };

  return (
    <div class="relative">
      <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <svg
          class="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="text"
        value={localValue()}
        onInput={handleInput}
        placeholder={placeholder()}
        class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
      />
      {localValue() && (
        <button
          type="button"
          onClick={handleClear}
          class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
