import { onCleanup, onMount } from "solid-js";

import { getTurnstileSiteKey } from "../lib/turnstile";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact";
  class?: string;
}

let widgetId: string | undefined;

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.turnstile) {
      resolve();
      return;
    }

    if (document.querySelector('script[src*="turnstile"]')) {
      const checkReady = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkReady);
          resolve();
        }
      }, 100);
      return;
    }

    window.onTurnstileLoad = () => resolve();

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

export function Turnstile(props: TurnstileProps) {
  // eslint-disable-next-line no-unassigned-vars
  let containerRef: HTMLDivElement | undefined;

  onMount(async () => {
    const siteKey = getTurnstileSiteKey();
    if (!siteKey) {
      console.warn("Turnstile site key not configured");
      return;
    }

    await loadTurnstileScript();

    if (containerRef && window.turnstile) {
      widgetId = window.turnstile.render(containerRef, {
        sitekey: siteKey,
        callback: props.onVerify,
        theme: props.theme ?? "auto",
        size: props.size ?? "normal",
      });
    }
  });

  onCleanup(() => {
    if (widgetId && window.turnstile) {
      window.turnstile.remove(widgetId);
      widgetId = undefined;
    }
  });

  return (
    <div
      ref={containerRef}
      class={props.class ?? "turnstile-container"}
      data-sitekey={getTurnstileSiteKey()}
    />
  );
}
