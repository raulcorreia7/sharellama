import { createResource, type Resource } from "solid-js";

import { useConnection } from "./ConnectionContext";

export function useResourceWithDefault<T>(fetcher: () => Promise<T>, defaultValue: T): Resource<T>;

export function useResourceWithDefault<T, D>(
  deps: () => D | false | null | undefined,
  fetcher: (deps: D) => Promise<T>,
  defaultValue: T,
): Resource<T>;

export function useResourceWithDefault<T, D>(
  fetcherOrDeps: (() => Promise<T>) | (() => D | false | null | undefined),
  fetcherOrDefault: ((deps: D) => Promise<T>) | T,
  defaultValue?: T,
): Resource<T> {
  const connection = useConnection();

  if (typeof fetcherOrDefault === "function") {
    const deps = fetcherOrDeps as () => D | false | null | undefined;
    const fetcher = fetcherOrDefault as (deps: D) => Promise<T>;
    const def = defaultValue as T;

    const safeFetcher = async (d: D): Promise<T> => {
      try {
        return await fetcher(d);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        connection.reportError(err);
        return def;
      }
    };

    const [resource] = createResource(deps, safeFetcher);
    return resource;
  } else {
    const fetcher = fetcherOrDeps as () => Promise<T>;
    const def = fetcherOrDefault as T;

    const safeFetcher = async (): Promise<T> => {
      try {
        return await fetcher();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        connection.reportError(err);
        return def;
      }
    };

    const [resource] = createResource(safeFetcher);
    return resource;
  }
}
