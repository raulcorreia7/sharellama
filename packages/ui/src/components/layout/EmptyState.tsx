import { JSX } from "solid-js";

export interface EmptyStateProps {
  message: string;
  action?: JSX.Element;
}

export function EmptyState(props: EmptyStateProps) {
  return (
    <div class="card" style={{ padding: "2rem", "text-align": "center" }}>
      <p class="text-muted">{props.message}</p>
      {props.action && <div style={{ "margin-top": "1rem" }}>{props.action}</div>}
    </div>
  );
}
