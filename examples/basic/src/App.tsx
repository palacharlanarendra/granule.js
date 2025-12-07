import { useRef, useState, useEffect } from 'react'
import './App.css'
import { store } from './store'
import { useGranular } from 'granule-js'
import { BaselineProvider, useBaseline } from './baselineStore'
import Bench from './Bench'
import { CoinsGranule, CoinsBaseline } from './Coins'
import Realtime from './Realtime'
import CoinsCells from './CoinsCells'

function RenderCountBadge({ label }: { label: string }) {
  const rendersRef = useRef(0);
  rendersRef.current += 1;
  return (
    <span style={{ marginLeft: 8, fontSize: 12, color: '#444' }}>
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
      <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>
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
        console.log("[demo] age after click:", store.get().user.age);
      }}>
        Increment Age
      </button>
      <button onClick={() => {
        for (let i = 0; i < 5; i++) {
          store.set((s) => { s.user.age += 1; });
        }
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
  if (hash.startsWith('/coins-granule')) return 'coins-granule';
  if (hash.startsWith('/coins-baseline')) return 'coins-baseline';
  if (hash.startsWith('/coins-cells')) return 'coins-cells';
  if (hash.startsWith('/realtime')) return 'realtime';
  if (hash.startsWith('/dashboard')) return 'dashboard';
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
    <>
      <header className="app-navbar">
        <div className="app-bar">
          <h1 className="app-brand">Granule.js Examples</h1>
          <nav className="app-nav">
            <a href="#/dashboard">Granule vs Baseline</a>
            <a href="#/coins-granule">Coins (Granule)</a>
            <a href="#/coins-baseline">Coins (Baseline)</a>
            <a href="#/coins-cells">Coins (Cells)</a>
            <a href="#/realtime">Real-time</a>
            <a href="#/bench">Benchmark</a>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <div style={{ padding: 16 }}>
          {route === 'bench' ? (
            <Bench />
          ) : route === 'coins-granule' ? (
            <CoinsGranule />
          ) : route === 'coins-baseline' ? (
            <CoinsBaseline />
          ) : route === 'coins-cells' ? (
            <CoinsCells />
          ) : route === 'realtime' ? (
            <Realtime />
          ) : route === 'dashboard' ? (
            <Dashboard />
          ) : (
            <Dashboard />
          )}
        </div>
      </main>
    </>
  )
}

export default App

function Dashboard() {
  return (
    <div>
      <p>Left: Granular subscriptions. Right: Baseline Context (no granules).</p>
      <div className="split-3">
        <div className="section-card">
          <h2 style={{ marginTop: 0 }}>Granule</h2>
          <ProfileName />
          <AgeDisplay />
          <ThemeDisplay />
          <Controls />
        </div>
        <div className="split-divider"></div>
        <div className="section-card">
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

function DashboardGranule() {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Granule</h2>
      <ProfileName />
      <AgeDisplay />
      <ThemeDisplay />
      <Controls />
    </div>
  );
}

function DashboardBaseline() {
  return (
    <BaselineProvider>
      <div>
        <h2 style={{ marginTop: 0 }}>Baseline (Context)</h2>
        <BaselineProfileName />
        <BaselineAgeDisplay />
        <BaselineThemeDisplay />
        <BaselineControls />
      </div>
    </BaselineProvider>
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
