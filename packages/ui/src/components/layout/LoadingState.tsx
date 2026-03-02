import { Loader2 } from "lucide-solid";

export interface LoadingStateProps {
  message?: string;
}

export function LoadingState(props: LoadingStateProps) {
  return (
    <div
      class="text-muted"
      style={{
        padding: "3rem 0",
        "text-align": "center",
        display: "flex",
        "flex-direction": "column",
        "align-items": "center",
        gap: "1rem",
      }}
    >
      <Loader2 size={32} class="icon--spin" />
      <div>{props.message || "Loading..."}</div>
    </div>
  );
}
