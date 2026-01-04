import { useEffect, useMemo, useRef, useState, Profiler, memo, useCallback } from 'react'
import { createStore, useGranular } from 'granule-js'

type Row = { value: number }
type RowsStore = ReturnType<typeof createStore<{ rows: Row[] }>>

function makeRows(n: number): Row[] {
  const arr: Row[] = new Array(n)
  for (let i = 0; i < n; i++) arr[i] = { value: i }
  return arr
}

// Simulation of expensive derived logic or just propagation steps
const f1 = (n: number) => n
const f2 = (n: number) => n * 2
const f3 = (n: number) => n + 1
const f4 = (n: number) => n * 1.5
const f5 = (n: number) => n % 100

// Individual Cell Components for Granule (subscribing independently)
const GranuleCell1 = ({ store, index }: { store: RowsStore; index: number }) => {
  const val = useGranular(store, s => f1(s.rows[index]?.value ?? 0))
  const renders = useRef(0); renders.current += 1
  return <div className="cell">{val.toFixed(0)} <span className="r">r:{renders.current}</span></div>
}

const GranuleCell2 = ({ store, index }: { store: RowsStore; index: number }) => {
  const val = useGranular(store, s => f2(f1(s.rows[index]?.value ?? 0)))
  const renders = useRef(0); renders.current += 1
  return <div className="cell">{val.toFixed(0)} <span className="r">r:{renders.current}</span></div>
}

const GranuleCell3 = ({ store, index }: { store: RowsStore; index: number }) => {
  const val = useGranular(store, s => f3(f2(f1(s.rows[index]?.value ?? 0))))
  const renders = useRef(0); renders.current += 1
  return <div className="cell">{val.toFixed(0)} <span className="r">r:{renders.current}</span></div>
}

const GranuleCell4 = ({ store, index }: { store: RowsStore; index: number }) => {
  const val = useGranular(store, s => f4(f3(f2(f1(s.rows[index]?.value ?? 0)))))
  const renders = useRef(0); renders.current += 1
  return <div className="cell">{val.toFixed(0)} <span className="r">r:{renders.current}</span></div>
}

const GranuleCell5 = ({ store, index }: { store: RowsStore; index: number }) => {
  const val = useGranular(store, s => f5(f4(f3(f2(f1(s.rows[index]?.value ?? 0))))))
  const renders = useRef(0); renders.current += 1
  return <div className="cell">{val.toFixed(0)} <span className="r">r:{renders.current}</span></div>
}

const GranuleChainRow = memo(({ store, index, onRender }: { store: RowsStore; index: number; onRender: () => void }) => {
  const renders = useRef(0); renders.current += 1
  onRender() // Tracks Parent Render (should be 1)
  return (
    <div className="chain-row">
      <div style={{ width: 40, fontSize: 10, color: '#888' }}>#{index}</div>
      <GranuleCell1 store={store} index={index} />
      <div className="arrow">→</div>
      <GranuleCell2 store={store} index={index} />
      <div className="arrow">→</div>
      <GranuleCell3 store={store} index={index} />
      <div className="arrow">→</div>
      <GranuleCell4 store={store} index={index} />
      <div className="arrow">→</div>
      <GranuleCell5 store={store} index={index} />
      <div style={{ fontSize: 10, color: '#888', marginLeft: 8 }}>Row Renders: {renders.current}</div>
    </div>
  )
})

// Baseline Components (Receiving props)
const BaselineCell = memo(({ value }: { value: number }) => {
  const renders = useRef(0); renders.current += 1
  return <div className="cell">{value.toFixed(0)} <span className="r">r:{renders.current}</span></div>
})

const BaselineChainRow = memo(({ row, onRender }: { row: Row; onRender: () => void }) => {
  const renders = useRef(0); renders.current += 1
  onRender()
  
  // Calculate derived values in render (simulating propagation)
  const v1 = f1(row.value)
  const v2 = f2(v1)
  const v3 = f3(v2)
  const v4 = f4(v3)
  const v5 = f5(v4)

  return (
    <div className="chain-row">
      <div style={{ width: 40, fontSize: 10, color: '#888' }}>#{row.value}</div>
      <BaselineCell value={v1} />
      <div className="arrow">→</div>
      <BaselineCell value={v2} />
      <div className="arrow">→</div>
      <BaselineCell value={v3} />
      <div className="arrow">→</div>
      <BaselineCell value={v4} />
      <div className="arrow">→</div>
      <BaselineCell value={v5} />
      <div style={{ fontSize: 10, color: '#888', marginLeft: 8 }}>Row Renders: {renders.current}</div>
    </div>
  )
}, (prev, next) => prev.row === next.row)

export default function Benchmark2() {
  const [rowsCount, setRowsCount] = useState(2000)
  const [pct, setPct] = useState(100)
  const [mode, setMode] = useState<'granule' | 'baseline'>('granule')
  const [running, setRunning] = useState(false)
  const runningRef = useRef(false)
  const [result, setResult] = useState<{ frames: number; ms: number; renders: number; overloadAt: number | null } | null>(null)
  
  // Refs for stats
  const statsRef = useRef({ commits: 0, totalActual: 0 })
  const statsViewRef = useRef<HTMLDivElement | null>(null)
  const fpsViewRef = useRef<HTMLDivElement | null>(null)
  const bottleneckViewRef = useRef<HTMLDivElement | null>(null)
  const rendersTotalRef = useRef(0)
  const rendersLastRef = useRef(0)
  const rendersViewRef = useRef<HTMLDivElement | null>(null)
  const fpsRef = useRef(0)
  const overloadFramesRef = useRef(0)
  const overloadReachedAtRef = useRef<number | null>(null)
  const startTimeRef = useRef(0)
  const rendersStartRef = useRef(0)

  const granuleStore = useMemo(() => createStore<{ rows: Row[] }>({ rows: makeRows(rowsCount) }), [rowsCount])
  const [baseline, setBaseline] = useState<{ rows: Row[] }>({ rows: makeRows(rowsCount) })
  const onRowRender = useCallback(() => { rendersTotalRef.current += 1 }, [])

  const onRender = (_id: string, _phase: string, actual: number) => {
    statsRef.current.commits += 1
    statsRef.current.totalActual += actual
  }

  // Reset stats on config change
  useEffect(() => { statsRef.current = { commits: 0, totalActual: 0 } }, [rowsCount, mode])
  useEffect(() => { setResult(null) }, [rowsCount, pct, mode])

  // Monitoring loop (same as Bench1)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const s = statsRef.current
      const avg = s.commits ? s.totalActual / s.commits : 0
      
      if (statsViewRef.current) {
        statsViewRef.current.textContent = `commits: ${s.commits} • total actual: ${avg.toFixed(2)} ms avg`
      }
      if (rendersViewRef.current) {
        const total = rendersTotalRef.current
        const perFrame = total - rendersLastRef.current
        rendersLastRef.current = total
        rendersViewRef.current.textContent = `renders/frame: ${perFrame}`
        
        if (bottleneckViewRef.current) {
          const fps = fpsRef.current
          // Strict overload detection
          if (fps > 0 && fps < 20 && avg > 8) {
            overloadFramesRef.current++
          } else {
            overloadFramesRef.current = 0
          }
          const isHardLimit = overloadFramesRef.current > 5
          
          if (isHardLimit) {
            bottleneckViewRef.current.textContent = 'Rendering bottleneck reached — consider virtualization'
            if (overloadReachedAtRef.current === null && startTimeRef.current > 0) {
              overloadReachedAtRef.current = performance.now() - startTimeRef.current
            }
          } else {
            bottleneckViewRef.current.textContent = ''
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const start = () => {
    if (running) return
    setRunning(true)
    runningRef.current = true
    if (bottleneckViewRef.current) bottleneckViewRef.current.textContent = ''
    rendersStartRef.current = rendersTotalRef.current
    overloadFramesRef.current = 0
    overloadReachedAtRef.current = null
    rendersLastRef.current = rendersTotalRef.current
    const t0 = performance.now()
    startTimeRef.current = t0
    let frames = 0
    let lastF = performance.now()

    const frame = () => {
      if (!runningRef.current) return
      const Lg = granuleStore.get().rows.length
      const N = Math.max(1, Math.floor(Lg * (pct / 100)))

      if (mode === 'granule') {
        granuleStore.set(d => {
          for (let i = 0; i < N; i++) {
            const idx = Math.floor(Math.random() * d.rows.length)
            d.rows[idx].value += 1
          }
        })
      } else {
        setBaseline(prev => {
          const rows = prev.rows.slice()
          const Lb = rows.length
          const Nb = Math.max(1, Math.floor(Lb * (pct / 100)))
          for (let i = 0; i < Nb; i++) {
            const idx = Math.floor(Math.random() * Lb)
            rows[idx] = { value: rows[idx].value + 1 }
          }
          return { rows }
        })
      }

      frames += 1
      const now = performance.now()
      if (fpsViewRef.current) {
        const dt = now - lastF
        if (dt >= 1000) {
          const fps = Math.round((frames * 1000) / dt)
          fpsViewRef.current.textContent = `fps: ${fps}`
          fpsRef.current = fps
          frames = 0; lastF = now
        }
      }
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)

    const scheduleStop = () => {
      const t1 = performance.now()
      const totalRenders = Math.max(0, rendersTotalRef.current - rendersStartRef.current)
      setResult({ frames: 0, ms: Math.round(t1 - t0), renders: totalRenders, overloadAt: overloadReachedAtRef.current })
      runningRef.current = false
      setRunning(false)
      alert('Test Completed!')
    }
    setTimeout(scheduleStop, 5000)
  }

  const stopRun = () => { runningRef.current = false; setRunning(false) }

  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{ marginTop: 0 }}>Benchmark 2: Deep Dependency Chains</h2>
      <style>{`
        .chain-row {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          border-bottom: 1px solid #eaeef2;
          height: 32px;
        }
        .cell {
          width: 50px;
          height: 24px;
          background: #f5f7fa;
          border: 1px solid #e1e4e8;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-family: monospace;
          position: relative;
        }
        .cell .r {
          position: absolute;
          bottom: -8px;
          right: 0;
          font-size: 8px;
          color: #999;
          display: none;
        }
        .cell:hover .r { display: block; }
        .arrow {
          margin: 0 4px;
          color: #ccc;
          font-size: 10px;
        }
      `}</style>
      <div className="section-card">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={mode} onChange={e => setMode(e.target.value as any)}>
            <option value="granule">Granule</option>
            <option value="baseline">Baseline</option>
          </select>
          <input type="number" value={rowsCount} onChange={e => setRowsCount(parseInt(e.target.value || '0', 10))} style={{ width: 120 }} />
          <input type="number" value={pct} onChange={e => setPct(parseInt(e.target.value || '0', 10))} style={{ width: 100 }} />
          <button disabled={running} onClick={start}>Start</button>
          <button onClick={stopRun}>Stop</button>
          <div ref={fpsViewRef} style={{ fontSize: 12, color: '#333' }} />
          <div ref={rendersViewRef} style={{ fontSize: 12, color: '#333' }} />
          <div ref={statsViewRef} style={{ fontSize: 12, color: '#333' }} />
        </div>
        <div ref={bottleneckViewRef} style={{ fontSize: 12, color: '#d32f2f', fontWeight: 600, marginTop: 4 }} />
        {result ? (
          <div style={{ fontSize: 12, color: '#333', marginTop: 4 }}>
             Time: {result.ms} ms • Total Renders: {result.renders}
             {result.overloadAt !== null && (
               <span style={{ color: '#d32f2f', marginLeft: 8, fontWeight: 600 }}>
                 • Overload reached at: {Math.round(result.overloadAt)}ms
               </span>
             )}
          </div>
        ) : null}
      </div>
      <div style={{ border: '1px solid #eaeef2', borderRadius: 8, overflow: 'auto', marginTop: 12, maxHeight: 480 }}>
        {mode === 'granule' ? (
          <Profiler id="bench2-granule" onRender={onRender}>
            <div>
              {Array.from({ length: rowsCount }).map((_, i) => (
                <GranuleChainRow key={i} store={granuleStore} index={i} onRender={onRowRender} />
              ))}
            </div>
          </Profiler>
        ) : (
          <Profiler id="bench2-baseline" onRender={onRender}>
            <div>
              {baseline.rows.map((row, i) => (
                <BaselineChainRow key={i} row={row} onRender={onRowRender} />
              ))}
            </div>
          </Profiler>
        )}
      </div>
    </div>
  )
}
