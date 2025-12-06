import type { Store } from "./store"
import { useGranular } from "./useGranular"

function readAt(obj: any, path: string) {
  const parts = path.split(".")
  let v = obj
  for (let i = 0; i < parts.length; i++) v = v[parts[i]]
  return v
}

export function useGranularPath<T, R = unknown>(store: Store<T>, path: string, options?: { debug?: boolean }) {
  return useGranular(store, (s) => readAt(s as any, path) as R, { debug: options?.debug }) as R
}
