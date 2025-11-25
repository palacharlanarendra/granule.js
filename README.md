# Granule.js

Granular subscription state management for React, using path-based dependency tracking and `useSyncExternalStore` for concurrency safety.

## Motivation

Avoid unnecessary re-renders by subscribing components to exactly the state paths they read. When unrelated paths change, subscribers are not notified.

## Install

```bash
npm install granule-js
```

Peer dependency: `react >= 18`.

## Quick Start

```tsx
import { createStore, useGranular } from "granule-js";

const store = createStore({ user: { name: "John", age: 22 }, theme: "dark" });

function Profile() {
  const name = useGranular(store, s => s.user.name);
  return <h1>{name}</h1>;
}

// Unrelated updates do not re-render Profile
store.set(s => { s.user.age = 23; });
```

## API

- `createStore<T>(initial: T): Store<T>`
  - `get(): T` — current state snapshot
  - `set(updater: (draft: T) => void): void` — mutate with deep proxy tracking
  - `enableDebug(flag: boolean): void` — optional debug logging

- `useGranular<T, R>(store: Store<T>, selector: (s: T) => R, options?: { isEqual?: (a: R, b: R) => boolean; debug?: boolean; }): R`
  - Tracks property reads via Proxy during selector evaluation and subscribes to those paths.
  - Uses `useSyncExternalStore` for snapshot safety.
  - `isEqual` can return the previous value to keep referential stability and avoid re-renders.
  - `debug` toggles store-level logging for changed paths and notifications.

## How It Works

- Read tracking: a Proxy records leaf primitive paths read by the selector (e.g., `user.name`, `arr.length`).
- Mutation tracking: a deep Proxy records changed paths during `set` calls, including common array mutators.
- Notification: only subscribers whose paths are equal or in the same ancestor/descendant chain are notified.

## Development

```bash
npm install
npm run typecheck
npm run build
npm test
```

Note: tooling may require Node >= 18.

## Example App

Planned in `examples/basic` (Vite + React). Will demonstrate avoiding re-renders across unrelated updates.

## Benchmarks

Planned comparison: Context vs Zustand vs Granule.js on dashboard-like workloads.

## License

MIT