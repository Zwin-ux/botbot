# Visualization Quickstart Guide

## Overview

The ATC visualization system provides real-time monitoring of training episodes through a WebSocket-based architecture. This allows you to watch aircraft movements, track safety metrics, and debug reward functions in real-time.

## Architecture

```
Training Environment → VisualizationCallback → WebSocket Server → Web Browser
```

## Installation

### 1. Dependencies

Dependencies have already been added to `requirements.txt`:

```bash
pip install websockets>=11.0.0 asyncio-mqtt>=0.13.0
```

Or install everything:

```bash
pip install -r requirements.txt
```

### 2. File Structure

```
ATC/
├── visualization/
│   ├── __init__.py           # Package initialization
│   ├── callbacks.py          # Data capture callbacks
│   ├── server.py             # WebSocket server
│   └── web/
│       ├── index.html        # Web interface
│       └── visualizer.js     # Visualization logic
```

## Quick Start

### Option 1: Manual Integration

#### Step 1: Start the WebSocket Server

In one terminal:

```bash
cd visualization
python server.py
```

You should see:
```
Starting ATC Visualization Server...
Visualization server running on ws://localhost:8765
```

#### Step 2: Open the Web Interface

Open `visualization/web/index.html` in your browser, or serve it:

```bash
cd visualization/web
python -m http.server 3000
```

Then open: http://localhost:3000

#### Step 3: Run Training with Visualization

Modify your training script to use visualization:

```python
# In train/train_rllib.py or your training script
import asyncio
import threading
from visualization.server import VisualizationServer
from visualization.callbacks import VisualizationCallback

# Start visualization server in background thread
viz_server = VisualizationServer()

def run_viz_server():
    asyncio.run(viz_server.start())

viz_thread = threading.Thread(target=run_viz_server, daemon=True)
viz_thread.start()

# Create callback
viz_callback = VisualizationCallback(viz_server=viz_server)

# Use in environment (see integration below)
```

### Option 2: Integrated Test Script

Create a simple test to verify everything works:

```python
# File: test_visualization.py
import asyncio
import threading
import time
from visualization.server import VisualizationServer
from visualization.callbacks import VisualizationCallback
from bluesky_adapter.adapter import BlueSkySim

def run_server():
    server = VisualizationServer()
    asyncio.run(server.start())

# Start server
server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()
time.sleep(1)

# Create simulation and callback
viz_server = VisualizationServer()
callback = VisualizationCallback(viz_server)
sim = BlueSkySim("scenarios/straight_4.scn", seed=42)

# Reset
states = sim.reset()
callback.on_reset(states, {"episode": 1})

# Run simulation
for step in range(50):
    commands = []  # No control
    states = sim.step(commands)

    callback.on_step(
        states=states,
        actions=[],
        rewards=0.5,
        info={"los": 0, "num_alive": 4, "min_sep_nm": 10.0}
    )

    time.sleep(0.1)  # Slow down for visualization

callback.on_episode_end(25.0, 50, {"los": 0})
print("Test complete! Check web interface.")

# Keep alive
while True:
    time.sleep(1)
```

Run:
```bash
python test_visualization.py
```

Then open the web interface to see aircraft moving!

## Integration with SyntheticTowerEnv

### Modify Environment Class

Edit `st_env/env.py`:

```python
from typing import Optional
from visualization.callbacks import VisualizationCallback

class SyntheticTowerEnv(gym.Env):
    def __init__(
        self,
        scenario: str,
        step_seconds: float = 5.0,
        seed: int = 0,
        horizon: int = 400,
        viz_callback: Optional[VisualizationCallback] = None  # ADD THIS
    ):
        super().__init__()
        # ... existing code ...
        self.viz_callback = viz_callback  # ADD THIS

    def reset(self, *, seed=None, options=None):
        # ... existing code ...

        # ADD THIS:
        if self.viz_callback:
            self.viz_callback.on_reset(states, info)

        return obs, info

    def step(self, action):
        # ... existing code ...

        # ADD THIS (before return):
        if self.viz_callback:
            self.viz_callback.on_step(
                states=states,
                actions=action,
                rewards=reward,
                info=info
            )

        # Check for episode end
        if terminated or truncated:
            if self.viz_callback:
                self.viz_callback.on_episode_end(
                    total_reward=reward,  # Or accumulated
                    episode_length=self._step_count,
                    info=info
                )

        return obs, reward, terminated, truncated, info
```

### Modify Training Script

Edit `train/train_rllib.py`:

```python
import asyncio
import threading
from visualization.server import VisualizationServer
from visualization.callbacks import VisualizationCallback

# At the top of main():
def main():
    # ... argument parsing ...

    # ADD: Start visualization server
    viz_server = VisualizationServer()

    def run_viz_server():
        asyncio.run(viz_server.start())

    viz_thread = threading.Thread(target=run_viz_server, daemon=True)
    viz_thread.start()

    # Create callback
    viz_callback = VisualizationCallback(viz_server=viz_server)

    # Modify environment factory
    def make_env(config):
        return SyntheticTowerEnv(
            scenario=config.get("scenario", "scenarios/straight_4.scn"),
            step_seconds=config.get("step_seconds", 5.0),
            seed=config.get("seed", 0),
            horizon=config.get("horizon", 400),
            viz_callback=viz_callback  # ADD THIS
        )

    # ... rest of training code ...
```

## Usage

### Starting a Training Session with Visualization

1. **Terminal 1:** Start visualization server (if not integrated)
   ```bash
   cd visualization
   python server.py
   ```

2. **Terminal 2:** Open web interface
   ```bash
   cd visualization/web
   python -m http.server 3000
   # Or just open index.html directly in browser
   ```

3. **Terminal 3:** Start training
   ```bash
   python train/train_rllib.py --cpus 4 --iterations 100
   ```

4. **Browser:** Navigate to http://localhost:3000

You should see aircraft moving in real-time!

## Features

### Current Features

✅ Real-time aircraft position visualization
✅ Heading indicators
✅ Altitude color-coding
✅ Goal markers with distance lines
✅ Live metrics panel (rewards, LoS events, etc.)
✅ Connection status indicator
✅ Sector boundary and grid

### Coming Soon

🔄 Episode replay controls
🔄 Speed control (1x, 2x, 5x, 10x)
🔄 Reward component breakdown
🔄 Training progress charts
🔄 Separation violation highlighting
🔄 3D altitude visualization

## Troubleshooting

### Server won't start

**Error:** `Address already in use`

**Solution:** Port 8765 is already taken. Either kill the existing process or change the port:

```python
viz_server = VisualizationServer(host="localhost", port=8766)
```

### Web interface shows "Disconnected"

1. Check server is running: `ps aux | grep server.py`
2. Check correct URL: Should be `ws://localhost:8765`
3. Check firewall settings

### No aircraft visible

1. Verify data is being sent: Check server console for log messages
2. Check browser console for errors (F12)
3. Verify callback is properly integrated in environment

### Performance issues

If visualization causes training to slow down:

1. Increase throttle rate:
   ```python
   callback = VisualizationCallback(viz_server, throttle_ms=500)  # Send less often
   ```

2. Disable visualization for worker processes:
   ```python
   # Only visualize one worker
   viz_callback = viz_callback if worker_id == 0 else None
   ```

## Advanced Configuration

### Custom Throttling

Control update frequency:

```python
callback = VisualizationCallback(
    viz_server=viz_server,
    throttle_ms=100,    # Send updates every 100ms max
    buffer_size=1000    # Keep last 1000 steps in memory
)
```

### Episode Recording

Save episodes for offline replay:

```python
from visualization.callbacks import SimpleLogger

logger = SimpleLogger(output_dir="./logs/episodes")

# After episode ends:
logger.log_episode(
    episode_data=callback.get_episode_buffer(),
    metadata={"reward": total_reward, "length": length}
)
```

### Multiple Clients

The server supports multiple simultaneous connections. Open the web interface in multiple browser tabs/windows to share the view.

## Next Steps

1. ✅ **Test basic visualization** with standalone script
2. ✅ **Integrate with environment** following guide above
3. 📝 **Add episode replay** (see VISUALIZATION_PLAN.md)
4. 📝 **Implement 3D view** with Three.js (optional)
5. 📝 **Add training metrics dashboard** (optional)

## Performance Notes

- **Latency:** Expect 50-100ms update latency depending on network
- **Bandwidth:** ~1-5 KB/s per aircraft at 10 FPS
- **CPU overhead:** Minimal (<1% on modern CPU)
- **Training impact:** Negligible with proper throttling

## File Reference

| File | Purpose |
|------|---------|
| `visualization/callbacks.py` | Data capture and streaming |
| `visualization/server.py` | WebSocket server |
| `visualization/web/index.html` | Web UI |
| `visualization/web/visualizer.js` | Canvas rendering |

## Support

For issues or questions:
1. Check this guide
2. See `VISUALIZATION_PLAN.md` for architecture details
3. Check code comments in source files

---

**Quick Test Command:**

```bash
# Terminal 1
python visualization/server.py

# Terminal 2 (in another window)
python test_visualization.py

# Browser
# Open visualization/web/index.html
```

You should see 4 aircraft flying in a crossing pattern!
