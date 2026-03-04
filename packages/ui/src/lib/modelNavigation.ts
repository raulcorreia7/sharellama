import { createSignal } from "solid-js";

const MODEL_NAVIGATION_KEY = "sharellama:model-navigation";
const MODEL_NAVIGATION_FAILSAFE_MS = 8000;

const [isModelNavigationPending, setIsModelNavigationPending] = createSignal(false);
let transitionFailsafeTimer: ReturnType<typeof setTimeout> | undefined;

function startFailsafeTimer(): void {
  if (transitionFailsafeTimer) {
    clearTimeout(transitionFailsafeTimer);
  }
  transitionFailsafeTimer = setTimeout(() => {
    clearModelNavigationTransition();
  }, MODEL_NAVIGATION_FAILSAFE_MS);
}

function clearFailsafeTimer(): void {
  if (transitionFailsafeTimer) {
    clearTimeout(transitionFailsafeTimer);
    transitionFailsafeTimer = undefined;
  }
}

export function isModelNavigationTransitionPending(): boolean {
  return isModelNavigationPending();
}

export function markModelNavigationTransition(): void {
  setIsModelNavigationPending(true);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(MODEL_NAVIGATION_KEY, "1");
    startFailsafeTimer();
  } catch {
    // Ignore storage failures in restricted browsing contexts.
  }
}

export function clearModelNavigationTransition(): void {
  setIsModelNavigationPending(false);
  clearFailsafeTimer();

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(MODEL_NAVIGATION_KEY);
  } catch {
    // Ignore storage failures in restricted browsing contexts.
  }
}

export function consumeModelNavigationTransition(): boolean {
  if (typeof window === "undefined") {
    setIsModelNavigationPending(false);
    return false;
  }

  try {
    const hasTransition = window.sessionStorage.getItem(MODEL_NAVIGATION_KEY) === "1";
    if (hasTransition) {
      clearFailsafeTimer();
      setIsModelNavigationPending(true);
    } else {
      setIsModelNavigationPending(false);
    }

    return hasTransition;
  } catch {
    setIsModelNavigationPending(false);
    return false;
  }
}
