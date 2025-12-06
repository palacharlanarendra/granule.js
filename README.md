# Granule.js

Granular subscription state management for React with path-based dependency tracking and `useSyncExternalStore` for concurrency safety.

Core lives under `core/`. Examples live under `examples/basic` (Vite + React).

## Install

```bash
npm install granule-js
```

Peer dependency: `react >= 18`.

## Quick Start

```tsx
import { createStore, useGranular } from "granule-js";

const store = createStore({ user: { name: "John", age: 22 }, theme: "light" });

function Profile() {
  const name = useGranular(store, s => s.user.name);
  return <h1>{name}</h1>;
}

// Unrelated updates do not re-render Profile
store.set(s => { s.user.age += 1 });
```

## API (Core)

- `createStore<T>(initial: T): Store<T>`
  - `get(): T` — current state snapshot
  - `set(updater: (draft: T) => void): void` — mutate via deep Proxy with precise path tracking
  - `setAt(path: string, value: unknown): void` — set nested value by dotted path
  - `updateAt(path: string, fn: (current: unknown) => unknown): void` — functional update by path
  - `enableDebug(flag: boolean): void` — toggle debug logging for path updates and notifications

- `useGranular<T, R>(store: Store<T>, input: ((s: T) => R) | { path: string } | { from: (s: T) => any; pick: readonly (string | number)[] }, options?: { isEqual?: (a: R, b: R) => boolean; debug?: boolean }): R`
  - Function selector: arbitrary logic; subscribes to paths read in the selector
  - Path selector: `{ path: 'user.age' }` subscribes to a single nested leaf
  - Pick selector: `{ from: s => s.user, pick: ['name','age'] }` returns a small object with shallow equality on the picked keys
  - Uses `useSyncExternalStore` for snapshot correctness and concurrent rendering safety

### Selector Patterns

```tsx
// Function selector
const age = useGranular(store, s => s.user.age);

// Path selector
const theme = useGranular(store, { path: 'theme' });

// Pick selector with shallow equality on keys
const user = useGranular(store, { from: s => s.user, pick: ['name','age'] });
```

### Mutations

```ts
// Functional mutation with deep tracking
store.set(s => { s.user.age += 1 });

// Path helpers
store.setAt('user.name', 'Jane');
store.updateAt('user.age', a => (a as number) + 1);
```

## How It Works

- Read tracking: a Proxy records leaf primitive paths read by selectors (e.g., `user.name`, `arr.length`).
- Mutation tracking: a deep Proxy records changed paths during `set` (array mutators included).
- Notification: only subscribers whose registered paths are equal or ancestor/descendant of the changed paths are notified.

Key references:
- Store creation and notification: `core/store.ts:28`, `core/store.ts:88–107`
- `set`, `setAt`, `updateAt`: `core/store.ts:110–131`
- Hook implementation: `core/useGranular.ts:20–103`

## Examples (Vite + React)

The example app demonstrates row-level and cell-level subscriptions and a real-time dashboard.

- Routing and imports:
  - Alias `'granule-js'` maps to the core entry in `examples/basic/vite.config.js:13`
  - App routes and navigation in `examples/basic/src/App.jsx:84–115`

- Coins (Granule) — row-level picks
  - Row subscribes to selected keys: `examples/basic/src/Coins.jsx:85–87`
  - Global running flag: `examples/basic/src/Coins.jsx:131`

- Coins (Cells) — cell-level granularity
  - Rank via path: `examples/basic/src/CoinsCells.jsx:43`
  - Name via pick: `examples/basic/src/CoinsCells.jsx:48`
  - Price via pick: `examples/basic/src/CoinsCells.jsx:69`
  - Market cap via path: `examples/basic/src/CoinsCells.jsx:74`
  - Volume via path: `examples/basic/src/CoinsCells.jsx:79`

- Real-time — frequent updates
  - Row pick subscription: `examples/basic/src/Realtime.jsx:57`
  - Start/Stop/Step controls and interval updates: `examples/basic/src/Realtime.jsx:96–139`

- Benchmark — baseline vs granular
  - Baseline Context-like updates: `examples/basic/src/Bench.jsx:34–87`
  - Granule store updates: `examples/basic/src/Bench.jsx:93–115`, `examples/basic/src/Bench.jsx:151–155`

### Run Examples

```bash
cd examples/basic
npm install
npm run dev
# open http://127.0.0.1:5173/
```

### Development Scripts

```bash
npm install
npm run typecheck
npm run build
npm test
```

Note: tests bootstrap `crypto` for Node < 18 via `tests/polyfill.cjs` and Vitest setup in `vitest.config.ts`.

## Motivation

Avoid unnecessary re-renders by subscribing components to exactly the state paths they read. When unrelated paths change, subscribers are not notified. This is especially effective for dashboards, tables, and real-time UIs.

## License

MIT
