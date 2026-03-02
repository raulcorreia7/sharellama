import { Show } from "solid-js";
import { AlertTriangle, X } from "./icons";
import { useConnection } from "../lib/ConnectionContext";

function OfflineBanner() {
  const connection = useConnection();

  return (
    <Show when={connection.showError()}>
      <div class="offline-banner">
        <div class="offline-banner-content">
          <div class="offline-banner-message">
            <AlertTriangle size={16} />
            <span>Connection issue — some data may be unavailable</span>
          </div>
          <div class="offline-banner-actions">
            <button type="button" onClick={connection.retry} class="offline-banner-retry">
              Retry
            </button>
            <button
              type="button"
              onClick={connection.dismissError}
              class="offline-banner-dismiss"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}

export default OfflineBanner;
