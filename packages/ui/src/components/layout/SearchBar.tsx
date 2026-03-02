import { createEffect, createSignal, on, Show } from "solid-js";

import { useDebounce } from "../lib/useDebounce";
import { Search, X } from "./icons";
import { SearchSuggestions } from "./SearchSuggestions";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  showSuggestions?: boolean;
}

export function SearchBar(props: SearchBarProps) {
  const placeholder = () => props.placeholder ?? "Search submissions...";
  const debounceMs = () => props.debounceMs ?? 300;
  const showSuggestions = () => props.showSuggestions ?? false;

  const [localValue, setLocalValue] = createSignal(props.value);
  const [isFocused, setIsFocused] = createSignal(false);
  const [showDropdown, setShowDropdown] = createSignal(false);

  const debouncedValue = useDebounce(localValue, debounceMs());

  createEffect(
    on(debouncedValue, (v) => {
      if (v !== props.value) {
        props.onChange(v);
      }
    }),
  );

  createEffect(
    on(
      () => props.value,
      (v) => {
        if (v !== localValue()) {
          setLocalValue(v);
        }
      },
    ),
  );

  createEffect(
    on(
      () => [isFocused(), localValue(), showSuggestions()] as const,
      ([focused, value, canShow]) => {
        setShowDropdown(focused && value === "" && canShow);
      },
    ),
  );

  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setLocalValue(target.value);
  };

  const handleClear = () => {
    setLocalValue("");
    props.onChange("");
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleSelectSuggestion = (model: string) => {
    setLocalValue(model);
    props.onChange(model);
  };

  const handleCloseSuggestions = () => {
    setShowDropdown(false);
  };

  return (
    <div class="search">
      <div class="search-icon">
        <Search size={20} />
      </div>
      <input
        type="text"
        value={localValue()}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder()}
        class="input input--with-icon text-sm"
      />
      <Show when={localValue()}>
        <button type="button" onClick={handleClear} class="search-clear">
          <X size={20} />
        </button>
      </Show>
      <Show when={showDropdown()}>
        <SearchSuggestions onSelect={handleSelectSuggestion} onClose={handleCloseSuggestions} />
      </Show>
    </div>
  );
}
