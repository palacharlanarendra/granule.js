import { useEffect, useMemo, useRef, useState, memo, Profiler } from "react"
import { createStore, useGranular } from "granule-js"

function RenderBadge({ label }) {
  const ref = useRef(0)
  ref.current += 1
  return (
    <span style={{ marginLeft: 8, fontSize: 12, color: "#58667e" }}>
      ({label} renders: {ref.current})
    </span>
  )
}

function makeCoins(count) {
  const names = ["Bitcoin","Ethereum","Tether","BNB","Solana","XRP","USDC","Cardano","Dogecoin","TRON"]
  const symbols = ["BTC","ETH","USDT","BNB","SOL","XRP","USDC","ADA","DOGE","TRX"]
  const coins = []
  for (let i = 0; i < count; i++) {
    const n = names[i % names.length]
    const s = symbols[i % symbols.length]
    const base = 0.5 + Math.random() * 50000
    const supply = 1e6 + Math.floor(Math.random() * 9e8)
    const vol = Math.floor(Math.random() * 5e9)
    coins.push({
      id: i + 1,
      rank: i + 1,
      name: `${n} ${i + 1}`,
      symbol: `${s}${i + 1}`,
      price: Math.round(base * 100) / 100,
      change24h: 0,
      marketCap: supply * base,
      volume24h: vol,
    })
  }
  return coins
}

function formatNumber(n) {
  return Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)
}

const RankCell = memo(function RankCell({ store, index }) {
  const rank = useGranular(store, { path: `coins.${index}.rank` })
  return <td className="cmc-rank">{rank}<RenderBadge label={`R-${index}`} /></td>
})

const NameCell = memo(function NameCell({ store, index }) {
  const data = useGranular(store, { from: s => s.coins[index], pick: ["name","symbol"] })
  return (
    <td className="cmc-cell">
      <strong className="cmc-name-main">{data.name}</strong> <span className="cmc-symbol">{data.symbol}</span>
      <RenderBadge label={`N-${index}`} />
    </td>
  )
})

function PriceBox({ value }) {
  const cls = value.change24h > 0 ? "cmc-change up" : value.change24h < 0 ? "cmc-change down" : "cmc-change"
  return (
    <div className="cmc-pricebox">
      <span className="cmc-price">${formatNumber(value.price)}</span>
      <span className={cls}>{value.change24h >= 0 ? "+" : ""}{formatNumber(value.change24h)}%</span>
      <RenderBadge label={`cell`} />
    </div>
  )
}

const PriceCell = memo(function PriceCell({ store, index }) {
  const data = useGranular(store, { from: s => s.coins[index], pick: ["price","change24h"] })
  return <td className="cmc-cell"><PriceBox value={data} /></td>
})

const MarketCapCell = memo(function MarketCapCell({ store, index }) {
  const marketCap = useGranular(store, { path: `coins.${index}.marketCap` })
  return <td className="cmc-cell">${formatNumber(marketCap)}<RenderBadge label={`MC-${index}`} /></td>
})

const VolumeCell = memo(function VolumeCell({ store, index }) {
  const volume = useGranular(store, { path: `coins.${index}.volume24h` })
  return <td className="cmc-cell">${formatNumber(volume)}<RenderBadge label={`V-${index}`} /></td>
})

const Row = memo(function Row({ store, index, agg }) {
  const rendersRef = useRef(0)
  rendersRef.current += 1
  if (agg) {
    agg.current.rows[index] = rendersRef.current
    agg.current.total += 1
  }
  return (
    <tr className="cmc-row">
      <RankCell store={store} index={index} />
      <NameCell store={store} index={index} />
      <PriceCell store={store} index={index} />
      <MarketCapCell store={store} index={index} />
      <VolumeCell store={store} index={index} />
    </tr>
  )
})

function ProfilerBox({ id, children }) {
  const statsRef = useRef({ commits: 0, totalActual: 0, totalBase: 0 })
  const viewRef = useRef(null)
  const onRender = (pid, phase, actualDuration, baseDuration) => {
    const s = statsRef.current
    s.commits += 1
    s.totalActual += actualDuration
    s.totalBase += baseDuration
  }
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const s = statsRef.current
      if (viewRef.current) {
        const avg = s.commits ? s.totalActual / s.commits : 0
        viewRef.current.textContent = `commits: ${s.commits} • total actual: ${s.totalActual.toFixed(2)} ms • avg actual: ${avg.toFixed(2)} ms`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div>
      <Profiler id={id} onRender={onRender}>{children}</Profiler>
      <div ref={viewRef} style={{ fontSize: 12, color: "#333", marginTop: 4 }} />
    </div>
  )
}

export default function CoinsCells() {
  const count = 500
  const updatesPerTick = 20
  const tickMs = 250
  const store = useMemo(() => createStore({ coins: makeCoins(count), running: false }), [])
  const running = useGranular(store, s => s.running)
  const agg = useRef({ rows: new Uint32Array(count), total: 0 })
  const [stats, setStats] = useState({ totalRenders: 0 })
  const [bench, setBench] = useState(null)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      store.set(s => {
        for (let k = 0; k < updatesPerTick; k++) {
          const i = Math.floor(Math.random() * count)
          const p = s.coins[i].price
          const delta = (Math.random() - 0.5) * 2
          const next = Math.max(0, p * (1 + delta / 100))
          s.coins[i].price = Math.round(next * 100) / 100
          s.coins[i].change24h = delta
        }
      })
      setStats({ totalRenders: agg.current.total })
    }, tickMs)
    return () => clearInterval(id)
  }, [running, store])

  return (
    <div style={{ marginTop: 24 }}>
      <h2>Coins: Cell-level Granule</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <button onClick={() => store.set(s => { s.running = true })}>Start</button>
        <button onClick={() => store.set(s => { s.running = false })}>Stop</button>
        <button onClick={() => store.set(s => {
          for (let k = 0; k < updatesPerTick; k++) {
            const i = Math.floor(Math.random() * count)
            const p = s.coins[i].price
            const delta = (Math.random() - 0.5) * 2
            const next = Math.max(0, p * (1 + delta / 100))
            s.coins[i].price = Math.round(next * 100) / 100
            s.coins[i].change24h = delta
          }
        })}>Step</button>
        <button onClick={async () => {
          const t0 = performance.now()
          for (let step = 0; step < 100; step++) {
            store.set(s => {
              for (let k = 0; k < updatesPerTick; k++) {
                const i = Math.floor(Math.random() * count)
                const p = s.coins[i].price
                const delta = (Math.random() - 0.5) * 2
                const next = Math.max(0, p * (1 + delta / 100))
                s.coins[i].price = Math.round(next * 100) / 100
                s.coins[i].change24h = delta
              }
            })
            await Promise.resolve()
          }
          const t1 = performance.now()
          setBench({ steps: 100, ms: Math.round(t1 - t0) })
        }}>Run 100 steps</button>
        <div style={{ fontSize: 12, color: "#333", fontWeight: 600 }}>Rows: {count} • Updates/tick: {updatesPerTick} • Total row renders: {stats.totalRenders}</div>
        {bench && (
          <div style={{ fontSize: 12, color: "#333", fontWeight: 600 }}>bench: {bench.steps} steps in {bench.ms} ms</div>
        )}
      </div>
      <div className="cmc-table-wrap">
        <ProfilerBox id="coins-cells">
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
                <Row key={i} store={store} index={i} agg={agg} />
              ))}
            </tbody>
          </table>
        </ProfilerBox>
      </div>
    </div>
  )
}
