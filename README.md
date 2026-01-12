<img width="350" height="150" alt="Screenshot 2025-12-09 at 12 43 38 AM" src="https://github.com/user-attachments/assets/71791844-572c-4425-8200-d0074571f433" />

Granule.js is an experimental, fine-grained state engine for React, designed to explore how far performance can be pushed when updates are tightly scoped.

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

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin)](https://www.linkedin.com/in/YOUR_USERNAME/)
