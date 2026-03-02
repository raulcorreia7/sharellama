import { createSignal, onMount } from "solid-js";

export interface UserPreferences {
  theme: "dark" | "light";
  filtersOpen: boolean;
}

const STORAGE_KEY = "ll-preferences";

const defaultPreferences: UserPreferences = {
  theme: "dark",
  filtersOpen: false,
};

export function usePreferences() {
  const [preferences, setPreferences] = createSignal<UserPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = createSignal(false);

  onMount(() => {
    try {
      const stored =
        typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (stored) {
        const parsed = JSON.parse(stored) as UserPreferences;
        setPreferences({ ...defaultPreferences, ...parsed });

        // Apply theme immediately
        if (parsed.theme) {
          document.documentElement.setAttribute("data-theme", parsed.theme);
        }
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
    } finally {
      setIsLoaded(true);
    }
  });

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    const updated = { ...preferences(), [key]: value };
    setPreferences(updated);

    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }

      // Apply theme change immediately
      if (key === "theme") {
        document.documentElement.setAttribute("data-theme", value as string);
      }
    } catch (error) {
      console.error("Failed to save preference:", error);
    }
  };

  return {
    preferences,
    isLoaded,
    setTheme: (theme: "dark" | "light") => updatePreference("theme", theme),
    setFiltersOpen: (open: boolean) => updatePreference("filtersOpen", open),
  };
}
