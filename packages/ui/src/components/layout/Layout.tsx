import { JSX, Show } from "solid-js";

import { isModelNavigationTransitionPending } from "../../lib/modelNavigation";
import { Footer, type FooterProps } from "./Footer";
import { Header } from "./Header";
import { LoadingState } from "./LoadingState";

export interface LayoutProps {
  children: JSX.Element;
  stats?: FooterProps["stats"];
}

export function Layout(props: LayoutProps) {
  return (
    <div class="layout">
      <Header />
      <main class="main">{props.children}</main>
      <Footer stats={props.stats} />
      <Show when={isModelNavigationTransitionPending()}>
        <div class="global-nav-loading-overlay" aria-live="polite" aria-label="Loading model page">
          <LoadingState message="Loading model..." graphic />
        </div>
      </Show>
    </div>
  );
}
