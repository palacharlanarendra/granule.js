import { useEffect, useRef } from "react";
import { createReadTracker } from "../core/proxy";
import type { Store } from "../core/store";
import { useSyncExternalStore } from "react";

export type UseGranularOptions<R> = {
  isEqual?: (a: R, b: R) => boolean;
  debug?: boolean;
};

export function useGranular<T, R>(
  store: Store<T>,
  selector: (s: T) => R,
  options?: UseGranularOptions<R>
): R {
  const idRef = useRef<symbol>();
  if (!idRef.current) idRef.current = Symbol("granule_subscriber");

  const depsKeyRef = useRef<string>("__init__");
  const pathsRef = useRef<Set<string>>(new Set());
  const prevValueRef = useRef<R>();

  const subscribe = (onStoreChange: () => void) => {
    const unsub = store.subscribeComponent(idRef.current!, onStoreChange);
    // Ensure initial registration occurs as soon as subscription is active
    store.updateComponentPaths(idRef.current!, pathsRef.current);
    if (typeof options?.debug === "boolean") {
      store.enableDebug(options.debug);
    }
    return () => {
      store.clearComponentPaths(idRef.current!);
      unsub();
    };
  };

  const getSnapshot = () => {
    const { proxy, getPaths } = createReadTracker(store.get());
    const value = selector(proxy);
    const paths = getPaths();
    const key = Array.from(paths).sort().join("|");
    if (key !== depsKeyRef.current) {
      depsKeyRef.current = key;
      pathsRef.current = paths;
      // Update component path subscriptions immediately so notifications don't rely on effects
      store.updateComponentPaths(idRef.current!, paths);
      if (typeof options?.debug === "boolean") {
        store.enableDebug(options.debug);
      }
    }
    // Equality: if provided and values are equal, return previous to keep referential stability
    if (options?.isEqual && prevValueRef.current !== undefined) {
      if (options.isEqual(prevValueRef.current as R, value)) {
        return prevValueRef.current as R;
      }
    }
    prevValueRef.current = value;
    return value;
  };

  const value = useSyncExternalStore(subscribe, getSnapshot);

  // Ensure paths are registered after the subscription is established.
  // This guarantees initial registration even if getSnapshot runs before subscribe.
  useEffect(() => {
    store.updateComponentPaths(idRef.current!, pathsRef.current);
    if (typeof options?.debug === "boolean") {
      store.enableDebug(options.debug);
    }
  }, [store, depsKeyRef.current, options?.debug]);

  return value;
}