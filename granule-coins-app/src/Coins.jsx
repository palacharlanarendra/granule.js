import { useEffect, useMemo, useRef, useState, memo, Profiler } from "react";
import { createStore, useGranular } from "../../dist/index.js";

function RenderBadge({ label }) {
  const ref = useRef(0);
  ref.current += 1;
  return (
    <span style={{ marginLeft: 8, fontSize: 12, color: "#58667e" }}>
      ({label} renders: {ref.current})
    </span>
  );
}

function makeCoins(count) {
  const names = ["Bitcoin","Ethereum","Tether","BNB","Solana","XRP","USDC","Cardano","Dogecoin","TRON"];
  const symbols = ["BTC","ETH","USDT","BNB","SOL","XRP","USDC","ADA","DOGE","TRX"];
  const coins = [];
  for (let i = 0; i < count; i++) {
    const n = names[i % names.length];
    const s = symbols[i % symbols.length];
    const base = 0.5 + Math.random() * 50000;
    const supply = 1e6 + Math.floor(Math.random() * 9e8);
    const vol = Math.floor(Math.random() * 5e9);
    coins.push({ id: i + 1, rank: i + 1, name: `${n} ${i + 1}`, symbol: `${s}${i + 1}`, price: Math.round(base * 100) / 100, change24h: 0, marketCap: supply * base, volume24h: vol });
  }
  return coins;
}

function formatNumber(n) {
  return Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}

function PriceCell({ value }) {
  const cls = value.change24h > 0 ? "cmc-change up" : value.change24h < 0 ? "cmc-change down" : "cmc-change";
  return (
    <div className="cmc-pricebox">
      <span className="cmc-price">${formatNumber(value.price)}</span>
      <span className={cls}>{value.change24h >= 0 ? "+" : ""}{formatNumber(value.change24h)}%</span>
      <RenderBadge label="cell" />
    </div>
  );
}

function eqlCoin(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id && a.rank === b.rank && a.name === b.name && a.symbol === b.symbol && a.price === b.price && a.change24h === b.change24h && a.marketCap === b.marketCap && a.volume24h === b.volume24h;
}

function ProfilerBox({ id, children }) {
  const statsRef = useRef({ commits: 0, totalActual: 0, totalBase: 0 });
  const viewRef = useRef(null);
  const onRender = (pid, phase, actualDuration, baseDuration) => {
    const s = statsRef.current;
    s.commits += 1;
    s.totalActual += actualDuration;
    s.totalBase += baseDuration;
  };
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = statsRef.current;
      if (viewRef.current) {
        const avg = s.commits ? s.totalActual / s.commits : 0;
        viewRef.current.textContent = `commits: ${s.commits} • total actual: ${s.totalActual.toFixed(2)} ms • avg actual: ${avg.toFixed(2)} ms`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div>
      <Profiler id={id} onRender={onRender}>{children}</Profiler>
      <div ref={viewRef} style={{ fontSize: 12, color: "#58667e", marginTop: 4 }} />
    </div>
  );
}

const GranuleCoinRow = memo(function GranuleCoinRow({ store, index }) {
  const data = useGranular(store, (s) => {
    const c = s.coins[index];
    return { id: c.id, rank: c.rank, name: c.name, symbol: c.symbol, price: c.price, change24h: c.change24h, marketCap: c.marketCap, volume24h: c.volume24h };
  }, { isEqual: eqlCoin });
  return (
    <tr className="cmc-row">
      <td className="cmc-rank">{data.rank}</td>
      <td className="cmc-cell"><strong className="cmc-name-main">{data.name}</strong> <span className="cmc-symbol">{data.symbol}</span></td>
      <td className="cmc-cell"><PriceCell value={{ price: data.price, change24h: data.change24h }} /></td>
      <td className="cmc-cell">${formatNumber(data.marketCap)}</td>
      <td className="cmc-cell">${formatNumber(data.volume24h)}</td>
    </tr>
  );
});

function GranuleCoinsTable({ count = 500, updatesPerTick = 20, tickMs = 250 }) {
  const store = useMemo(() => createStore({ coins: makeCoins(count), running: false }), [count]);
  const running = useGranular(store, (s) => s.running);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      store.set((s) => {
        for (let k = 0; k < updatesPerTick; k++) {
          const i = Math.floor(Math.random() * count);
          const p = s.coins[i].price;
          const delta = (Math.random() - 0.5) * 2;
          const next = Math.max(0, p * (1 + delta / 100));
          s.coins[i].price = Math.round(next * 100) / 100;
          s.coins[i].change24h = delta;
        }
      });
    }, tickMs);
    return () => clearInterval(id);
  }, [running, store, count, updatesPerTick, tickMs]);
  return (
    <div className="section-card">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <button onClick={() => store.set((s) => { s.running = true; })}>Start</button>
        <button onClick={() => store.set((s) => { s.running = false; })}>Stop</button>
      </div>
      <div className="cmc-table-wrap">
        <table className="cmc-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Price</th>
              <th>Market Cap</th>
              <th>Volume (24h)</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: count }).map((_, i) => (
              <GranuleCoinRow key={i} store={store} index={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ padding: 16 }}>
      <h2>Coins (Granule)</h2>
      <ProfilerBox id="granule-table">
        <GranuleCoinsTable />
      </ProfilerBox>
    </div>
  );
}
