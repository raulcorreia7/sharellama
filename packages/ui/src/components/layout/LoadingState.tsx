export interface LoadingStateProps {
  message?: string;
}

export function LoadingState(props: LoadingStateProps) {
  return (
    <div class="text-muted" style={{ padding: "3rem 0", "text-align": "center" }}>
      {props.message || "Loading..."}
    </div>
  );
}
