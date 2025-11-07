Human: # ATC Visualization System - Complete Guide

## 🎉 System Overview

The ATC visualization system provides a comprehensive solution for real-time monitoring, episode replay, and training analysis. It features:

- **Real-time visualization** via WebSocket streaming
- **Episode recording** and replay with full playback controls
- **Multiple integration methods** (wrapper, decorator, manual)
- **Zero-config setup** with sensible defaults
- **Production-ready** architecture

## 📦 What's Included

### Backend Components

1. **VisualizationServer** (`viz_server.py`)
   - WebSocket server for real-time streaming
   - Multi-client support
   - Message queuing and broadcasting
   - Episode history storage

2. **VisualizationCallback** (`callbacks.py`)
   - Captures training data
   - Throttled updates for performance
   - Metrics aggregation
   - Simple file logging option

3. **Episode Replay System** (`replay.py`)
   - EpisodeRecorder - Save episodes to disk
   - EpisodePlayer - Playback with speed control
   - EpisodeBrowser - Search and filter episodes

4. **Integration Helpers** (`integration.py`)
   - VisualizationManager - High-level API
   - EnvWrapper - Automatic wrapping
   - Decorators for env factories
   - RLlib integration helpers

### Frontend Components

1. **Live Visualization** (`web/index.html`, `visualizer.js`)
   - Real-time 2D aircraft display
   - Altitude color-coding
   - Heading indicators and goal markers
   - Live metrics dashboard

2. **Episode Replay** (`web/replay.html`, `replay.js`)
   - Full playback controls (play, pause, seek)
   - Speed control (0.5x to 5x)
   - Timeline scrubbing
   - Reward visualization
   - Keyboard shortcuts

## 🚀 Quick Start (3 Methods)

### Method 1: Simple Setup (Easiest)

```python
from visualization import setup_visualization

# One line to enable everything!
viz = setup_visualization(enable=True, record=True)

# Get callback for your environment
callback = viz.get_callback()

# Use in your training loop
callback.on_reset(states, info)
callback.on_step(states, actions, reward, info)
callback.on_episode_end(total_reward, length, info)
```

**Example:** `examples/viz_simple.py`

### Method 2: Environment Wrapper

```python
from visualization import wrap_env_with_viz
from st_env.env import SyntheticTowerEnv

# Create environment
env = SyntheticTowerEnv(...)

# Wrap it - visualization automatic!
env = wrap_env_with_viz(env, enable=True)

# Use normally - no other changes needed
obs, info = env.reset()
obs, reward, done, trunc, info = env.step(action)
```

**Example:** `examples/viz_wrapper.py`

### Method 3: Decorator (Best for RLlib)

```python
from visualization import with_visualization

@with_visualization(port=8765, record=True)
def make_env(config):
    return SyntheticTowerEnv(**config)

# Now every env created has visualization!
env = make_env(config)
```

**Example:** `examples/viz_decorator.py`

## 🎮 Using the Visualization

### Live View

1. **Start your training** (with visualization enabled)
2. **Open browser:** `visualization/web/index.html`
3. **Watch in real-time:** Aircraft move, metrics update live

**Features:**
- Connection status indicator
- Real-time aircraft positions
- Heading vectors
- Altitude color-coding (green/blue/orange)
- Goal markers with distance lines
- Live metrics panel

### Episode Replay

1. **Open replay interface:** `visualization/web/replay.html`
2. **Select episode** from sidebar
3. **Control playback:**
   - Play/Pause: `Space` or button
   - Step forward: `→` arrow
   - Step backward: `←` arrow
   - Reset: `R` key
   - Seek: Click timeline
   - Speed: 0.5x, 1x, 2x, 5x buttons

**Features:**
- Full scrubbing timeline
- Reward visualization chart
- Per-step metrics
- Episode comparison

## 📁 File Structure

```
ATC/
├── visualization/
│   ├── __init__.py              # Package exports
│   ├── viz_server.py            # WebSocket server
│   ├── callbacks.py             # Data capture
│   ├── replay.py                # Episode recording/playback
│   ├── integration.py           # Helper APIs
│   └── web/
│       ├── index.html           # Live view
│       ├── visualizer.js        # Live rendering
│       ├── replay.html          # Replay interface
│       └── replay.js            # Replay controller
│
├── examples/
│   ├── viz_simple.py            # Simple setup example
│   ├── viz_wrapper.py           # Wrapper example
│   └── viz_decorator.py         # Decorator example
│
└── logs/
    └── episodes/                # Recorded episodes
        ├── episode_000001_20250107_143215.json.gz
        ├── episode_000002_20250107_143542.json.gz
        └── ...
```

## 🔧 Configuration Options

### VisualizationManager

```python
from visualization import VisualizationManager

manager = VisualizationManager(
    host="localhost",        # Server host
    port=8765,               # WebSocket port
    record_episodes=True,    # Save episodes?
    episodes_dir="./logs/episodes",  # Where to save
    throttle_ms=100          # Update rate (ms)
)

manager.start()  # Start server
callback = manager.get_callback()  # Get callback
```

### Episode Recording

```python
from visualization.replay import EpisodeRecorder

recorder = EpisodeRecorder(output_dir="./logs/episodes")

# During episode
recorder.record_step(step_data)

# At episode end
filepath = recorder.save_episode(
    metadata={"total_reward": 25.4, "length": 150},
    compress=True  # Use gzip compression
)
```

### Episode Playback

```python
from visualization.replay import EpisodePlayer

player = EpisodePlayer()

# Load episode
metadata = player.load_episode("logs/episodes/episode_000001.json.gz")

# Control playback
player.play()
player.pause()
player.seek(step_index=50)
player.next_step()
player.prev_step()
player.set_speed(2.0)  # 2x speed

# Get current state
step_data = player.get_step()
progress = player.get_progress()  # 0.0 to 1.0
```

### Episode Browsing

```python
from visualization.replay import EpisodeBrowser

browser = EpisodeBrowser(episodes_dir="./logs/episodes")

# List all episodes
episodes = browser.list_episodes(limit=10, sort_by="reward")

# Search episodes
good_episodes = browser.search_episodes(
    min_reward=20.0,
    has_los=False
)

# Get best/worst
best = browser.get_best_episodes(n=10)
worst = browser.get_worst_episodes(n=10)

# Statistics
stats = browser.get_statistics()
# Returns: {count, total_size_mb, reward: {mean, min, max}, length: {...}}
```

## 🎯 Integration with RLlib

### Option 1: Env Factory

```python
# train/train_rllib.py
from visualization import make_rllib_env_with_viz

# Register environment
register_env("SyntheticTowerEnv", make_rllib_env_with_viz)

# Configure
config = (
    PPOConfig()
    .environment(
        "SyntheticTowerEnv",
        env_config={
            "scenario": "scenarios/straight_4.scn",
            "enable_viz": True,  # Enable visualization
            "step_seconds": 5.0,
            "seed": 0
        }
    )
)

# Train - worker 0 will have visualization
algo = config.build()
for i in range(1000):
    result = algo.train()
```

### Option 2: Custom Wrapper

```python
from visualization import VisualizationManager

# Start viz server once
viz_manager = VisualizationManager()
viz_manager.start()

def make_env(config):
    env = SyntheticTowerEnv(**config)

    # Only visualize worker 0
    if config.get("worker_index", 0) == 0:
        from visualization import EnvWrapper
        return EnvWrapper(env, viz_manager)

    return env

register_env("SyntheticTowerEnv", make_env)
```

## 📊 Data Format

### Step Data

```json
{
  "step": 42,
  "timestamp": 1704643935.123,
  "states": [
    {
      "id": "AC001",
      "x_nm": 45.2,
      "y_nm": -12.8,
      "v_kt": 250.0,
      "hdg_rad": 1.57,
      "alt_ft": 12000.0,
      "goal_x_nm": -40.0,
      "goal_y_nm": 15.0,
      "alive": true
    }
  ],
  "actions": [0.05, -200.0, ...],
  "reward": 0.5,
  "info": {
    "los": 0,
    "min_sep_nm": 8.5,
    "num_alive": 4,
    "r_components": {
      "los": 0.0,
      "near": -0.5,
      "progress": 0.3,
      "terminal": 0.0
    }
  }
}
```

### Episode File

```json
{
  "metadata": {
    "episode_id": 1,
    "timestamp": "20250107_143215",
    "total_reward": 25.4,
    "episode_length": 150,
    "num_steps": 150,
    "info": {"los": 0}
  },
  "steps": [/* array of step data */]
}
```

## 🔍 Troubleshooting

### Server Won't Start

**Problem:** `Address already in use`

**Solution:** Port is taken. Change port:
```python
viz = setup_visualization(port=8766)  # Use different port
```

Or kill existing process:
```bash
# Windows
netstat -ano | findstr :8765
taskkill /PID <pid> /F

# Linux/Mac
lsof -ti:8765 | xargs kill -9
```

### Web Client Shows "Disconnected"

1. **Check server is running:** Look for "Visualization server running..."
2. **Check browser console:** Press F12, look for WebSocket errors
3. **Check firewall:** Allow port 8765
4. **Try different browser:** Chrome/Firefox recommended

### No Aircraft Visible

1. **Check data is flowing:** Server console should show messages
2. **Check browser console:** Look for JavaScript errors
3. **Verify callback integration:** Ensure `on_step()` is called
4. **Check aircraft are alive:** `states[i]["alive"]` should be true

### Performance Issues

**Problem:** Training is slower with visualization

**Solutions:**

1. **Increase throttle:**
   ```python
   viz = setup_visualization(throttle_ms=500)  # Update less often
   ```

2. **Disable for most workers:**
   ```python
   enable_viz = worker_index == 0  # Only worker 0
   ```

3. **Disable recording:**
   ```python
   viz = setup_visualization(record=False)
   ```

### Episodes Not Saving

1. **Check directory exists:** `logs/episodes/` should be created
2. **Check permissions:** Ensure write access
3. **Check disk space:** Ensure sufficient space
4. **Verify `on_episode_end()` is called:** Add logging

## 📈 Performance Characteristics

### Overhead

- **Latency:** 50-100ms typical
- **Bandwidth:** ~5 KB/s per aircraft at 10 FPS
- **CPU:** <1% overhead with throttling
- **Memory:** ~10 MB buffer (1000 steps)

### Scaling

- **Concurrent clients:** Tested with 10+ clients
- **Episode size:** Handles 1000+ step episodes
- **File size:** ~100 KB per episode (compressed)
- **Storage:** ~100 episodes = ~10 MB

## 🎨 Customization

### Custom Metrics

```python
# Add custom metrics to callback
callback.on_step(
    states=states,
    actions=actions,
    rewards=reward,
    info={
        "los": 0,
        "min_sep_nm": 10.0,
        "custom_metric": 42.0,  # Your metric
        "another_metric": "data"
    }
)
```

### Custom Visualization

Edit `visualization/web/visualizer.js`:

```javascript
// Add custom rendering
drawAircraft(ac) {
    // ... existing code ...

    // Add your custom visuals
    if (ac.custom_data) {
        this.ctx.fillStyle = '#ff00ff';
        // ... draw something ...
    }
}
```

### Custom Colors

Edit CSS in `index.html` or `replay.html`:

```css
:root {
    --primary-color: #e94560;  /* Change theme color */
    --bg-color: #1a1a2e;
    --panel-color: #16213e;
}
```

## 🚀 Advanced Features

### Multi-Environment Comparison

```python
# Create multiple managers with different ports
viz1 = VisualizationManager(port=8765)
viz2 = VisualizationManager(port=8766)

viz1.start()
viz2.start()

# Use with different environments
env1 = wrap_env_with_viz(env1, viz_manager=viz1)
env2 = wrap_env_with_viz(env2, viz_manager=viz2)

# Open multiple browser tabs to compare
```

### Programmatic Episode Analysis

```python
from visualization.replay import EpisodeBrowser, EpisodePlayer

browser = EpisodeBrowser()
player = EpisodePlayer()

# Find episodes with LoS events
los_episodes = browser.search_episodes(has_los=True)

# Analyze each
for ep_meta in los_episodes:
    player.load_episode(ep_meta['filepath'])

    # Find when LoS occurred
    for step_idx in range(player.get_length()):
        step = player.get_step(step_idx)
        if step['info']['los'] > 0:
            print(f"LoS at step {step_idx}: {step['states']}")
```

### Batch Export

```python
from visualization.replay import EpisodeBrowser
import json

browser = EpisodeBrowser()

# Get best episodes
best = browser.get_best_episodes(n=10)

# Export metadata
with open('best_episodes.json', 'w') as f:
    json.dump(best, f, indent=2)
```

## 📚 API Reference

### setup_visualization()

```python
def setup_visualization(
    enable: bool = True,
    port: int = 8765,
    record: bool = True,
    **kwargs
) -> Optional[VisualizationManager]
```

Quick setup function. Returns `None` if disabled.

### wrap_env_with_viz()

```python
def wrap_env_with_viz(
    env,
    enable: bool = True,
    **kwargs
) -> gym.Env
```

Wraps environment with visualization. Returns original if disabled.

### @with_visualization

```python
def with_visualization(
    port: int = 8765,
    record: bool = True,
    auto_start: bool = True
)
```

Decorator for environment factories.

## 🎓 Examples

All examples are in `examples/` directory:

1. **viz_simple.py** - Minimal setup, direct callback usage
2. **viz_wrapper.py** - Automatic wrapper integration
3. **viz_decorator.py** - Decorator for env factories
4. **test_visualization_demo.py** - Full demonstration

Run any example:
```bash
python examples/viz_simple.py
```

Then open `visualization/web/index.html` in your browser.

## 🌟 Best Practices

### For Development

- Use wrapper or decorator for quick prototyping
- Enable recording to debug later
- Use 1x speed for initial testing

### For Training

- Only visualize worker 0 in distributed training
- Increase throttle (200-500ms) for performance
- Disable recording unless needed

### For Debugging

- Record all episodes with issues
- Use replay to step through problems
- Check reward components in detail

### For Demonstrations

- Use replay for presentations
- Record best episodes
- Use 2-5x speed for time-lapse effect

## 🔮 Future Enhancements

Planned features (see VISUALIZATION_PLAN.md):

- [ ] 3D visualization with Three.js
- [ ] Heatmaps for conflict zones
- [ ] Advanced analytics dashboard
- [ ] Real-time training curves
- [ ] Multi-episode comparison
- [ ] Video export
- [ ] Cloud deployment guide

## 📞 Support

### Documentation

- **Architecture:** `VISUALIZATION_PLAN.md`
- **Quick start:** `VISUALIZATION_QUICKSTART.md`
- **This guide:** `VISUALIZATION_COMPLETE.md`

### Common Issues

See Troubleshooting section above.

### Code Comments

All modules have detailed docstrings. Use Python's help:
```python
from visualization import VisualizationManager
help(VisualizationManager)
```

## ✅ Checklist

Before using visualization:

- [ ] Python 3.11+ installed
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Port 8765 available (or choose different port)
- [ ] Modern browser available (Chrome/Firefox)
- [ ] Example runs successfully

For production:

- [ ] Only visualize necessary workers
- [ ] Set appropriate throttle rate
- [ ] Disable recording if not needed
- [ ] Monitor disk space for recordings
- [ ] Test performance impact

## 🎉 Summary

The visualization system provides:

✅ **Easy integration** - 3 methods, pick what works
✅ **Real-time monitoring** - See training live
✅ **Episode replay** - Debug and analyze
✅ **Zero config** - Sensible defaults
✅ **Production ready** - Minimal overhead
✅ **Extensible** - Customize as needed

Get started in 3 lines of code:
```python
from visualization import setup_visualization
viz = setup_visualization()
callback = viz.get_callback()
```

Happy visualizing! 🚀
