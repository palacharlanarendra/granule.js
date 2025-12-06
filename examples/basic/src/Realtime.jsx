import { useEffect, useMemo, useRef, useState, memo } from "react"
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

function formatNumber(n) {
  return Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)
}

function PriceCell({ value }) {
  const cls = value.change24h > 0 ? "cmc-change up" : value.change24h < 0 ? "cmc-change down" : "cmc-change"
  return (
    <div className="cmc-pricebox">
      <span className="cmc-price">${formatNumber(value.price)}</span>
      <span className={cls}>{value.change24h >= 0 ? "+" : ""}{formatNumber(value.change24h)}%</span>
      <RenderBadge label="cell" />
    </div>
  )
}

const pairs = [
  { id: 1, rank: 1, name: "Bitcoin", symbol: "BTCUSDT", symbolView: "BTC" },
  { id: 2, rank: 2, name: "Ethereum", symbol: "ETHUSDT", symbolView: "ETH" },
  { id: 3, rank: 3, name: "BNB", symbol: "BNBUSDT", symbolView: "BNB" },
  { id: 4, rank: 4, name: "Solana", symbol: "SOLUSDT", symbolView: "SOL" },
  { id: 5, rank: 5, name: "XRP", symbol: "XRPUSDT", symbolView: "XRP" },
  { id: 6, rank: 6, name: "Cardano", symbol: "ADAUSDT", symbolView: "ADA" },
  { id: 7, rank: 7, name: "Dogecoin", symbol: "DOGEUSDT", symbolView: "DOGE" },
  { id: 8, rank: 8, name: "TRON", symbol: "TRXUSDT", symbolView: "TRX" },
  { id: 9, rank: 9, name: "Polygon", symbol: "MATICUSDT", symbolView: "MATIC" },
  { id: 10, rank: 10, name: "Litecoin", symbol: "LTCUSDT", symbolView: "LTC" },
]

function makeInitialCoins() {
  return pairs.map(p => ({
    id: p.id,
    rank: p.rank,
    name: p.name,
    symbol: p.symbolView,
    price: 0,
    change24h: 0,
    marketCap: 0,
    volume24h: 0,
    symkey: p.symbol,
  }))
}

const Row = memo(function Row({ store, index, agg }) {
  const data = useGranular(store, { from: s => s.coins[index], pick: ["id","rank","name","symbol","price","change24h"] })
  const rendersRef = useRef(0)
  rendersRef.current += 1
  if (agg) {
    agg.current.rows[index] = rendersRef.current
    agg.current.total += 1
  }
  return (
    <tr className="cmc-row">
      <td className="cmc-rank">{data.rank}</td>
      <td className="cmc-cell">
        <strong className="cmc-name-main">{data.name}</strong> <span className="cmc-symbol">{data.symbol}</span>
        <RenderBadge label={`RT-${index}`} />
      </td>
      <td className="cmc-cell"><PriceCell value={{ price: data.price, change24h: data.change24h }} /></td>
      <td className="cmc-cell">${formatNumber(0)}</td>
      <td className="cmc-cell">${formatNumber(0)}</td>
    </tr>
  )
})

export default function Realtime() {
  const count = pairs.length
  const store = useMemo(() => createStore({ coins: makeInitialCoins(), running: false }), [])
  const running = useGranular(store, s => s.running)
  const agg = useRef({ rows: new Uint32Array(count), total: 0 })
  const [stats, setStats] = useState({ totalRenders: 0 })

  useEffect(() => {
    if (!running) return
    const symbols = pairs.map(p => p.symbol)
    const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`
    let id = setInterval(async () => {
      try {
        const res = await fetch(url)
        const data = await res.json()
        store.set(s => {
          for (const item of data) {
            const idx = s.coins.findIndex(c => c.symkey === item.symbol)
            if (idx >= 0) {
              const prev = s.coins[idx].price
              const next = parseFloat(item.price)
              const delta = prev > 0 ? ((next - prev) / prev) * 100 : 0
              s.coins[idx].price = Math.round(next * 100) / 100
              s.coins[idx].change24h = delta
            }
          }
        })
        setStats({ totalRenders: agg.current.total })
      } catch (_) {
      }
    }, 1000)
    return () => clearInterval(id)
  }, [running, store])

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <button onClick={() => store.set(s => { s.running = true })}>Start</button>
        <button onClick={() => store.set(s => { s.running = false })}>Stop</button>
        <button onClick={async () => {
          const symbols = pairs.map(p => p.symbol)
          const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`
          try {
            const res = await fetch(url)
            const data = await res.json()
            store.set(s => {
              for (const item of data) {
                const idx = s.coins.findIndex(c => c.symkey === item.symbol)
                if (idx >= 0) {
                  const prev = s.coins[idx].price
                  const next = parseFloat(item.price)
                  const delta = prev > 0 ? ((next - prev) / prev) * 100 : 0
                  s.coins[idx].price = Math.round(next * 100) / 100
                  s.coins[idx].change24h = delta
                }
              }
            })
            setStats({ totalRenders: agg.current.total })
          } catch (_) {
          }
        }}>Step</button>
        <div style={{ fontSize: 12, color: "#333", fontWeight: 600 }}>Rows: {count} • Total row renders: {stats.totalRenders}</div>
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
              <Row key={i} store={store} index={i} agg={agg} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
