import { createSignal, For, onMount } from "solid-js";

type Theme = "dark" | "light";
type Accent = "blue" | "violet" | "orange";

const ACCENTS: { name: Accent; color: string }[] = [
  { name: "blue", color: "#0070f3" },
  { name: "violet", color: "#8b5cf6" },
  { name: "orange", color: "#f97316" },
];

export function ThemeSwitcher() {
  const [theme, setTheme] = createSignal<Theme>("dark");
  const [accent, setAccent] = createSignal<Accent>("blue");
  const [mounted, setMounted] = createSignal(false);

  onMount(() => {
    const storedTheme = localStorage.getItem("ll-theme") as Theme | null;
    const storedAccent = localStorage.getItem("ll-accent") as Accent | null;

    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.setAttribute("data-theme", storedTheme);
    }
    if (storedAccent) {
      setAccent(storedAccent);
      document.documentElement.setAttribute("data-accent", storedAccent);
    }
    setMounted(true);
  });

  const toggleTheme = () => {
    const next = theme() === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ll-theme", next);
  };

  const selectAccent = (name: Accent) => {
    setAccent(name);
    document.documentElement.setAttribute("data-accent", name);
    localStorage.setItem("ll-accent", name);
  };

  return (
    <div class="flex items-center gap-3">
      <button
        type="button"
        onClick={toggleTheme}
        class="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--text)]"
        aria-label="Toggle theme"
      >
        <svg
          class="h-[18px] w-[18px]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d={
              theme() === "dark"
                ? "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                : "M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
            }
          />
        </svg>
      </button>

      <For each={ACCENTS}>
        {(a) => (
          <button
            type="button"
            onClick={() => selectAccent(a.name)}
            class="h-3.5 w-3.5 rounded-full transition-transform hover:scale-110"
            style={{
              "background-color": a.color,
              "box-shadow":
                mounted() && accent() === a.name
                  ? `0 0 0 2px var(--bg), 0 0 0 4px ${a.color}`
                  : "none",
            }}
            aria-label={`Select ${a.name} accent`}
          />
        )}
      </For>
    </div>
  );
}
