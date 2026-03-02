import { createSignal, onMount, Show } from "solid-js";

import { Moon, Sun } from "../icons";

export function ThemeSwitcher() {
  const [mounted, setMounted] = createSignal(false);
  const [isDark, setIsDark] = createSignal(true);

  onMount(() => {
    const stored = localStorage.getItem("ll-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored === "dark" || (!stored && prefersDark);
    setIsDark(initial);
    setMounted(true);
  });

  const toggleTheme = () => {
    const next = isDark() ? "light" : "dark";
    setIsDark(!isDark());
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ll-theme", next);
  };

  return (
    <button type="button" onClick={toggleTheme} class="theme-toggle" aria-label="Toggle theme">
      <Show when={mounted()}>
        <Show when={isDark()} fallback={<Sun size={18} />}>
          <Moon size={18} />
        </Show>
      </Show>
    </button>
  );
}
