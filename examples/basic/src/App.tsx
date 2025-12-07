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
  if (hash === '' || hash === '/') return '/';
  if (hash.startsWith('/bench')) return 'bench';
  if (hash.startsWith('/coins-granule')) return 'coins-granule';
  if (hash.startsWith('/coins-baseline')) return 'coins-baseline';
  if (hash.startsWith('/coins-cells')) return 'coins-cells';
  if (hash.startsWith('/realtime')) return 'realtime';
  if (hash.startsWith('/dashboard')) return 'dashboard';
  return '/';
}

function App() {
  const [route, setRoute] = useState(getRouteFromHash());
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  useEffect(() => { setMenuOpen(false) }, [route])

  return (
    <>
      <header className="app-navbar">
        <div className="app-bar">
          <h1 className="app-brand">Granule.js</h1>
          <button className="nav-toggle" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">☰</button>
          <nav className="app-nav desktop">
            <NavLinks route={route} />
          </nav>
        </div>
        {menuOpen && (
          <div className="mobile-nav">
            <nav className="app-nav">
              <NavLinks route={route} />
            </nav>
          </div>
        )}
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
          ) : route === '/' ? (
            <Home />
          ) : route === 'dashboard' ? (
            <Dashboard />
          ) : (
            <Home />
          )}
        </div>
      </main>
    </>
  )
}

export default App

function NavLinks({ route }: { route: string }) {
  return (
    <>
      <a href="#/" className={route === '/' ? 'active' : undefined}>Home</a>
      <a href="#/dashboard" className={route === 'dashboard' ? 'active' : undefined}>Granule vs Baseline</a>
      <a href="#/coins-granule" className={route === 'coins-granule' ? 'active' : undefined}>Coins (Granule)</a>
      <a href="#/coins-baseline" className={route === 'coins-baseline' ? 'active' : undefined}>Coins (Baseline)</a>
      <a href="#/coins-cells" className={route === 'coins-cells' ? 'active' : undefined}>Coins (Cells)</a>
      <a href="#/realtime" className={route === 'realtime' ? 'active' : undefined}>Real-time</a>
      <a href="#/bench" className={route === 'bench' ? 'active' : undefined}>Benchmark</a>
    </>
  )
}

function Home() {
  const [copiedCart, setCopiedCart] = useState(false)
  const [copiedProfile, setCopiedProfile] = useState(false)
  const snippetCart = `npm i granule-js\n\nimport { createStore, useGranular } from 'granule-js'\n\nconst store = createStore({ cart: { total: 0, items: [] } })\n\nfunction Total() {\n  const total = useGranular(store, s => s.cart.total)\n  return (<div>\${'{'}total{'}'}<\/div>)\n}\n\nfunction Item({ index }: { index: number }) {\n  const item = useGranular(store, { from: s => s.cart.items[index], pick: ['name','qty'] }) as any\n  return (<div>\${'{'}item.name{'}'} × \${'{'}item.qty{'}'}<\/div>)\n}\n\nstore.set(draft => {\n  draft.cart.total += 10\n  draft.cart.items.push({ name: 'Book', qty: 1 })\n})`
  const snippetProfile = `npm i granule-js\n\nimport { createStore, useGranular } from 'granule-js'\n\nconst store = createStore({ user: { name: 'John', age: 30 } })\n\nfunction Profile() {\n  const name = useGranular(store, s => s.user.name)\n  const age = useGranular(store, s => s.user.age)\n  return (\n    <div>\n      <div>\${'{'}name{'}'}<\/div>\n      <div>\${'{'}age{'}'}<\/div>\n    </div>\n  )\n}\n\nstore.set(draft => { draft.user.age += 1 })`
  const handleCopy = async (text: string, setFlag: (v: boolean) => void) => {
    try { await navigator.clipboard.writeText(text) } catch (_) {}
    setFlag(true)
    setTimeout(() => setFlag(false), 1200)
  }
  return (
    <div>
      <div className="home-hero">
        <h2 className="app-title">Granule.js</h2>
        <p className="home-subtitle">Fine-grained React state for React. Subscribe to exactly what you read and re-render only where it matters.</p>
        <div className="home-actions">
          <a className="btn primary" href="https://www.npmjs.com/package/granule-js" target="_blank" rel="noreferrer">Install granule-js</a>
          <a className="btn" href="#/dashboard">See Granule vs Baseline</a>
        </div>
      </div>

      <div className="home-columns">
        <div className="section-card">
          <h3 className="home-section-title">About Granule.js</h3>
          <p className="home-paragraph">Granule.js is a tiny state library that gives React components granular subscriptions to your store. Instead of re-rendering broad trees on any change, components subscribe to precise paths or picked fields, so only the pieces that actually change re-render.</p>
          <p className="home-paragraph">This makes large tables, dashboards, and real-time views feel snappy even under heavy update load. You keep React, JSX, and your mental model — you just stop wasting renders.</p>
          <div className="home-actions">
            <a className="btn" href="#/realtime">See real-time demo</a>
            <a className="btn" href="#/coins-granule">Open coins (granule)</a>
          </div>
        </div>
        <div className="section-card">
          <h3 className="home-section-title">How it works</h3>
          <ul className="home-list">
            <li>Create a store with plain objects.</li>
            <li>Read state with <code>useGranular</code> by path or by picking fields.</li>
            <li>Update via immutable drafts; only affected subscribers re-render.</li>
          </ul>
          <div className="code-block">
            <div className="code-actions"><button className="btn small" onClick={() => handleCopy(snippetCart, setCopiedCart)}>{copiedCart ? 'Copied' : 'Copy'}</button></div>
            <pre><code>{snippetCart}</code></pre>
          </div>
          <div className="home-actions">
            <a className="btn primary" href="#/dashboard">Compare granule vs baseline</a>
            <a className="btn" href="#/bench">Run benchmark</a>
          </div>
        </div>
      </div>

      <div className="section-card" style={{ marginTop: 16 }}>
        <h3 className="home-section-title">Get started</h3>
        <div className="code-block">
          <div className="code-actions"><button className="btn small" onClick={() => handleCopy(snippetProfile, setCopiedProfile)}>{copiedProfile ? 'Copied' : 'Copy'}</button></div>
          <pre><code>{snippetProfile}</code></pre>
        </div>
        <div className="home-actions">
          <a className="btn primary" href="#/coins-granule">Try the Coins demo</a>
          <a className="btn" href="#/bench">Run the Benchmark</a>
        </div>
      </div>

      <h3 className="home-section-title" style={{ marginTop: 24 }}>Explore examples</h3>
      <div className="grid-home">
        <a className="home-card" href="#/dashboard">
          <h3>Granule vs Baseline</h3>
          <p>Side-by-side coins tables. Granule re-renders only changed rows; baseline re-renders broadly.</p>
          <span className="btn">Open</span>
        </a>
        <a className="home-card" href="#/coins-granule">
          <h3>Coins (Granule)</h3>
          <p>500 rows with random price updates. Rows subscribe to picked fields for minimal re-renders.</p>
          <span className="btn">Open</span>
        </a>
        <a className="home-card" href="#/coins-baseline">
          <h3>Coins (Baseline)</h3>
          <p>Same dataset using React state. Observe broader re-renders on any state change.</p>
          <span className="btn">Open</span>
        </a>
        <a className="home-card" href="#/coins-cells">
          <h3>Coins (Cells)</h3>
          <p>Cell-level subscriptions. Each cell reads its own path for extreme granularity.</p>
          <span className="btn">Open</span>
        </a>
        <a className="home-card" href="#/realtime">
          <h3>Real-time</h3>
          <p>Live prices via API polling. Updates propagate only to components that read changed paths.</p>
          <span className="btn">Open</span>
        </a>
        <a className="home-card" href="#/bench">
          <h3>Benchmark</h3>
          <p>Measure commit timing under global vs item updates to compare rendering costs.</p>
          <span className="btn">Open</span>
        </a>
      </div>

      <div className="section-card" style={{ marginTop: 24 }}>
        <h3 className="home-section-title">Why Granule.js</h3>
        <ul className="home-list">
          <li>Subscribe to paths or picks without component-wide dependencies.</li>
          <li>Update with immutable drafts while preserving fine-grained subscriptions.</li>
          <li>Scale to hundreds of rows with controlled re-render pressure.</li>
        </ul>
        <div className="home-actions">
          <a className="btn primary" href="#/dashboard">Start with the dashboard</a>
          <a className="btn" href="#/coins-granule">Jump to coins</a>
        </div>
      </div>
    </div>
  )
}

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
