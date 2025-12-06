import type { Store } from "./store";
import { useGranular } from "./useGranular";

export function useGranularPick<T, O extends Record<string, any>, K extends keyof O>(
  store: Store<T>,
  getObj: (s: T) => O,
  keys: readonly K[],
  options?: { debug?: boolean }
) {
  return useGranular(store, (s) => {
    const obj = getObj(s);
    const out: any = {};
    for (const k of keys) out[k] = obj[k];
    return out as Pick<O, K>;
  }, {
    isEqual: (a, b) => {
      if (a === b) return true;
      if (!a || !b) return false;
      for (const k of keys) {
        if (a[k] !== b[k]) return false;
      }
      return true;
    },
    debug: options?.debug,
  });
}
