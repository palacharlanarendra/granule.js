import { useEffect, useMemo, useRef, useState, memo } from 'react'
import { createStore, useGranular } from 'granule-js'

type Row = { id: number; value: number; label: string }
type RowsStore = ReturnType<typeof createStore<{ rows: Row[] }>>

const ROW_HEIGHT = 40
const CONTAINER_HEIGHT = 600

function makeRows(n: number): Row[] {
  const arr: Row[] = new Array(n)
  for (let i = 0; i < n; i++) {
    arr[i] = { id: i, value: Math.floor(Math.random() * 1000), label: `Row ${i}` }
  }
  return arr
}

// Granule Row Component
const GranuleRow = memo(({ store, index, style }: { store: RowsStore; index: number; style: React.CSSProperties }) => {
  // Fine-grained subscriptions
  const val = useGranular(store, s => s.rows[index]?.value ?? 0)
  const label = useGranular(store, s => s.rows[index]?.label ?? '')
  
  const renders = useRef(0); renders.current += 1

  return (
    <div style={{ 
      ...style,
      display: 'flex', 
      alignItems: 'center',
      padding: '0 16px',
      borderBottom: '1px solid #eaeef2',
      background: '#fff',
      fontSize: 14
    }}>
      <div style={{ width: 80, color: '#889' }}>ID: {index}</div>
      <div style={{ flex: 1, fontWeight: 500 }}>{label}</div>
      <div style={{ width: 100, textAlign: 'right', fontFamily: 'monospace' }}>
        {val.toFixed(0)}
      </div>
      <div style={{ width: 80, textAlign: 'right', fontSize: 11, color: '#ccc' }}>
        r:{renders.current}
      </div>
    </div>
  )
}, (prev, next) => prev.index === next.index && prev.style.top === next.style.top)

export default function Benchmark4() {
  const [rowsCount] = useState(100000)
  const [updatePct, setUpdatePct] = useState(1) // 1-5%
  const [running, setRunning] = useState(false)
  const runningRef = useRef(false)
  
  // Virtualization State
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Stats
  const statsRef = useRef({ frames: 0, lastTime: 0 })
  const fpsViewRef = useRef<HTMLDivElement>(null)
  const rendersViewRef = useRef<HTMLDivElement>(null)
  
  // Store
  const store = useMemo(() => createStore<{ rows: Row[] }>({ rows: makeRows(rowsCount) }), [rowsCount])

  // Virtualization Logic
  const totalHeight = rowsCount * ROW_HEIGHT
  const startIndex = Math.floor(scrollTop / ROW_HEIGHT)
  const visibleCount = Math.ceil(CONTAINER_HEIGHT / ROW_HEIGHT) + 2 // Buffer
  const endIndex = Math.min(rowsCount, startIndex + visibleCount)
  
  const visibleRows = []
  for (let i = startIndex; i < endIndex; i++) {
    visibleRows.push(
      <GranuleRow 
        key={i} 
        store={store} 
        index={i} 
        style={{
          position: 'absolute',
          top: i * ROW_HEIGHT,
          left: 0,
          width: '100%',
          height: ROW_HEIGHT
        }} 
      />
    )
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  // Update Loop
  useEffect(() => {
    let raf = 0
    let lastRenderCount = 0
    
    const tick = () => {
      if (!runningRef.current) return

      const now = performance.now()
      statsRef.current.frames++
      
      // Update logic: Randomly update 1-5% of TOTAL rows (or visible? "100k rows... Partial updates")
      // Updating 1% of 100k is 1000 updates per frame. 
      // This stresses the Store update speed. 
      // Since most aren't visible, Granule should ignore them.
      
      const count = Math.floor(rowsCount * (updatePct / 100))
      
      store.set(s => {
        for(let i=0; i<count; i++) {
          const idx = Math.floor(Math.random() * rowsCount)
          const row = s.rows[idx]
          if (row) {
             row.value += 1
          }
        }
      })
      
      // FPS Calc
      if (now - statsRef.current.lastTime >= 1000) {
        const fps = Math.round((statsRef.current.frames * 1000) / (now - statsRef.current.lastTime))
        if (fpsViewRef.current) fpsViewRef.current.textContent = `FPS: ${fps}`
        statsRef.current.frames = 0
        statsRef.current.lastTime = now
      }

      raf = requestAnimationFrame(tick)
    }

    if (running) {
      statsRef.current.lastTime = performance.now()
      statsRef.current.frames = 0
      raf = requestAnimationFrame(tick)
    }

    return () => cancelAnimationFrame(raf)
  }, [running, rowsCount, updatePct, store])

  const toggle = () => {
    setRunning(r => {
      runningRef.current = !r
      return !r
    })
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Benchmark 4: Virtualized + Granule</h2>
        <p className="text-gray-600 mb-4">
          100,000 Rows • Virtualized • {updatePct}% updates/frame
        </p>
        
        <div className="flex gap-4 items-center mb-4">
          <button 
            onClick={toggle}
            className={`px-4 py-2 rounded font-medium ${
              running ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'
            }`}
          >
            {running ? 'Stop Test' : 'Start Test'}
          </button>
          
          <div className="flex items-center gap-2">
            <label>Update Rate:</label>
            <select 
              value={updatePct} 
              onChange={e => setUpdatePct(Number(e.target.value))}
              className="border rounded p-1"
            >
              <option value={1}>1% (1k updates/frame)</option>
              <option value={2}>2% (2k updates/frame)</option>
              <option value={5}>5% (5k updates/frame)</option>
            </select>
          </div>
        </div>

        <div className="flex gap-8 p-4 bg-gray-50 rounded border">
          <div ref={fpsViewRef} className="text-xl font-mono font-bold">FPS: --</div>
          <div className="text-sm text-gray-500">
            Rendered Rows: {visibleRows.length} / {rowsCount}
          </div>
        </div>
      </div>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: CONTAINER_HEIGHT,
          overflowY: 'auto',
          position: 'relative',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          background: '#f8fafc'
        }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleRows}
        </div>
      </div>
    </div>
  )
}
