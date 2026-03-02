import { JSX } from "solid-js";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: JSX.Element;
}

export function PageHeader(props: PageHeaderProps) {
  return (
    <header class="page-header">
      <div>
        <h1 class="page-title">{props.title}</h1>
        {props.description && <p class="page-description">{props.description}</p>}
      </div>
      {props.actions && <div class="page-header-actions">{props.actions}</div>}
    </header>
  );
}
