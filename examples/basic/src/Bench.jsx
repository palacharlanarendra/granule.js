import { useMemo, useState, useRef } from "react";
import { createStore, useGranular } from "../../../dist/index.js";

function RenderBadge({ label }) {
  const ref = useRef(0);
  ref.current += 1;
  return (
    <span style={{ marginLeft: 8, fontSize: 12, color: "#444" }}>
      ({label} renders: {ref.current})
    </span>
  );
}

// Baseline bench uses a simple Context-like state via useState.
function BaselineBenchSection({ count = 300 }) {
  const [state, setState] = useState(() => ({
    items: Array.from({ length: count }, () => ({ value: 0 })),
    globalCounter: 0,
  }));

  const runGlobal = async (times = 200) => {
    const t0 = performance.now();
    for (let i = 0; i < times; i++) {
      await new Promise((r) => setTimeout(r, 0));
      setState((prev) => ({
        ...prev,
        globalCounter: prev.globalCounter + 1,
      }));
    }
    const t1 = performance.now();
    return { ms: Math.round(t1 - t0), times };
  };

  const runItem = async (index = 0, times = 200) => {
    const t0 = performance.now();
    for (let i = 0; i < times; i++) {
      await new Promise((r) => setTimeout(r, 0));
      setState((prev) => {
        const next = { ...prev };
        // naive copy to simulate common immutable update
        const items = next.items.slice();
        items[index] = { value: items[index].value + 1 };
        next.items = items;
        return next;
      });
    }
    const t1 = performance.now();
    return { ms: Math.round(t1 - t0), times };
  };

  const [resultGlobal, setResultGlobal] = useState(null);
  const [resultItem, setResultItem] = useState(null);

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Baseline (Context-like)</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={async () => setResultGlobal(await runGlobal(200))}>
          Run global updates x200
        </button>
        <button onClick={async () => setResultItem(await runItem(0, 200))}>
          Run item[0] updates x200
        </button>
      </div>
      <div style={{ fontSize: 12, color: "#333", marginBottom: 8 }}>
        {resultGlobal && (
          <div>Global: {resultGlobal.times} updates in {resultGlobal.ms} ms</div>
        )}
        {resultItem && (
          <div>Item[0]: {resultItem.times} updates in {resultItem.ms} ms</div>
        )}
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Global counter:</strong> {state.globalCounter}
        <RenderBadge label="B-global" />
      </div>
      <div style={{ height: 240, overflow: "auto", border: "1px solid #bbb", padding: 8 }}>
        {state.items.map((item, i) => (
          <div key={i}>
            <span>Item {i}: {item.value}</span>
            <RenderBadge label={`B-${i}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function GranuleBenchSection({ count = 300 }) {
  const store = useMemo(() => createStore({
    items: Array.from({ length: count }, () => ({ value: 0 })),
    globalCounter: 0,
  }), [count]);

  const globalValue = useGranular(store, (s) => s.globalCounter);

  const runGlobal = async (times = 200) => {
    const t0 = performance.now();
    for (let i = 0; i < times; i++) {
      await new Promise((r) => setTimeout(r, 0));
      store.set((draft) => { draft.globalCounter += 1; });
    }
    const t1 = performance.now();
    return { ms: Math.round(t1 - t0), times };
  };

  const runItem = async (index = 0, times = 200) => {
    const t0 = performance.now();
    for (let i = 0; i < times; i++) {
      await new Promise((r) => setTimeout(r, 0));
      store.set((draft) => { draft.items[index].value += 1; });
    }
    const t1 = performance.now();
    return { ms: Math.round(t1 - t0), times };
  };

  const [resultGlobal, setResultGlobal] = useState(null);
  const [resultItem, setResultItem] = useState(null);

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Granule (useGranular)</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={async () => setResultGlobal(await runGlobal(200))}>
          Run global updates x200
        </button>
        <button onClick={async () => setResultItem(await runItem(0, 200))}>
          Run item[0] updates x200
        </button>
      </div>
      <div style={{ fontSize: 12, color: "#333", marginBottom: 8 }}>
        {resultGlobal && (
          <div>Global: {resultGlobal.times} updates in {resultGlobal.ms} ms</div>
        )}
        {resultItem && (
          <div>Item[0]: {resultItem.times} updates in {resultItem.ms} ms</div>
        )}
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Global counter:</strong> {globalValue}
        <RenderBadge label="G-global" />
      </div>
      <div style={{ height: 240, overflow: "auto", border: "1px solid #eee", padding: 8 }}>
        {Array.from({ length: count }).map((_, i) => (
          <GranuleItem key={i} store={store} index={i} />
        ))}
      </div>
    </div>
  );
}

function GranuleItem({ store, index }) {
  const value = useGranular(store, (s) => s.items[index].value);
  return (
    <div>
      <span>Item {index}: {value}</span>
      <RenderBadge label={`G-${index}`} />
    </div>
  );
}

export default function Bench() {
  return (
    <div style={{ marginTop: 24 }}>
      <h2>Benchmark: Large List Updates</h2>
      <p style={{ color: "#666" }}>
        Each section renders 300 items. Run 200 updates to either a global field or a single item.
        Baseline Context re-renders most items on any state change; Granule re-renders only subscribers of changed paths.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <GranuleBenchSection />
        <BaselineBenchSection />
      </div>
    </div>
  );
}
