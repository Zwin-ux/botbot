'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Aircraft {
  id: string
  x_nm: number
  y_nm: number
  v_kt: number
  hdg_rad: number
  alt_ft: number
  goal_x_nm: number
  goal_y_nm: number
  alive: boolean
}

interface Metrics {
  los?: number
  min_sep_nm?: number
  num_alive?: number
  reward?: number
}

interface DashboardProps {
  demoMode?: boolean
}

export default function Dashboard({ demoMode = true }: DashboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [connected, setConnected] = useState(false)
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [metrics, setMetrics] = useState<Metrics>({})
  const [episode, setEpisode] = useState(0)
  const [step, setStep] = useState(0)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Canvas rendering
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    const scale = Math.min(width, height) / 220 // 100 NM radius + margins

    // Clear
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, width, height)

    // Draw sector boundary (100 NM circle)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, 100 * scale, 0, 2 * Math.PI)
    ctx.stroke()

    // Draw grid
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    for (let i = -100; i <= 100; i += 20) {
      // Vertical lines
      ctx.beginPath()
      ctx.moveTo(centerX + i * scale, 0)
      ctx.lineTo(centerX + i * scale, height)
      ctx.stroke()
      // Horizontal lines
      ctx.beginPath()
      ctx.moveTo(0, centerY + i * scale)
      ctx.lineTo(width, centerY + i * scale)
      ctx.stroke()
    }

    // Draw aircraft
    aircraft.forEach((ac) => {
      if (!ac.alive) return

      const x = centerX + ac.x_nm * scale
      const y = centerY - ac.y_nm * scale // Flip Y axis

      // Color by altitude
      let color = '#4ade80' // Low
      if (ac.alt_ft > 25000) color = '#fb923c' // High
      else if (ac.alt_ft > 15000) color = '#3b82f6' // Medium

      // Draw aircraft
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, 2 * Math.PI)
      ctx.fill()

      // Draw heading indicator
      const hdgX = x + Math.cos(ac.hdg_rad - Math.PI / 2) * 15
      const hdgY = y + Math.sin(ac.hdg_rad - Math.PI / 2) * 15
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(hdgX, hdgY)
      ctx.stroke()

      // Draw label
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px monospace'
      ctx.fillText(ac.id, x + 12, y - 8)
      ctx.fillText(`${Math.round(ac.alt_ft / 100)}`, x + 12, y + 4)

      // Draw goal
      const gx = centerX + ac.goal_x_nm * scale
      const gy = centerY - ac.goal_y_nm * scale
      ctx.strokeStyle = color + '40'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(gx, gy)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = color + '80'
      ctx.beginPath()
      ctx.arc(gx, gy, 6, 0, 2 * Math.PI)
      ctx.fill()
    })
  }, [aircraft])

  // Re-render when aircraft update
  useEffect(() => {
    render()
  }, [render])

  // Handle window resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      render()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [render])

  // Connect to SSE stream
  useEffect(() => {
    if (!demoMode) return

    const url = `/api/stream?demo=true&episode=${episode || 1}`
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setConnected(true)
      console.log('SSE connected')
    }

    eventSource.addEventListener('reset', (e) => {
      const data = JSON.parse(e.data)
      setEpisode(data.episode || 0)
      setStep(0)
      setAircraft(data.aircraft || [])
      setMetrics({})
    })

    eventSource.addEventListener('step', (e) => {
      const data = JSON.parse(e.data)
      setStep(data.step || 0)
      setAircraft(data.aircraft || [])
      setMetrics(data.metrics || {})
    })

    eventSource.addEventListener('episode_end', (e) => {
      const data = JSON.parse(e.data)
      console.log('Episode ended:', data)
    })

    eventSource.addEventListener('error', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      console.error('SSE error:', data)
    })

    eventSource.onerror = () => {
      setConnected(false)
      console.log('SSE disconnected')
    }

    return () => {
      eventSource.close()
    }
  }, [demoMode, episode])

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-rose-500">ATC Training Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">Status:</span>
          <div className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
          <span className="text-sm">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Viewer */}
        <div className="flex-1 relative">
          <canvas 
            ref={canvasRef}
            className="w-full h-full"
          />
          
          {/* Legend */}
          <div className="absolute top-4 right-4 bg-slate-900/90 rounded-lg p-4 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded bg-green-400" />
              <span>Low (&lt; 15k ft)</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded bg-blue-500" />
              <span>Med (15-25k ft)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-400" />
              <span>High (&gt; 25k ft)</span>
            </div>
          </div>
        </div>

        {/* Metrics panel */}
        <aside className="w-80 bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto">
          <div className="space-y-4">
            <MetricCard title="Episode" value={episode} />
            <MetricCard title="Step" value={step} />
            <MetricCard 
              title="Total Reward" 
              value={metrics.reward?.toFixed(2) || '0.00'} 
            />
            <MetricCard 
              title="LoS Events" 
              value={metrics.los || 0}
              alert={Boolean(metrics.los && metrics.los > 0)}
            />
            <MetricCard 
              title="Min Sep (NM)" 
              value={metrics.min_sep_nm?.toFixed(1) || '∞'}
              alert={Boolean(metrics.min_sep_nm && metrics.min_sep_nm < 5)}
            />
            <MetricCard 
              title="Aircraft Alive" 
              value={metrics.num_alive || 0} 
            />
          </div>

          {!connected && demoMode && (
            <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg text-sm">
              <p className="font-semibold mb-1">Demo Mode</p>
              <p className="text-slate-300">
                Showing simulated data. Connect a real backend for live training data.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function MetricCard({ 
  title, 
  value, 
  alert = false 
}: { 
  title: string
  value: string | number
  alert?: boolean 
}) {
  return (
    <div className="bg-slate-950 rounded-lg p-4 border-l-4 border-rose-500">
      <div className="text-xs text-slate-400 uppercase mb-1">{title}</div>
      <div className={`text-3xl font-bold ${alert ? 'text-rose-500' : 'text-white'}`}>
        {value}
      </div>
    </div>
  )
}
