# Synthetic Tower: AI ATC Controller Training Environment

Gymnasium environment wrapping BlueSky for training AI air traffic controllers using RLlib PPO.

## Overview

This project implements a reinforcement learning environment for training an AI controller to manage air traffic in a simulated sector. The controller issues vectoring commands (heading and altitude changes) to aircraft while maintaining safety separation and efficiency.

### Key Features

- **Single-agent control**: One controller manages all aircraft in the sector
- **Continuous actions**: Smooth heading and altitude rate changes
- **Dense rewards**: Safety penalties, progress rewards, efficiency metrics
- **Curriculum learning**: Start simple, increase complexity gradually
- **BlueSky integration**: Stub adapter ready for real BlueSky API integration

## Architecture

```
synthetic-tower/
├── bluesky_adapter/     # BlueSky simulator wrapper
│   ├── __init__.py
│   └── adapter.py       # Stub implementation (replace with BlueSky API)
├── st_env/              # Gymnasium environment
│   ├── __init__.py
│   ├── env.py          # Main environment class
│   ├── reward.py       # Reward computation
│   ├── utils.py        # Utility functions
├── train/               # Training scripts
│   ├── __init__.py
│   ├── train_rllib.py  # PPO training script
│   └── models.py       # Custom neural network models
├── tests/               # Unit tests
│   └── test_env_smoke.py
├── configs/             # Configuration files
│   └── ppo_baseline.yaml
├── scenarios/           # BlueSky scenario files
└── pyproject.toml      # Project configuration
```

## Environment Specification

### Observation Space

Per-aircraft features (16 aircraft max, zero-padded):
- Position (x, y) in NM
- Velocity (kt), heading (sin/cos)
- Altitude (ft)
- Goal position and bearing/range
- Intent state (one-hot)

Global features:
- Traffic density
- Wind components
- Normalized episode time

Shape: `(MAX_AC * 18 + 8,)` = `(296,)`, normalized to `[-1, 1]`

### Action Space

Continuous actions per aircraft:
- `Δheading`: Change in heading, `[-0.2, 0.2]` rad/step
- `Δaltitude_rate`: Change in vertical speed, `[-1.0, 1.0]` kft/min

Shape: `(MAX_AC * 2,)` = `(32,)`

### Reward Function

| Component | Value | Description |
|-----------|-------|-------------|
| Loss of Separation | -10.0 per event | <5 NM & <1000 ft |
| Near Miss | -2.0 | <6 NM & <1200 ft |
| Progress | +0.05 per NM | Toward goal |
| Terminal Bonus | +5.0 per aircraft | Successful exit |
| Catastrophe | -10.0 | 2+ simultaneous LoS |

Total reward clipped to `[-20.0, +5.0]`

### Termination Conditions

- **Horizon**: 400 steps (~33 min sim time @ 5s/step)
- **Catastrophe**: 2+ loss of separation events
- **All exited**: All aircraft reached goals

## Installation

### Requirements

- Python 3.11+
- PyTorch 2.3+
- Ray[RLlib] 2.9+
- Gymnasium 0.29+

### Setup

```bash
# Clone repository
git clone <repo-url>
cd synthetic-tower

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Or install in development mode
pip install -e ".[dev]"
```

## Usage

### Run Smoke Tests

```bash
# Using pytest
pytest -q tests/

# Or run directly
python tests/test_env_smoke.py
```

### Train PPO Agent

```bash
# Basic training (8 CPUs, no GPU)
python train/train_rllib.py --cpus 8 --gpus 0

# With custom parameters
python train/train_rllib.py \
    --cpus 16 \
    --gpus 1 \
    --iterations 1000 \
    --checkpoint-freq 10 \
    --checkpoint-dir ./checkpoints \
    --scenario scenarios/straight_4.scn
```

### Monitor Training

Training will output:
```
Iter    0 | Reward:    -8.45 | Len:  180.2 | Episodes:   12
  ✓ Checkpoint saved: ./checkpoints/checkpoint_000010
Iter   10 | Reward:    -5.32 | Len:  245.8 | Episodes:   15
...
```

## Curriculum Learning

Start with simple scenarios and progressively increase difficulty:

1. **Phase 1**: 4 aircraft, straight paths, no wind
   - Goal: Learn basic separation

2. **Phase 2**: 8 aircraft, crossing patterns, light wind
   - Goal: Handle conflicts

3. **Phase 3**: 12-16 aircraft, complex routes, variable wind
   - Goal: Optimize efficiency

4. **Phase 4**: Approach/departure procedures, altitude constraints
   - Goal: Real-world operations

## BlueSky Integration

The current implementation uses a stub adapter. To integrate with BlueSky:

### Replace Stub Methods

In `bluesky_adapter/adapter.py`:

```python
def _load_scenario(self, scenario: str):
    """Replace with BlueSky scenario loading"""
    bluesky.load_scenario(scenario)

def step(self, commands):
    """Replace with BlueSky control APIs"""
    for cmd in commands:
        acid = cmd["id"]
        bluesky.traf.ap.selhdg(acid, hdg)
        bluesky.traf.ap.selvs(acid, vs)

    bluesky.sim.step(self.dt)
    return self._snapshot()

def _snapshot(self):
    """Replace with BlueSky state queries"""
    states = []
    for i, acid in enumerate(bluesky.traf.id):
        states.append({
            "id": acid,
            "x_nm": ...,  # Convert from bluesky.traf.lat/lon
            "y_nm": ...,
            "v_kt": bluesky.traf.gs[i],
            "hdg_rad": np.radians(bluesky.traf.hdg[i]),
            "alt_ft": bluesky.traf.alt[i],
            ...
        })
    return states
```

## Configuration

Edit `configs/ppo_baseline.yaml` to adjust hyperparameters:

```yaml
training:
  gamma: 0.995           # Discount factor
  lr: 3.0e-4            # Learning rate
  train_batch_size: 32768
  num_sgd_iter: 8
```

## Development

### Code Formatting

```bash
# Format code
black .
isort .

# Lint
ruff check .

# Type check
mypy .
```

### Run Tests

```bash
pytest -v --cov=st_env --cov=bluesky_adapter
```

## Safety and Performance Metrics

Track these metrics during training:

- **Safety**: LoS events per episode, minimum separation
- **Efficiency**: Average path length, fuel proxy
- **Throughput**: Aircraft handled per hour
- **Stability**: Control smoothness, oscillations

## Extensions

Future enhancements:

1. **Speed control**: Add third action dimension
2. **Attention model**: Use `train/models.py` AttentionATCModel
3. **Multi-sector**: Coordinate multiple controllers
4. **LLM integration**: Natural language commands
5. **Real weather**: Dynamic wind, turbulence
6. **Realistic procedures**: SIDs, STARs, holdings

## References

- BlueSky: https://github.com/TUDelft-CNS-ATM/bluesky
- RLlib: https://docs.ray.io/en/latest/rllib/
- Gymnasium: https://gymnasium.farama.org/

## License

MIT License

## Contributing

Contributions welcome! Please:
1. Fork repository
2. Create feature branch
3. Add tests for new features
4. Format code (black, isort)
5. Submit pull request
