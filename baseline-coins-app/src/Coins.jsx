import { useEffect, useRef, useState, Profiler } from "react";

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

function PriceCell({ price, change24h }) {
  const cls = change24h > 0 ? "cmc-change up" : change24h < 0 ? "cmc-change down" : "cmc-change";
  return (
    <div className="cmc-pricebox">
      <span className="cmc-price">${formatNumber(price)}</span>
      <span className={cls}>{change24h >= 0 ? "+" : ""}{formatNumber(change24h)}%</span>
      <RenderBadge label="cell" />
    </div>
  );
}

function BaselineCoinRow({ coin }) {
  return (
    <tr className="cmc-row">
      <td className="cmc-rank">{coin.rank}</td>
      <td className="cmc-cell"><strong className="cmc-name-main">{coin.name}</strong> <span className="cmc-symbol">{coin.symbol}</span></td>
      <td className="cmc-cell"><PriceCell price={coin.price} change24h={coin.change24h} /></td>
      <td className="cmc-cell">${formatNumber(coin.marketCap)}</td>
      <td className="cmc-cell">${formatNumber(coin.volume24h)}</td>
    </tr>
  );
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

function BaselineCoinsTable({ count = 500, updatesPerTick = 20, tickMs = 250 }) {
  const [state, setState] = useState(() => ({ coins: makeCoins(count), running: false }));
  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(() => {
      setState((prev) => {
        const coins = prev.coins.slice();
        for (let k = 0; k < updatesPerTick; k++) {
          const i = Math.floor(Math.random() * count);
          const c = coins[i];
          const delta = (Math.random() - 0.5) * 2;
          const next = Math.max(0, c.price * (1 + delta / 100));
          coins[i] = { ...c, price: Math.round(next * 100) / 100, change24h: delta };
        }
        return { coins, running: true };
      });
    }, tickMs);
    return () => clearInterval(id);
  }, [state.running, count, updatesPerTick, tickMs]);
  return (
    <div className="section-card">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <button onClick={() => setState((p) => ({ ...p, running: true }))}>Start</button>
        <button onClick={() => setState((p) => ({ ...p, running: false }))}>Stop</button>
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
            {state.coins.map((c, i) => (
              <BaselineCoinRow key={i} coin={c} />
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
      <h2>Coins (Baseline)</h2>
      <ProfilerBox id="baseline-table">
        <BaselineCoinsTable />
      </ProfilerBox>
    </div>
  );
}
