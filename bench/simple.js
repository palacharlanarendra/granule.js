// Simple benchmark: compare targeted notifications vs broadcast
import { createStore } from "../dist/index.js";

function benchmark() {
  const store = createStore({
    user: { name: "John", age: 22 },
    theme: "dark",
    items: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: i })),
  });
  store.enableDebug(true);

  const listeners = [];
  const ids = [];
  const notifiedCounts = new Map();

  // Register 100 listeners: half subscribe to user.name, half to items[0].value
  for (let i = 0; i < 100; i++) {
    const id = Symbol(`bench_${i}`);
    ids.push(id);
    const fn = () => {
      notifiedCounts.set(id, (notifiedCounts.get(id) || 0) + 1);
    };
    listeners.push(fn);
    store.subscribeComponent(id, fn);
    const path = i % 2 === 0 ? "user.name" : "items.0.value";
    store.updateComponentPaths(id, new Set([path]));
  }

  // Case 1: change age (should notify none of name subscribers)
  store.set((s) => {
    s.user.age = 23;
  });

  const case1Notified = Array.from(notifiedCounts.values()).reduce((a, b) => a + b, 0);

  // Case 2: change name (should notify ~50 subscribers)
  store.set((s) => {
    s.user.name = "Jane";
  });
  const case2Notified = Array.from(notifiedCounts.values()).reduce((a, b) => a + b, 0) - case1Notified;

  // Case 3: change items[0].value (should notify ~50 subscribers)
  store.set((s) => {
    s.items[0].value = 999;
  });
  const totalNotified = Array.from(notifiedCounts.values()).reduce((a, b) => a + b, 0);
  const case3Notified = totalNotified - case1Notified - case2Notified;

  console.log("Granule.js benchmark results:");
  console.log("- Notified after age change (expect ~0):", case1Notified);
  console.log("- Notified after name change (expect ~50):", case2Notified);
  console.log("- Notified after items[0].value change (expect ~50):", case3Notified);
}

benchmark();