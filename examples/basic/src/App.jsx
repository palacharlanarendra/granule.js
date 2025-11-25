import { useRef, useState, useEffect } from 'react'
import './App.css'
import { store } from './store.js'
import { useGranular } from '../../../dist/index.js'
import { BaselineProvider, useBaseline } from './baselineStore.jsx'
import Bench from './Bench.jsx'

function RenderCountBadge({ label }) {
  const rendersRef = useRef(0);
  rendersRef.current += 1;
  return (
    <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>
      ({label} renders: {rendersRef.current})
    </span>
  );
}

function ProfileName() {
  const name = useGranular(store, (s) => s.user.name);
  return (
    <div>
      <strong>Name:</strong> {name}
      <RenderCountBadge label="Name" />
    </div>
  );
}

function AgeDisplay() {
  const age = useGranular(store, (s) => s.user.age, { debug: true });
  return (
    <div>
      <strong>Age:</strong> {age}
      <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>
        (raw: {store.get().user.age})
      </span>
      <RenderCountBadge label="Age" />
    </div>
  );
}

function ThemeDisplay() {
  const theme = useGranular(store, (s) => s.theme);
  return (
    <div>
      <strong>Theme:</strong> {theme}
      <RenderCountBadge label="Theme" />
    </div>
  );
}

function Controls() {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <button onClick={() => {
        store.set((s) => { s.user.age += 1; });
        // debug: verify state changed
        // eslint-disable-next-line no-console
        console.log("[demo] age after click:", store.get().user.age);
      }}>
        Increment Age
      </button>
      <button onClick={() => {
        for (let i = 0; i < 5; i++) {
          store.set((s) => { s.user.age += 1; });
        }
        // eslint-disable-next-line no-console
        console.log("[demo] age after 5x:", store.get().user.age);
      }}>
        Increment Age x5
      </button>
      <button onClick={() => store.set((s) => { s.user.name = s.user.name === 'John' ? 'Jane' : 'John'; })}>
        Toggle Name
      </button>
      <button onClick={() => store.set((s) => { s.theme = s.theme === 'dark' ? 'light' : 'dark'; })}>
        Toggle Theme
      </button>
    </div>
  );
}

function getRouteFromHash() {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash.startsWith('/bench')) return 'bench';
  return 'dashboard';
}

function App() {
  const [route, setRoute] = useState(getRouteFromHash());
  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Granule.js Demo</h1>
      <nav style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <a href="#/">Dashboard</a>
        <a href="#/bench">Benchmark</a>
      </nav>
      {route === 'bench' ? (
        <Bench />
      ) : (
        <Dashboard />
      )}
    </div>
  )
}

export default App

function Dashboard() {
  return (
    <div>
      <p>Left: Granular subscriptions. Right: Baseline Context (no granules).</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <h2 style={{ marginTop: 0 }}>Granule</h2>
          <ProfileName />
          <AgeDisplay />
          <ThemeDisplay />
          <Controls />
        </div>
        <div>
          <BaselineProvider>
            <h2 style={{ marginTop: 0 }}>Baseline (Context)</h2>
            <BaselineProfileName />
            <BaselineAgeDisplay />
            <BaselineThemeDisplay />
            <BaselineControls />
          </BaselineProvider>
        </div>
      </div>
      <p style={{ marginTop: 16, color: '#666' }}>
        Compare render counters: baseline typically re-renders more on unrelated updates.
      </p>
    </div>
  );
}

function BaselineProfileName() {
  const { state } = useBaseline();
  return (
    <div>
      <strong>Name:</strong> {state.user.name}
      <RenderCountBadge label="Baseline Name" />
    </div>
  );
}

function BaselineAgeDisplay() {
  const { state } = useBaseline();
  return (
    <div>
      <strong>Age:</strong> {state.user.age}
      <RenderCountBadge label="Baseline Age" />
    </div>
  );
}

function BaselineThemeDisplay() {
  const { state } = useBaseline();
  return (
    <div>
      <strong>Theme:</strong> {state.theme}
      <RenderCountBadge label="Baseline Theme" />
    </div>
  );
}

function BaselineControls() {
  const { incrementAge, toggleName, toggleTheme } = useBaseline();
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <button onClick={incrementAge}>Increment Age</button>
      <button onClick={toggleName}>Toggle Name</button>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
