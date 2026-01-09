import { useEffect, useMemo, useRef, useState, Profiler, memo, useCallback } from 'react'
import { createStore, useGranular } from 'granule-js'

type Row = { c1: number; c2: number; c3: number; c4: number; c5: number }
type RowsStore = ReturnType<typeof createStore<{ rows: Row[] }>>

function makeRows(n: number): Row[] {
  const arr: Row[] = new Array(n)
  for (let i = 0; i < n; i++) arr[i] = { c1: i, c2: 0, c3: 0, c4: 0, c5: 0 }
  return arr
}

function GranuleRow({ store, index, onRender }: { store: RowsStore; index: number; onRender: () => void }) {
  const c1 = useGranular(store, s => s.rows[index]?.c1 ?? 0) as number
  const c2 = useGranular(store, s => s.rows[index]?.c2 ?? 0) as number
  const c3 = useGranular(store, s => s.rows[index]?.c3 ?? 0) as number
  const c4 = useGranular(store, s => s.rows[index]?.c4 ?? 0) as number
  const c5 = useGranular(store, s => s.rows[index]?.c5 ?? 0) as number
  const renders = useRef(0); renders.current += 1
  onRender()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8, padding: '6px 8px', borderBottom: '1px solid #eaeef2' }}>
      <span>{c1}</span>
      <span>{c2}</span>
      <span>{c3}</span>
      <span>{c4}</span>
      <span>{c5}</span>
      <span style={{ fontSize: 11, color: '#58667e' }}>r:{renders.current}</span>
    </div>
  )
}

type BaselineRowProps = { row: Row; onRender: () => void }
const BaselineRow = memo(function BaselineRow({ row, onRender }: BaselineRowProps) {
  const renders = useRef(0); renders.current += 1
  onRender()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8, padding: '6px 8px', borderBottom: '1px solid #eaeef2' }}>
      <span>{row.c1}</span>
      <span>{row.c2}</span>
      <span>{row.c3}</span>
      <span>{row.c4}</span>
      <span>{row.c5}</span>
      <span style={{ fontSize: 11, color: '#58667e' }}>r:{renders.current}</span>
    </div>
  )
}, (prev, next) => prev.row === next.row)

export default function Benchmark1() {
  const [rowsCount, setRowsCount] = useState(1000)
  const [pct, setPct] = useState(10)
  const [mode, setMode] = useState<'granule' | 'baseline'>('granule')
  const [running, setRunning] = useState(false)
  const runningRef = useRef(false)
  const [result, setResult] = useState<{ frames: number; ms: number; renders: number; overloadAt: number | null } | null>(null)
  const statsRef = useRef({ commits: 0, totalActual: 0 })
  const statsViewRef = useRef<HTMLDivElement | null>(null)
  const fpsViewRef = useRef<HTMLDivElement | null>(null)
  const bottleneckViewRef = useRef<HTMLDivElement | null>(null)
  const rendersTotalRef = useRef(0)
  const rendersLastRef = useRef(0)
  const rendersViewRef = useRef<HTMLDivElement | null>(null)
  const rendersRowsViewRef = useRef<HTMLDivElement | null>(null)
  const rendersPercentViewRef = useRef<HTMLDivElement | null>(null)
  const fpsRef = useRef(0)
  const rowsCountRef = useRef(rowsCount)
  rowsCountRef.current = rowsCount
  const framesRef = useRef(0)
  const overloadFramesRef = useRef(0)
  const overloadReachedAtRef = useRef<number | null>(null)
  const startTimeRef = useRef(0)
  const rendersSumRef = useRef(0)
  const rendersStartRef = useRef(0)

  const granuleStore = useMemo(() => createStore<{ rows: Row[] }>({ rows: makeRows(rowsCount) }), [rowsCount])
  const [baseline, setBaseline] = useState<{ rows: Row[] }>({ rows: makeRows(rowsCount) })
  
  useEffect(() => {
    setBaseline({ rows: makeRows(rowsCount) })
  }, [rowsCount])

  const onRowRender = useCallback(() => { rendersTotalRef.current += 1 }, [])

  const onRender = (
    _id: string,
    _phase: 'mount' | 'update',
    actual: number,
    _base: number,
    _startTime: number,
    _commitTime: number,
  ) => {
    statsRef.current.commits += 1
    statsRef.current.totalActual += actual
  }

  useEffect(() => { statsRef.current = { commits: 0, totalActual: 0 } }, [rowsCount, mode])
  useEffect(() => { setResult(null) }, [rowsCount, pct, mode])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const s = statsRef.current
      if (statsViewRef.current) {
        const avg = s.commits ? s.totalActual / s.commits : 0
        statsViewRef.current.textContent = `commits: ${s.commits} • total actual: ${avg.toFixed(2)} ms avg`
      }
      if (rendersViewRef.current) {
        const total = rendersTotalRef.current
        const perFrame = total - rendersLastRef.current
        rendersLastRef.current = total
        rendersViewRef.current.textContent = `renders/frame: ${perFrame}`
        if (rendersRowsViewRef.current) {
          rendersRowsViewRef.current.textContent = `Rows re-rendered this frame: ${perFrame}/${rowsCountRef.current}`
        }
        if (rendersPercentViewRef.current) {
          rendersSumRef.current += perFrame
          const frames = Math.max(1, framesRef.current)
          const avgPerFrame = rendersSumRef.current / frames
          const pct = Math.min(100, Math.round((avgPerFrame / rowsCountRef.current) * 100))
          rendersPercentViewRef.current.textContent = `Total re-render percentage: ${pct}%`
        }

        if (bottleneckViewRef.current) {
          const avg = s.commits ? s.totalActual / s.commits : 0
          const fps = fpsRef.current
          
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
    framesRef.current = 0
    overloadFramesRef.current = 0
    overloadReachedAtRef.current = null
    rendersSumRef.current = 0
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
            const r = d.rows[idx]
            r.c2 += 1; r.c3 += 2; r.c4 += 3; r.c5 += 4
          }
        })
      } else {
        setBaseline(prev => {
          const rows = prev.rows.slice()
          const Lb = rows.length
          const Nb = Math.max(1, Math.floor(Lb * (pct / 100)))
          for (let i = 0; i < Nb; i++) {
            const idx = Math.floor(Math.random() * Lb)
            const r = rows[idx]
            rows[idx] = { c1: r.c1, c2: r.c2 + 1, c3: r.c3 + 2, c4: r.c4 + 3, c5: r.c5 + 4 }
          }
          return { rows }
        })
      }
      frames += 1
      framesRef.current = frames
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
      setResult({ frames, ms: Math.round(t1 - t0), renders: totalRenders, overloadAt: overloadReachedAtRef.current })
      runningRef.current = false
      setRunning(false)
      alert('Test Completed!')
    }
    setTimeout(scheduleStop, 5000)
  }

  const stopRun = () => { runningRef.current = false; setRunning(false) }

  useEffect(() => {
    if (runningRef.current) {
      runningRef.current = false
      setRunning(false)
    }
  }, [rowsCount, mode, pct])

  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{ marginTop: 0 }}>Benchmark 1: Massive Table / Partial Updates</h2>
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
          <div ref={rendersRowsViewRef} style={{ fontSize: 12, color: '#333' }} />
          <div ref={rendersPercentViewRef} style={{ fontSize: 12, color: '#333' }} />
          <div ref={rendersViewRef} style={{ fontSize: 12, color: '#333' }} />
          <div ref={statsViewRef} style={{ fontSize: 12, color: '#333' }} />
        </div>
        <div ref={bottleneckViewRef} style={{ fontSize: 12, color: '#d32f2f', fontWeight: 600, marginTop: 4 }} />
        <div style={{ fontSize: 12, color: '#58667e', marginTop: 8 }}>rows: {rowsCount} • update % per frame: {pct}%</div>
        {result ? (
          <div style={{ fontSize: 12, color: '#333', marginTop: 4 }}>
            frames: {result.frames} • time: {result.ms} ms • renders: {result.renders}
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
          <Profiler id="bench1-granule" onRender={onRender}>
            <div>
              {Array.from({ length: rowsCount }).map((_, i) => (
                <GranuleRow key={i} store={granuleStore} index={i} onRender={onRowRender} />
              ))}
            </div>
          </Profiler>
        ) : (
          <Profiler id="bench1-baseline" onRender={onRender}>
            <div>
              {baseline.rows.map((row, i) => (
                <BaselineRow key={i} row={row} onRender={onRowRender} />
              ))}
            </div>
          </Profiler>
        )}
      </div>
    </div>
  )
}
