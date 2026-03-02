import { JSX, Show } from "solid-js";

export interface SectionProps {
  title?: string;
  card?: boolean;
  headerAction?: JSX.Element;
  children: JSX.Element;
}

export function Section(props: SectionProps) {
  return (
    <section class={`section ${props.card ? "card" : ""}`}>
      <Show when={props.title || props.headerAction}>
        <div class="section-header">
          <Show when={props.title}>
            <h2 class="section-title">{props.title}</h2>
          </Show>
          <Show when={props.headerAction}>
            <div class="section-header-action">{props.headerAction}</div>
          </Show>
        </div>
      </Show>
      {props.children}
    </section>
  );
}
