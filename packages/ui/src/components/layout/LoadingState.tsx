import { Loader2 } from "lucide-solid";

export interface LoadingStateProps {
  message?: string;
  graphic?: boolean;
}

export function LoadingState(props: LoadingStateProps) {
  const containerClass = props.graphic ? "loading-state loading-state--graphic" : "loading-state";

  return (
    <div class={containerClass}>
      {props.graphic ? (
        <div class="loading-orb" aria-hidden="true">
          <div class="loading-orb-ring loading-orb-ring--outer" />
          <div class="loading-orb-ring loading-orb-ring--inner" />
          <Loader2 size={24} class="icon--spin loading-orb-icon" />
        </div>
      ) : (
        <Loader2 size={32} class="icon--spin" />
      )}
      <div class="loading-state-label">{props.message || "Loading..."}</div>
    </div>
  );
}
