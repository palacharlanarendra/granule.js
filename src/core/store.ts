import { createMutationTracker } from "./proxy";

export type Path = string;
export type Listener = () => void;

export interface Store<T> {
  get(): T;
  set(updater: (draft: T) => void): void;
  // Internal APIs used by the React hook
  subscribeComponent(id: symbol, listener: Listener): () => void;
  updateComponentPaths(id: symbol, paths: Set<Path>): void;
  clearComponentPaths(id: symbol): void;
  enableDebug(flag: boolean): void;
}

type ComponentEntry = {
  listener: Listener;
  paths: Set<Path>;
};

function related(a: Path, b: Path): boolean {
  if (a === b) return true;
  return a.startsWith(b + ".") || b.startsWith(a + ".");
}

export function createStore<T>(initial: T): Store<T> {
  const state = initial as T;
  const debug = { enabled: false };

  const components = new Map<symbol, ComponentEntry>();
  const pathMap = new Map<Path, Set<symbol>>();

  const get = () => state;

  const subscribeComponent = (id: symbol, listener: Listener) => {
    components.set(id, { listener, paths: new Set() });
    return () => {
      // remove from all path sets
      const entry = components.get(id);
      if (entry) {
        for (const p of entry.paths) {
          const set = pathMap.get(p);
          if (set) {
            set.delete(id);
            if (set.size === 0) pathMap.delete(p);
          }
        }
      }
      components.delete(id);
    };
  };

  const updateComponentPaths = (id: symbol, paths: Set<Path>) => {
    const entry = components.get(id);
    if (!entry) return;
    // remove old
    for (const p of entry.paths) {
      if (!paths.has(p)) {
        const set = pathMap.get(p);
        if (set) {
          set.delete(id);
          if (set.size === 0) pathMap.delete(p);
        }
      }
    }
    // add new
    entry.paths = new Set(paths);
    for (const p of paths) {
      let set = pathMap.get(p);
      if (!set) {
        set = new Set();
        pathMap.set(p, set);
      }
      set.add(id);
    }
    if (debug.enabled) {
      // eslint-disable-next-line no-console
      console.debug("[granule] paths updated", id.toString(), Array.from(paths));
    }
  };

  const clearComponentPaths = (id: symbol) => {
    updateComponentPaths(id, new Set());
  };

  const notifyChanged = (changed: Set<Path>) => {
    const notified = new Set<symbol>();
    // naive: scan all registered paths and match by prefix relation
    for (const [p, ids] of pathMap) {
      for (const c of changed) {
        if (related(p, c)) {
          for (const id of ids) notified.add(id);
          break;
        }
      }
    }
    if (debug.enabled) {
      // eslint-disable-next-line no-console
      console.debug("[granule] changed paths", Array.from(changed));
      console.debug("[granule] notifying", Array.from(notified).map((i) => i.toString()));
    }
    for (const id of notified) {
      const entry = components.get(id);
      if (entry) entry.listener();
    }
  };

  const set = (updater: (draft: T) => void) => {
    const { proxy, getChangedPaths } = createMutationTracker(state);
    updater(proxy);
    notifyChanged(getChangedPaths());
  };

  const enableDebug = (flag: boolean) => {
    debug.enabled = flag;
  };

  return {
    get,
    set,
    subscribeComponent,
    updateComponentPaths,
    clearComponentPaths,
    enableDebug,
  };
}