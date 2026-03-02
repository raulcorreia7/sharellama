import { A } from "@solidjs/router";
import { For } from "solid-js";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs(props: BreadcrumbsProps) {
  return (
    <nav class="breadcrumbs">
      <For each={props.items}>
        {(item, index) => (
          <>
            {index() > 0 && <span class="breadcrumbs-separator">/</span>}
            {item.href ? (
              <A href={item.href} class="breadcrumbs-link">
                {item.label}
              </A>
            ) : (
              <span class="breadcrumbs-current">{item.label}</span>
            )}
          </>
        )}
      </For>
    </nav>
  );
}
