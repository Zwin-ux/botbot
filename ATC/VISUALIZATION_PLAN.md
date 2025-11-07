# ATC Training Environment - Visualization Architecture Plan

## Executive Summary

This document outlines a comprehensive plan to add visualization capabilities to the ATC training environment. The plan includes both a desktop GUI and a web-based real-time dashboard for monitoring training, debugging, and demonstration purposes.

## Analysis of Current Architecture

### Existing Components

1. **BlueSkySim** - Deterministic aircraft simulation
   - State: aircraft positions, velocities, headings, altitudes
   - Commands: heading/altitude changes
   - Time-step based updates

2. **SyntheticTowerEnv** - Gymnasium environment
   - Observation encoding/normalization
   - Reward computation
   - Episode management

3. **RLlib Training** - Distributed reinforcement learning
   - Multiple parallel workers
   - Rollout collection
   - Policy updates

### Visualization Opportunities

1. **Real-time Training Monitor**
   - Episode rewards over time
   - Safety metrics (LoS events, separations)
   - Aircraft trajectories
   - Policy behavior visualization

2. **Scenario Debugging**
   - Step-by-step replay
   - Aircraft state inspection
   - Reward component breakdown
   - Action distribution analysis

3. **Demonstration Mode**
   - Live simulation playback
   - Interactive scenario control
   - Performance comparison

## Proposed Architecture

### Option 1: Hybrid Approach (RECOMMENDED)

```
┌─────────────────────────────────────────────────────────────┐
│                   Web-Based Dashboard                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Training  │  │  Episode   │  │  Aircraft  │            │
│  │  Metrics   │  │  Replay    │  │  Viewer    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│           ▲            ▲               ▲                     │
│           │            │               │                     │
│           │     WebSocket / REST API   │                     │
└───────────┼────────────┼───────────────┼─────────────────────┘
            │            │               │
┌───────────┴────────────┴───────────────┴─────────────────────┐
│              Visualization Server (FastAPI)                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Data Aggregation Layer                                 │ │
│  │  - Event streaming                                      │ │
│  │  - State buffering                                      │ │
│  │  - Metrics computation                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│           ▲                      ▲                            │
│           │ Callbacks            │ State queries             │
└───────────┼──────────────────────┼────────────────────────────┘
            │                      │
┌───────────┴──────────────────────┴────────────────────────────┐
│                  Training Environment                          │
│  ┌─────────────┐         ┌──────────────┐                    │
│  │   RLlib     │────────►│ SyntheticTower│                    │
│  │  Training   │         │      Env      │                    │
│  └─────────────┘         └───────┬───────┘                    │
│                                  │                             │
│                          ┌───────▼────────┐                   │
│                          │  BlueSkySim    │                   │
│                          └────────────────┘                   │
└────────────────────────────────────────────────────────────────┘
```

### Option 2: Desktop GUI (Pygame/Tkinter)

Simpler but less flexible - good for quick local debugging.

### Option 3: Pure Web (React + Three.js)

Most modern but requires more frontend expertise.

## Recommended Solution: FastAPI + React

### Backend: FastAPI Server

**File: `visualization/server.py`**

```python
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
import asyncio
import json
from typing import Dict, List
import numpy as np

app = FastAPI()

class VisualizationServer:
    """
    Centralized server for streaming training data to web clients.
    """
    def __init__(self):
        self.clients: List[WebSocket] = []
        self.episode_buffer: List[Dict] = []
        self.metrics_buffer: List[Dict] = []
        self.current_state = None

    async def broadcast(self, message: Dict):
        """Broadcast message to all connected clients."""
        for client in self.clients:
            try:
                await client.send_json(message)
            except:
                self.clients.remove(client)

    async def stream_state(self, states: List[Dict]):
        """Stream aircraft states to clients."""
        await self.broadcast({
            "type": "state_update",
            "timestamp": time.time(),
            "states": states
        })

    async def stream_metrics(self, metrics: Dict):
        """Stream training metrics to clients."""
        await self.broadcast({
            "type": "metrics",
            "data": metrics
        })

viz_server = VisualizationServer()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    viz_server.clients.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle client commands
    except:
        viz_server.clients.remove(websocket)

@app.get("/api/episodes")
async def get_episodes():
    """Get historical episode data."""
    return viz_server.episode_buffer

@app.get("/api/current")
async def get_current_state():
    """Get current simulation state."""
    return viz_server.current_state
```

### Frontend: React + D3.js/Three.js

**File: `visualization/frontend/src/App.jsx`**

```javascript
import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import AircraftViewer from './components/AircraftViewer';
import MetricsPanel from './components/MetricsPanel';
import TrainingGraph from './components/TrainingGraph';

function App() {
  const [aircraftStates, setAircraftStates] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:8000/ws');

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'state_update') {
        setAircraftStates(data.states);
      } else if (data.type === 'metrics') {
        setMetrics(data.data);
      }
    };

    setWs(websocket);
    return () => websocket.close();
  }, []);

  return (
    <div className="app">
      <div className="header">
        <h1>ATC Training Monitor</h1>
        <MetricsPanel metrics={metrics} />
      </div>

      <div className="main-content">
        <div className="aircraft-viewer">
          <Canvas>
            <AircraftViewer aircraft={aircraftStates} />
          </Canvas>
        </div>

        <div className="training-panel">
          <TrainingGraph metrics={metrics} />
        </div>
      </div>
    </div>
  );
}
```

## Data Flow Architecture

### 1. Training Data Collection

```python
# File: bluesky_adapter/callbacks.py

class VisualizationCallback:
    """
    Callback for streaming data to visualization server.
    """
    def __init__(self, viz_server):
        self.viz_server = viz_server
        self.episode_states = []

    def on_step(self, states, actions, rewards, info):
        """Called after each environment step."""
        # Buffer state for replay
        self.episode_states.append({
            "states": states,
            "actions": actions,
            "rewards": rewards,
            "info": info
        })

        # Stream to clients
        asyncio.create_task(
            self.viz_server.stream_state(states)
        )

    def on_episode_end(self, total_reward, metrics):
        """Called at end of episode."""
        asyncio.create_task(
            self.viz_server.stream_metrics({
                "total_reward": total_reward,
                "episode_length": len(self.episode_states),
                **metrics
            })
        )

        # Save episode for replay
        self.viz_server.episode_buffer.append({
            "states": self.episode_states,
            "metrics": metrics
        })

        self.episode_states = []
```

### 2. Environment Integration

```python
# File: st_env/env.py (modified)

class SyntheticTowerEnv(gym.Env):
    def __init__(self, ..., viz_callback=None):
        # ... existing init ...
        self.viz_callback = viz_callback

    def step(self, action):
        # ... existing step logic ...

        # Notify visualization
        if self.viz_callback:
            self.viz_callback.on_step(
                states=states,
                actions=action,
                rewards=reward,
                info=info
            )

        return obs, reward, terminated, truncated, info
```

### 3. RLlib Integration

```python
# File: train/train_rllib.py (modified)

from visualization.server import VisualizationServer
from bluesky_adapter.callbacks import VisualizationCallback
import threading

def start_viz_server():
    """Start visualization server in background thread."""
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

def main():
    # Start visualization server
    viz_thread = threading.Thread(target=start_viz_server, daemon=True)
    viz_thread.start()

    # Create callback
    viz_callback = VisualizationCallback(viz_server)

    # Register environment with callback
    def make_env(config):
        return SyntheticTowerEnv(
            ...,
            viz_callback=viz_callback if config.get("visualize") else None
        )

    # ... rest of training ...
```

## Component Specifications

### Component 1: Aircraft Viewer (3D)

**Technology:** React Three Fiber + Three.js

**Features:**
- 3D sector visualization (100x100 NM)
- Aircraft rendered as 3D models or sprites
- Heading indicators (velocity vectors)
- Altitude color-coding
- Goal markers
- Separation circles (5 NM, 6 NM)
- Trail visualization (past positions)

**File: `visualization/frontend/src/components/AircraftViewer.jsx`**

```javascript
function AircraftViewer({ aircraft }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />

      {/* Sector boundary */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>

      {/* Aircraft */}
      {aircraft.map(ac => (
        <Aircraft
          key={ac.id}
          position={[ac.x_nm, ac.y_nm, ac.alt_ft / 1000]}
          heading={ac.hdg_rad}
          alive={ac.alive}
        />
      ))}

      <OrbitControls />
    </>
  );
}
```

### Component 2: Training Metrics Dashboard

**Technology:** React + Recharts

**Metrics Displayed:**
- Episode reward (moving average)
- Loss of separation count
- Minimum separation distance
- Aircraft throughput
- Episode length
- Policy loss / value loss
- Learning rate

**File: `visualization/frontend/src/components/MetricsPanel.jsx`**

```javascript
function MetricsPanel({ metrics }) {
  return (
    <div className="metrics-panel">
      <MetricCard
        title="Episode Reward"
        value={metrics.episode_reward?.toFixed(2)}
        trend={metrics.reward_trend}
      />
      <MetricCard
        title="LoS Events"
        value={metrics.los_count}
        alert={metrics.los_count > 0}
      />
      <MetricCard
        title="Min Separation"
        value={`${metrics.min_sep_nm?.toFixed(1)} NM`}
        alert={metrics.min_sep_nm < 6.0}
      />
      <MetricCard
        title="Throughput"
        value={`${metrics.aircraft_exited} / ${metrics.aircraft_total}`}
      />
    </div>
  );
}
```

### Component 3: Episode Replay

**Technology:** React + Custom Controls

**Features:**
- Load saved episodes
- Step-by-step playback
- Speed control (1x, 2x, 5x, 10x)
- Pause/resume
- Jump to specific timestep
- Side-by-side comparison

**File: `visualization/frontend/src/components/EpisodeReplay.jsx`**

```javascript
function EpisodeReplay({ episodeData }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!playing) return;

    const interval = setInterval(() => {
      setCurrentStep(s => (s + 1) % episodeData.length);
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [playing, speed]);

  return (
    <div className="replay-viewer">
      <AircraftViewer aircraft={episodeData[currentStep].states} />

      <div className="controls">
        <button onClick={() => setPlaying(!playing)}>
          {playing ? '⏸' : '▶'}
        </button>
        <input
          type="range"
          min={0}
          max={episodeData.length - 1}
          value={currentStep}
          onChange={(e) => setCurrentStep(parseInt(e.target))}
        />
        <select value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))}>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={5}>5x</option>
          <option value={10}>10x</option>
        </select>
      </div>
    </div>
  );
}
```

### Component 4: Reward Component Breakdown

**Technology:** React + D3.js

**Features:**
- Stacked bar chart of reward components
- Hover tooltips
- Timeline view
- Component filtering

```javascript
function RewardBreakdown({ rewardHistory }) {
  const components = ['los', 'near', 'progress', 'terminal', 'catastrophe'];

  return (
    <div className="reward-breakdown">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={rewardHistory}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="step" />
          <YAxis />
          <Tooltip />
          <Legend />
          {components.map(comp => (
            <Bar key={comp} dataKey={comp} stackId="a" fill={getColor(comp)} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

**Tasks:**
1. ✓ Set up FastAPI server with WebSocket support
2. ✓ Create basic React frontend with Create React App
3. ✓ Implement VisualizationCallback in adapter
4. ✓ Add callback integration to SyntheticTowerEnv
5. ✓ Test basic state streaming

**Deliverables:**
- `visualization/server.py` - FastAPI server
- `visualization/frontend/` - React app scaffold
- `bluesky_adapter/callbacks.py` - Callback system
- Basic WebSocket communication working

### Phase 2: Aircraft Visualization (Week 2)

**Tasks:**
1. ✓ Set up React Three Fiber
2. ✓ Create 3D aircraft renderer
3. ✓ Add sector boundary and grid
4. ✓ Implement heading/velocity indicators
5. ✓ Add altitude color-coding
6. ✓ Create goal markers
7. ✓ Add separation circles

**Deliverables:**
- `AircraftViewer.jsx` - 3D visualization component
- Real-time aircraft position updates
- Interactive camera controls

### Phase 3: Metrics Dashboard (Week 3)

**Tasks:**
1. ✓ Design metrics panel layout
2. ✓ Implement real-time charts (Recharts)
3. ✓ Add training progress graphs
4. ✓ Create reward breakdown visualization
5. ✓ Add LoS/safety metrics display
6. ✓ Implement alert system for safety violations

**Deliverables:**
- `MetricsPanel.jsx` - Metrics display
- `TrainingGraph.jsx` - Training curves
- `RewardBreakdown.jsx` - Reward components
- Live metrics updates during training

### Phase 4: Episode Replay (Week 4)

**Tasks:**
1. ✓ Implement episode recording system
2. ✓ Create replay controls UI
3. ✓ Add speed control
4. ✓ Implement frame scrubbing
5. ✓ Add side-by-side comparison
6. ✓ Create episode library/browser

**Deliverables:**
- `EpisodeReplay.jsx` - Replay component
- Episode save/load functionality
- Comparison tools

### Phase 5: Polish & Features (Week 5)

**Tasks:**
1. ✓ Add action distribution visualization
2. ✓ Implement heatmaps (conflict zones)
3. ✓ Create performance profiler
4. ✓ Add export functionality (video, data)
5. ✓ Implement responsive design
6. ✓ Add dark/light theme
7. ✓ Write documentation

**Deliverables:**
- Polished, production-ready visualization
- User documentation
- Deployment guide

## Technical Stack

### Backend
- **FastAPI** - Modern async Python web framework
- **WebSockets** - Real-time bidirectional communication
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation

### Frontend
- **React 18** - UI framework
- **React Three Fiber** - 3D rendering
- **Three.js** - WebGL 3D library
- **Recharts** - Charting library
- **D3.js** - Data visualization
- **TailwindCSS** - Styling
- **Vite** - Build tool

### Data Format
- **JSON** - API responses
- **MessagePack** - Binary WebSocket (optional, for performance)
- **HDF5** - Episode storage (optional)

## File Structure

```
ATC/
├── visualization/
│   ├── server.py              # FastAPI server
│   ├── callbacks.py           # Training callbacks
│   ├── storage.py             # Episode persistence
│   └── frontend/
│       ├── package.json
│       ├── vite.config.js
│       ├── public/
│       │   └── aircraft-model.glb
│       └── src/
│           ├── App.jsx
│           ├── index.css
│           ├── components/
│           │   ├── AircraftViewer.jsx
│           │   ├── MetricsPanel.jsx
│           │   ├── TrainingGraph.jsx
│           │   ├── EpisodeReplay.jsx
│           │   ├── RewardBreakdown.jsx
│           │   └── ActionHeatmap.jsx
│           ├── hooks/
│           │   ├── useWebSocket.js
│           │   └── useEpisodeData.js
│           └── utils/
│               ├── colorSchemes.js
│               └── formatting.js
│
├── bluesky_adapter/
│   ├── adapter.py             # (existing)
│   └── callbacks.py           # NEW: Visualization callbacks
│
├── st_env/
│   └── env.py                 # (modified for callbacks)
│
└── train/
    └── train_rllib.py         # (modified to start viz server)
```

## Performance Considerations

### 1. Data Rate Throttling

```python
class VisualizationCallback:
    def __init__(self, viz_server, throttle_ms=100):
        self.throttle_ms = throttle_ms
        self.last_send = 0

    def on_step(self, states, ...):
        now = time.time() * 1000
        if now - self.last_send < self.throttle_ms:
            return  # Skip this frame

        self.last_send = now
        # Send data...
```

### 2. State Compression

```python
# Use binary format for large datasets
import msgpack

def compress_state(states):
    return msgpack.packb(states, use_bin_type=True)
```

### 3. Level of Detail

```javascript
// Reduce detail for distant aircraft
function Aircraft({ position, distance }) {
  const lod = distance > 50 ? 'low' : distance > 20 ? 'medium' : 'high';

  return (
    <mesh geometry={geometries[lod]}>
      {/* ... */}
    </mesh>
  );
}
```

## Security Considerations

### 1. Authentication (if deployed publicly)

```python
from fastapi.security import HTTPBearer

security = HTTPBearer()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Depends(security)):
    # Verify token
    if not verify_token(token):
        await websocket.close(code=1008)
        return
```

### 2. CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Deployment Options

### Option 1: Local Development

```bash
# Terminal 1: Start backend
cd visualization
python server.py

# Terminal 2: Start frontend
cd visualization/frontend
npm run dev

# Terminal 3: Start training
python train/train_rllib.py --visualize
```

### Option 2: Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: ./visualization
    ports:
      - "8000:8000"
    volumes:
      - ./episodes:/data/episodes

  frontend:
    build: ./visualization/frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  training:
    build: .
    command: python train/train_rllib.py --visualize
    depends_on:
      - backend
```

### Option 3: Cloud Deployment

- **Backend**: AWS Lambda + API Gateway (serverless)
- **Frontend**: Vercel / Netlify (static hosting)
- **Storage**: S3 for episode data
- **WebSockets**: AWS AppSync or dedicated EC2

## Alternative: Simple Desktop GUI (Optional)

For quick local debugging, a simpler Pygame visualization:

```python
# File: visualization/pygame_viewer.py

import pygame
import numpy as np

class SimpleViewer:
    def __init__(self, width=800, height=800):
        pygame.init()
        self.screen = pygame.display.set_mode((width, height))
        self.clock = pygame.time.Clock()

    def render(self, states):
        self.screen.fill((0, 0, 0))

        # Draw sector boundary
        pygame.draw.rect(self.screen, (50, 50, 50), (50, 50, 700, 700), 2)

        # Draw aircraft
        for ac in states:
            if not ac['alive']:
                continue

            # Convert NM to screen coords
            x = int(400 + ac['x_nm'] * 3.5)
            y = int(400 - ac['y_nm'] * 3.5)

            # Color by altitude
            alt_norm = ac['alt_ft'] / 30000
            color = (int(255 * alt_norm), 100, int(255 * (1 - alt_norm)))

            # Draw aircraft
            pygame.draw.circle(self.screen, color, (x, y), 5)

            # Draw heading line
            hdg = ac['hdg_rad']
            end_x = int(x + 15 * np.cos(hdg))
            end_y = int(y - 15 * np.sin(hdg))
            pygame.draw.line(self.screen, color, (x, y), (end_x, end_y), 2)

            # Draw ID label
            font = pygame.font.Font(None, 20)
            text = font.render(ac['id'], True, (255, 255, 255))
            self.screen.blit(text, (x + 8, y - 8))

        pygame.display.flip()
        self.clock.tick(30)
```

## Success Metrics

### Technical Metrics
- ✓ WebSocket latency < 50ms
- ✓ Frame rate > 30 FPS in 3D viewer
- ✓ Supports concurrent connections (10+ clients)
- ✓ Episode replay loads in < 2 seconds
- ✓ No memory leaks over 24-hour training session

### User Experience Metrics
- ✓ Can identify safety violations in < 5 seconds
- ✓ Can compare episodes visually
- ✓ Can debug reward components easily
- ✓ Can share/export training results
- ✓ Works on laptop and large displays

## Next Steps

1. **Immediate**: Create proof-of-concept with basic WebSocket streaming
2. **Short-term**: Implement 3D aircraft viewer and metrics panel
3. **Medium-term**: Add episode replay and comparison tools
4. **Long-term**: Deploy cloud-based dashboard for remote monitoring

## Conclusion

This visualization system will provide:
- **Real-time monitoring** of training progress
- **Debugging tools** for reward engineering
- **Demonstration capabilities** for stakeholders
- **Research tools** for analysis and publication
- **Extensible architecture** for future features

The hybrid web-based approach offers the best balance of functionality, accessibility, and development speed.
