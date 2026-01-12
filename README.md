## Project Status Update

I’ve decided to discontinue active development and maintenance of this repository.
After exploring the design space and real-world trade-offs, I don’t see a clear long-term scope or advantage worth pursuing further.
The repository will remain available for reference, but no new features, fixes, or support should be expected going forward.
Feel free to fork the repository if you’d like to experiment or continue the work independently.

<img width="350" height="150" alt="Screenshot 2025-12-09 at 12 43 38 AM" src="https://github.com/user-attachments/assets/71791844-572c-4425-8200-d0074571f433" />

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

## NPM
https://www.npmjs.com/package/granule-js

## To connect with me
https://www.linkedin.com/in/palacharla-narendra-180119201/
