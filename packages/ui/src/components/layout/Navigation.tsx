/**
 * Navigation - Header navigation component
 *
 * @description
 * Centralized navigation component for the header.
 * Ensures consistent alignment and styling across all pages.
 *
 * @example
 * ```tsx
 * <Navigation
 *   items={[
 *     { label: "Models", href: "/models" },
 *     { label: "Browse", href: "/submissions" }
 *   ]}
 *   cta={{ label: "Submit", href: "/submit", variant: "primary" }}
 * />
 * ```
 */
import { For } from "solid-js";
import { A } from "@solidjs/router";

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface NavCTA {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
}

export interface NavigationProps {
  /** Navigation link items */
  items: NavItem[];
  /** Optional CTA button */
  cta?: NavCTA;
}

export function Navigation(props: NavigationProps) {
  return (
    <nav class="header-nav">
      <For each={props.items}>
        {(item) => (
          <A href={item.href} class="header-nav-link" classList={{ active: item.active }}>
            {item.label}
          </A>
        )}
      </For>
      {props.cta && (
        <A href={props.cta.href} class={`btn btn--${props.cta.variant ?? "primary"} btn--sm`}>
          {props.cta.label}
        </A>
      )}
    </nav>
  );
}
