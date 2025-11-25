export type Path = string;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPrimitive(value: unknown): boolean {
  return (
    !isObject(value) && typeof value !== "function"
  );
}

// Track property READS inside a selector via Proxy.
export function createReadTracker<T>(target: T) {
  const paths = new Set<Path>();

  const makeProxy = (obj: any, base: string): any => {
    return new Proxy(obj, {
      get(o, prop, receiver) {
        if (typeof prop === "symbol") {
          return Reflect.get(o, prop, receiver);
        }
        const nextPath = base ? `${base}.${String(prop)}` : String(prop);
        const value = Reflect.get(o, prop, receiver);
        if (isPrimitive(value)) {
          paths.add(nextPath);
          return value;
        }
        // For arrays, also mark 'length' when requested explicitly.
        if (Array.isArray(value)) {
          return makeProxy(value, nextPath);
        }
        if (isObject(value)) {
          return makeProxy(value, nextPath);
        }
        return value;
      },
    });
  };

  const proxy = makeProxy(target as any, "");

  return {
    proxy: proxy as T,
    getPaths: () => paths,
  };
}

// Track property WRITES during a mutation via Proxy.
export function createMutationTracker<T>(target: T) {
  const changed = new Set<Path>();

  const mutatingArrayMethods = new Set([
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "sort",
    "reverse",
    "copyWithin",
    "fill",
  ]);

  const makeProxy = (obj: any, base: string): any => {
    return new Proxy(obj, {
      get(o, prop, receiver) {
        const value = Reflect.get(o, prop, receiver);
        if (typeof prop === "symbol") return value;
        const nextPath = base ? `${base}.${String(prop)}` : String(prop);

        if (Array.isArray(o) && typeof value === "function" && mutatingArrayMethods.has(String(prop))) {
          return function (...args: any[]) {
            changed.add(base); // mark the array path as changed
            // bind the original method to the original target
            return (value as Function).apply(o, args);
          };
        }

        if (isObject(value)) {
          return makeProxy(value, nextPath);
        }
        return value;
      },
      set(o, prop, value, receiver) {
        if (typeof prop !== "symbol") {
          const nextPath = base ? `${base}.${String(prop)}` : String(prop);
          // mark only the precise property path
          changed.add(nextPath);
        }
        return Reflect.set(o, prop, value, receiver);
      },
      deleteProperty(o, prop) {
        if (typeof prop !== "symbol") {
          const nextPath = base ? `${base}.${String(prop)}` : String(prop);
          changed.add(nextPath);
        }
        return Reflect.deleteProperty(o, prop);
      },
    });
  };

  const proxy = makeProxy(target as any, "");

  return {
    proxy: proxy as T,
    getChangedPaths: () => changed,
  };
}