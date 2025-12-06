import { useEffect, useRef } from "react";
import { createReadTracker } from "./proxy";
import type { Store } from "./store";
import { useSyncExternalStore } from "react";

export type UseGranularOptions<R> = {
  isEqual?: (a: R, b: R) => boolean;
  debug?: boolean;
};

type SelectorConfig<T, R> = { path: string } | { from: (s: T) => any; pick: readonly (string | number)[] };

function readAt(obj: any, path: string) {
  const parts = path.split(".");
  let v = obj;
  for (let i = 0; i < parts.length; i++) v = v[parts[i]];
  return v as unknown;
}

export function useGranular<T, R>(
  store: Store<T>,
  selectorOrConfig: ((s: T) => R) | SelectorConfig<T, R>,
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
    let value: any;
    let pickKeys: readonly (string | number)[] | undefined;
    if (typeof selectorOrConfig === "function") {
      value = (selectorOrConfig as (s: T) => R)(proxy);
    } else if ("path" in selectorOrConfig) {
      value = readAt(proxy as any, selectorOrConfig.path);
    } else {
      const obj = (selectorOrConfig as any).from(proxy);
      const keys: readonly (string | number)[] = (selectorOrConfig as any).pick;
      const out: any = {};
      for (const k of keys) out[k as any] = obj[k as any];
      value = out;
      pickKeys = keys;
    }
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
    } else if (pickKeys && prevValueRef.current !== undefined) {
      let same = true;
      for (const k of pickKeys) {
        if ((prevValueRef.current as any)[k as any] !== (value as any)[k as any]) {
          same = false;
          break;
        }
      }
      if (same) return prevValueRef.current as R;
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
