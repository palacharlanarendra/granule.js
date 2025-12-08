<img width="300" height="150" alt="Gemini_Generated_Image_ps56z7ps56z7ps56-Photoroom" src="https://github.com/user-attachments/assets/35cb6dc5-125f-4b11-9ca6-881d459a986d" />

Granular state for React. Subscribe components to the exact paths they read, and re-render only when those paths change.

## Install

```bash
npm install granule-js
```

Peer dependency: `react >= 18`.

## Use It

```tsx
import { createStore, useGranular } from "granule-js";

const store = createStore({ user: { name: "John", age: 22 }, theme: "light" });

function Profile() {
  const name = useGranular(store, s => s.user.name);      // function selector
  const theme = useGranular(store, { path: 'theme' });     // path selector
  const user = useGranular(store, {                        // pick selector
    from: s => s.user,
    pick: ['name','age']
  });
  return <h1>{name} — {theme} ({user.age})</h1>;
}

// Mutate
store.set(s => { s.user.age += 1 });            // deep proxy tracking
store.setAt('user.name', 'Jane');               // path set
store.updateAt('user.age', a => (a as number) + 1); // path update
```

## Examples

- `examples/basic` (Vite + React):
  - Coins (Granule): row-level picks
  - Coins (Cells): cell-level subscriptions
  - Real-time: frequent updates
  - Benchmark: baseline vs granular

Run locally:

```bash
cd examples/basic
npm install
npm run dev
```

## Why Granule

- Precise subscriptions (path-based)
- Minimal renders (only affected subscribers re-render)
- React-safe (`useSyncExternalStore`)

## Dev

```bash
npm run typecheck
npm run build
npm test
```

MIT
