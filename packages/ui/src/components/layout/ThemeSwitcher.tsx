import { createSignal, onMount, Show } from "solid-js";

import { Moon, Sun } from "./icons";

type Theme = "dark" | "light";

export function ThemeSwitcher() {
  const [theme, setTheme] = createSignal<Theme>("dark");
  const [mounted, setMounted] = createSignal(false);

  onMount(() => {
    const storedTheme = localStorage.getItem("ll-theme") as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.setAttribute("data-theme", storedTheme);
    }
    setMounted(true);
  });

  const toggleTheme = () => {
    const next = theme() === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ll-theme", next);
  };

  return (
    <button type="button" onClick={toggleTheme} class="theme-toggle" aria-label="Toggle theme">
      <Show when={mounted()} fallback={<div class="theme-toggle-placeholder" />}>
        <Show when={theme() === "dark"} fallback={<Sun size={18} />}>
          <Moon size={18} />
        </Show>
      </Show>
    </button>
  );
}
