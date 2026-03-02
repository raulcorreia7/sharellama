import {
  createContext,
  useContext,
  createSignal,
  onMount,
  onCleanup,
  type ParentComponent,
  type Accessor,
} from "solid-js";

export interface ConnectionState {
  isOnline: Accessor<boolean>;
  lastError: Accessor<Error | null>;
  showError: Accessor<boolean>;
  reportError: (error: Error) => void;
  dismissError: () => void;
  retry: () => void;
  subscribeRetry: (callback: () => void) => () => void;
}

const ConnectionContext = createContext<ConnectionState>();

export function useConnection(): ConnectionState {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error("useConnection must be used within ConnectionProvider");
  return ctx;
}

export const ConnectionProvider: ParentComponent = (props) => {
  const [isOnline, setIsOnline] = createSignal(true);
  const [lastError, setLastError] = createSignal<Error | null>(null);
  const [showError, setShowError] = createSignal(false);
  const [retryCallbacks, setRetryCallbacks] = createSignal<Set<() => void>>(new Set());

  const reportError = (error: Error) => {
    setLastError(error);
    setShowError(true);
  };

  const dismissError = () => setShowError(false);

  const subscribeRetry = (callback: () => void) => {
    const callbacks = retryCallbacks();
    callbacks.add(callback);
    setRetryCallbacks(new Set(callbacks));
    return () => {
      const current = retryCallbacks();
      current.delete(callback);
      setRetryCallbacks(new Set(current));
    };
  };

  const retry = () => {
    dismissError();
    retryCallbacks().forEach((cb) => cb());
  };

  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  onMount(() => {
    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  });

  onCleanup(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    }
  });

  return (
    <ConnectionContext.Provider
      value={{ isOnline, lastError, showError, reportError, dismissError, retry, subscribeRetry }}
    >
      {props.children}
    </ConnectionContext.Provider>
  );
};
