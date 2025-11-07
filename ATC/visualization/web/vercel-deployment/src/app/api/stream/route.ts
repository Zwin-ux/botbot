// Server-Sent Events endpoint for real-time data streaming
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge' // Use Edge Runtime for better streaming support
export const dynamic = 'force-dynamic'

// Mock data generator for demo mode
function generateMockAircraftState(step: number, numAircraft: number = 4) {
  const aircraft = []
  const time = step * 5 // 5 seconds per step
  
  for (let i = 0; i < numAircraft; i++) {
    const angle = (i / numAircraft) * 2 * Math.PI + (time * 0.001)
    const radius = 40 + Math.sin(time * 0.002 + i) * 10
    
    aircraft.push({
      id: `AC${String(i).padStart(3, '0')}`,
      x_nm: radius * Math.cos(angle),
      y_nm: radius * Math.sin(angle),
      v_kt: 250 + Math.random() * 50,
      hdg_rad: angle + Math.PI / 2,
      alt_ft: 10000 + i * 2000 + Math.sin(time * 0.003) * 1000,
      goal_x_nm: -radius * Math.cos(angle),
      goal_y_nm: -radius * Math.sin(angle),
      alive: true,
      intent_onehot: [0, 0, 0, 1, 0],
    })
  }
  
  return aircraft
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const episode = parseInt(searchParams.get('episode') || '1')
  const demoMode = searchParams.get('demo') === 'true'

  // Create a TransformStream for Server-Sent Events
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Send SSE format messages
  const sendEvent = async (event: string, data: any) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    await writer.write(encoder.encode(message))
  }

  // Simulate real-time training data (demo mode)
  if (demoMode) {
    (async () => {
      try {
        await sendEvent('connected', { episode, timestamp: Date.now() })
        
        // Send initial state
        await sendEvent('reset', {
          type: 'reset',
          episode,
          aircraft: generateMockAircraftState(0),
          timestamp: Date.now(),
        })

        // Stream 100 steps
        for (let step = 1; step <= 100; step++) {
          await new Promise(resolve => setTimeout(resolve, 100)) // 100ms per step
          
          const aircraft = generateMockAircraftState(step)
          const numAlive = aircraft.filter(ac => ac.alive).length
          
          await sendEvent('step', {
            type: 'step',
            step,
            episode,
            aircraft,
            metrics: {
              los: 0,
              min_sep_nm: 8.5 + Math.random() * 3,
              num_alive: numAlive,
              reward: step * 0.4,
            },
            timestamp: Date.now(),
          })

          // Random aircraft exit
          if (step % 25 === 0 && step < 100) {
            aircraft[Math.floor(Math.random() * aircraft.length)].alive = false
          }
        }

        // Episode end
        await sendEvent('episode_end', {
          type: 'episode_end',
          episode,
          total_reward: 40.0,
          episode_length: 100,
          metrics: {
            los: 0,
            num_alive: 2,
          },
          timestamp: Date.now(),
        })

        await sendEvent('done', { episode })
      } catch (error) {
        console.error('SSE stream error:', error)
      } finally {
        await writer.close()
      }
    })()
  } else {
    // Production mode: connect to actual backend
    await sendEvent('error', { 
      message: 'Backend connection not configured',
      hint: 'Set PYTHON_BACKEND_URL or use ?demo=true'
    })
    await writer.close()
  }

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
