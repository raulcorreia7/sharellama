import { createSignal, createEffect, onCleanup } from "solid-js";

export function useDebounce<T>(value: () => T, delay: number): () => T {
  const [debouncedValue, setDebouncedValue] = createSignal<T>(value());

  createEffect(() => {
    const currentValue = value();
    const timer = setTimeout(() => {
      setDebouncedValue(() => currentValue);
    }, delay);

    onCleanup(() => clearTimeout(timer));
  });

  return debouncedValue;
}
