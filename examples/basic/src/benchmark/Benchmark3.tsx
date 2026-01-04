import { useEffect, useMemo, useRef, useState, Profiler, memo, useCallback } from 'react'
import { createStore, useGranular } from 'granule-js'

type Row = { base: number; c: number; e: number }
type RowsStore = ReturnType<typeof createStore<{ rows: Row[] }>>

function makeRows(n: number): Row[] {
  const arr: Row[] = new Array(n)
  let prevC = 0
  let prevE = 0
  for (let i = 0; i < n; i++) {
    const base = i
    const b = base * 2
    const c = b + prevC
    const d = c * 1.5
    const e = d + prevE
    arr[i] = { base, c, e }
    prevC = c
    prevE = e
  }
  return arr
}

// ----------------------------------------------------------------------------
// Derived Logic (Cascading Dependencies)
// Row[i].a = base
// Row[i].b = a * 2
// Row[i].c = b + prevRow.c (Inter-row dependency)
// Row[i].d = c * 1.5
// Row[i].e = d + prevRow.e (Inter-row dependency)
// ----------------------------------------------------------------------------

// Granule Components
// Note: For true granular inter-row dependencies, we need to select from the store based on index-1.
// If index=0, prev is 0.

const GranuleCellA = ({ store, index }: { store: RowsStore; index: number }) => {
  const val = useGranular(store, s => s.rows[index]?.base ?? 0)
  const renders = useRef(0); renders.current += 1
  return <div className="cell">{val.toFixed(0)} <span className="r">r:{renders.current}</span></div>
}

const GranuleCellB = ({ store, index }: { store: RowsStore; index: number }) => {
  const val = useGranular(store, s => (s.rows[index]?.base ?? 0) * 2)
  const renders = useRef(0); renders.current += 1
  return <div className="cell">{val.toFixed(0)} <span className="r">r:{renders.current}</span></div>
}

const GranuleCellC = ({ store, index }: { store: RowsStore; index: number }) => {
  // c is now stored directly in the store, computed during mutation
  const val = useGranular(store, s => s.rows[index]?.c ?? 0)
  const renders = useRef(0); renders.current += 1
  return <div className="cell">{val.toFixed(0)} <span className="r">r:{renders.current}</span></div>
}

const GranuleCellD = ({ store, index }: { store: RowsStore; index: number }) => {
  // d depends on c, which is in the store. d = c * 1.5
  const val = useGranular(store, s => (s.rows[index]?.c ?? 0) * 1.5)
  const renders = useRef(0); renders.current += 1
  return <div className="cell">{val.toFixed(0)} <span className="r">r:{renders.current}</span></div>
}

const GranuleCellE = ({ store, index }: { store: RowsStore; index: number }) => {
  // e is stored directly in the store
  const val = useGranular(store, s => s.rows[index]?.e ?? 0)
  const renders = useRef(0); renders.current += 1
  return <div className="cell">{val.toFixed(0)} <span className="r">r:{renders.current}</span></div>
}

const GranuleRow = memo(({ store, index, onRender }: { store: RowsStore; index: number; onRender: () => void }) => {
  const renders = useRef(0); renders.current += 1
  onRender()
  return (
    <div className="chain-row">
      <div style={{ width: 40, fontSize: 10, color: '#888' }}>#{index}</div>
      <GranuleCellA store={store} index={index} />
      <div className="arrow">→</div>
      <GranuleCellB store={store} index={index} />
      <div className="arrow">→</div>
      <GranuleCellC store={store} index={index} />
      <div className="arrow">→</div>
      <GranuleCellD store={store} index={index} />
      <div className="arrow">→</div>
      <GranuleCellE store={store} index={index} />
      <div style={{ fontSize: 10, color: '#888', marginLeft: 8 }}>Row Renders: {renders.current}</div>
    </div>
  )
})

// Baseline Components
// In baseline, to support "depends on prev row", we usually need the full data array passed to the row 
// or the computed values passed down from a parent that computed everything.
// To be fair to React, we'll pass the full `rows` array to the list, but each Row component
// will just take `row` and `prevRow` as props.

const BaselineCell = memo(({ value }: { value: number }) => {
  const renders = useRef(0); renders.current += 1
  return <div className="cell">{value.toFixed(0)} <span className="r">r:{renders.current}</span></div>
})

const BaselineRow = memo(({ row, prevRow, index, onRender }: { row: Row; prevRow?: Row; index: number; onRender: () => void }) => {
  const renders = useRef(0); renders.current += 1
  onRender()

  // Compute derived values
  const base = row.base
  const prevBase = prevRow?.base ?? 0
  
  const a = base
  const b = a * 2
  const c = b + prevBase
  const d = c * 1.5
  const e = d + prevBase

  return (
    <div className="chain-row">
      <div style={{ width: 40, fontSize: 10, color: '#888' }}>#{index}</div>
      <BaselineCell value={a} />
      <div className="arrow">→</div>
      <BaselineCell value={b} />
      <div className="arrow">→</div>
      <BaselineCell value={c} />
      <div className="arrow">→</div>
      <BaselineCell value={d} />
      <div className="arrow">→</div>
      <BaselineCell value={e} />
      <div style={{ fontSize: 10, color: '#888', marginLeft: 8 }}>Row Renders: {renders.current}</div>
    </div>
  )
}, (prev, next) => prev.row === next.row && prev.prevRow === next.prevRow)


export default function Benchmark3() {
  const [rowsCount, setRowsCount] = useState(1000)
  const [pct, setPct] = useState(1) // 1% updates
  const [mode, setMode] = useState<'granule' | 'baseline'>('granule')
  const [running, setRunning] = useState(false)
  const runningRef = useRef(false)
  const [result, setResult] = useState<{ frames: number; ms: number; renders: number; overloadAt: number | null } | null>(null)

  // Stats
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

  useEffect(() => { statsRef.current = { commits: 0, totalActual: 0 } }, [rowsCount, mode])
  useEffect(() => { setResult(null) }, [rowsCount, pct, mode])

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
          // Failure Thresholds: FPS < 20, Render count > rows * 0.3, Commit time > 12ms
          const renderThreshold = rowsCount * 0.3
          const isOverload = fps > 0 && fps < 20 && (perFrame > renderThreshold || avg > 12)
          
          if (isOverload) {
            overloadFramesRef.current++
          } else {
            overloadFramesRef.current = 0
          }
          
          const isHardLimit = overloadFramesRef.current > 5
          
          if (isHardLimit) {
            bottleneckViewRef.current.textContent = 'Rendering bottleneck reached — derived state explosion'
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
  }, [rowsCount])

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
          // O(N) propagation logic inside store mutation
          // We update base values randomly first
          const updatedIndices = new Set<number>()
          for (let i = 0; i < N; i++) {
            const idx = Math.floor(Math.random() * d.rows.length)
            d.rows[idx].base += 1
            updatedIndices.add(idx)
          }
          
          // Then we propagate changes to derived fields c and e
          // Ideally we only update from the earliest changed index to the end
          // But for "brutal" test, iterating all or from min(updatedIndices) is fine.
          // Let's iterate all to ensure full consistency if we treat it as "recompute all derived"
          // Or optimization: start from min(updatedIndices)
          
          let startIdx = d.rows.length;
          updatedIndices.forEach(idx => { if(idx < startIdx) startIdx = idx })
          
          let prevC = startIdx > 0 ? d.rows[startIdx - 1].c : 0
          let prevE = startIdx > 0 ? d.rows[startIdx - 1].e : 0
          
          for (let i = startIdx; i < d.rows.length; i++) {
            const row = d.rows[i]
            const b = row.base * 2
            const c = b + prevC
            // If c changed, we update it. 
            // Note: Granule tracks granular changes, so if we assign same value, no notification?
            // Granule proxies usually notify on assignment unless we check equality.
            // Let's just assign.
            row.c = c
            
            const dVal = c * 1.5
            const e = dVal + prevE
            row.e = e
            
            prevC = c
            prevE = e
          }
        })
      } else {
        setBaseline(prev => {
          const rows = prev.rows.slice()
          const Lb = rows.length
          const Nb = Math.max(1, Math.floor(Lb * (pct / 100)))
          
          // Random updates
          for (let i = 0; i < Nb; i++) {
            const idx = Math.floor(Math.random() * Lb)
            rows[idx] = { ...rows[idx], base: rows[idx].base + 1 }
          }
          
          // Recompute derived state for consistency (Baseline also has to do this work effectively during render or here)
          // If we do it here, we are simulating "smart" store updates but React still has to diff.
          // But wait, BaselineRow computed derived values *during render* in previous version.
          // To make it comparable, we should keep BaselineRow computing during render, 
          // OR we update state here too. 
          // If we update state here, React just renders simple values. 
          // But the prompt says "Baseline React ... Forces recomputation on parent updates".
          // If we pre-calculate in state, React is just a view.
          // Let's stick to the previous BaselineRow logic where it computes on fly, 
          // BUT we need to pass the updated "c" and "e" if we want to match the data structure.
          // Actually, let's keep BaselineRow computing from `base` and `prevRow` to stress React's render phase.
          // We only update `base` in state for Baseline.
          // HOWEVER, to support `prevRow.c` dependency in BaselineRow, BaselineRow needs to see the *computed* c of prev row.
          // This means BaselineRow needs to compute `c` and return it? No, React components don't return data up.
          // This is why derived state in React chains is hard. 
          // We MUST compute it in the parent or use a store. 
          // If we compute in parent (here), then we are testing React's rendering speed of pre-computed data, not derived state calc cost.
          // BUT, if we don't compute in parent, we can't easily pass `prevRow.c` to `nextRow` unless we use Context or heavy prop drilling (passing array).
          // We are passing `prevRow` (which is the state object).
          // If `prevRow` state object doesn't have `c`, BaselineRow calculates it locally.
          // But `nextRow` receives `prevRow` state object, not the *instance* of BaselineRow.
          // So `nextRow` can't see `prevRow`'s computed `c` unless we store it.
          // SO: For Baseline to even *work* with `c = b + prevRow.c`, we MUST store `c` in the state 
          // OR compute it in the big loop here.
          // Let's compute it in the big loop here for Baseline too, to be fair on *logic* cost, 
          // and see if React's rendering cost is the bottleneck.
          
          let prevC = 0
          let prevE = 0
          for (let i = 0; i < rows.length; i++) {
             // We need to re-calc everything because a change at index 0 ripples to N
             const base = rows[i].base
             const b = base * 2
             const c = b + prevC
             const dVal = c * 1.5
             const e = dVal + prevE
             rows[i] = { base, c, e } // New object reference
             prevC = c
             prevE = e
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
      <h2 style={{ marginTop: 0 }}>Benchmark 3: Derived State Explosion</h2>
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
          <div style={{fontSize: 12}}>Rows: {rowsCount}</div>
          <div style={{fontSize: 12}}>Updates: {pct}%</div>
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
          <Profiler id="bench3-granule" onRender={onRender}>
            <div>
              {Array.from({ length: rowsCount }).map((_, i) => (
                <GranuleRow key={i} store={granuleStore} index={i} onRender={onRowRender} />
              ))}
            </div>
          </Profiler>
        ) : (
          <Profiler id="bench3-baseline" onRender={onRender}>
            <div>
              {baseline.rows.map((row, i) => (
                <BaselineRow 
                  key={i} 
                  row={row} 
                  prevRow={baseline.rows[i - 1]} 
                  index={i}
                  onRender={onRowRender} 
                />
              ))}
            </div>
          </Profiler>
        )}
      </div>
    </div>
  )
}
