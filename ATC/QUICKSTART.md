# Quick Start Guide

## Installation

### 1. Check Python Version

**IMPORTANT**: You need **Python 3.11** specifically (not 3.12 or 3.13).

```bash
python --version
# Should show: Python 3.11.x
```

If you have Python 3.13 (which has package compatibility issues), see `INSTALL_FIX.md` for instructions on installing Python 3.11 alongside your current installation.

**Quick fix for Windows users:**
```bash
# Download Python 3.11.9 from python.org, then:
py -3.11 -m venv venv311
venv311\Scripts\activate

# Or use the automated script:
setup_py311.bat
```

### 2. Create Virtual Environment (Recommended)

```bash
# Create virtual environment
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Activate on Linux/Mac
source venv/bin/activate
```

### 3. Install Dependencies

```bash
# Install all required packages
pip install -r requirements.txt

# Or install with development tools
pip install -e ".[dev]"
```

### 4. Verify Installation

```bash
python setup_check.py
```

Expected output:
```
Checking required packages...
--------------------------------------------------
[OK] gymnasium is installed
[OK] numpy is installed
[OK] ray[rllib] is installed
[OK] torch is installed
[OK] pyyaml is installed
--------------------------------------------------

[OK] All required packages are installed!
```

## Running Tests

### Smoke Tests

```bash
# Run all tests with pytest
pytest -q tests/

# Or run directly
python tests/test_env_smoke.py
```

Expected output:
```
[OK] test_env_creation
[OK] test_env_reset
[OK] test_env_step
[OK] test_env_episode
[OK] test_action_space_bounds
[OK] test_observation_normalization
[OK] test_deterministic_reset
[OK] test_reward_components

All tests passed!
```

## Training

### Basic Training

```bash
# Train with default settings (8 CPUs, no GPU)
python train/train_rllib.py --cpus 8 --gpus 0
```

### Advanced Training

```bash
# Train with more resources
python train/train_rllib.py \
    --cpus 16 \
    --gpus 1 \
    --iterations 1000 \
    --checkpoint-freq 10 \
    --checkpoint-dir ./checkpoints \
    --scenario scenarios/straight_4.scn
```

### Monitor Progress

Training will output progress every iteration:

```
Iter    0 | Reward:    -8.45 | Len:  180.2 | Episodes:   12
Iter    1 | Reward:    -7.82 | Len:  195.4 | Episodes:   14
...
Iter   10 | Reward:    -5.32 | Len:  245.8 | Episodes:   15
  [OK] Checkpoint saved: ./checkpoints/checkpoint_000010
```

## Project Structure

```
ATC/
├── bluesky_adapter/          # BlueSky simulator wrapper
│   ├── __init__.py
│   └── adapter.py           # Stub (replace with BlueSky API)
├── st_env/                   # Gymnasium environment
│   ├── __init__.py
│   ├── env.py               # Main environment
│   ├── reward.py            # Reward function
│   └── utils.py             # Utilities
├── train/                    # Training scripts
│   ├── __init__.py
│   ├── train_rllib.py       # PPO training
│   └── models.py            # Custom models
├── tests/                    # Unit tests
│   ├── __init__.py
│   └── test_env_smoke.py
├── configs/                  # Configuration
│   └── ppo_baseline.yaml
├── scenarios/                # BlueSky scenarios
├── requirements.txt          # Dependencies
├── pyproject.toml           # Project config
├── README.md                # Full documentation
└── QUICKSTART.md            # This file
```

## Next Steps

### 1. Verify Environment Works

```bash
python tests/test_env_smoke.py
```

### 2. Start Training

```bash
python train/train_rllib.py --cpus 4 --iterations 100
```

### 3. Integrate BlueSky

Edit `bluesky_adapter/adapter.py` and replace stub methods with real BlueSky API calls. See README.md for details.

### 4. Curriculum Learning

Start with simple scenarios and gradually increase complexity:

1. 4 aircraft, straight paths → `scenarios/straight_4.scn`
2. 8 aircraft, crossing patterns → `scenarios/cross_8.scn`
3. 12-16 aircraft, complex routes → `scenarios/complex_16.scn`

## Troubleshooting

### Import Errors

If you see `ModuleNotFoundError`:

```bash
# Reinstall dependencies
pip install -r requirements.txt

# Verify installation
python setup_check.py
```

### CUDA Errors (GPU Training)

If you see CUDA errors with `--gpus 1`:

```bash
# Train on CPU instead
python train/train_rllib.py --cpus 8 --gpus 0
```

### Ray Initialization Errors

If Ray fails to start:

```bash
# Stop any existing Ray processes
ray stop

# Try training again
python train/train_rllib.py
```

### Memory Issues

If training crashes with memory errors:

```bash
# Reduce batch size in train/train_rllib.py
# Change train_batch_size from 32768 to 16384
```

## Common Commands

```bash
# Check setup
python setup_check.py

# Run tests
pytest -q tests/
python tests/test_env_smoke.py

# Train agent
python train/train_rllib.py --cpus 8

# Format code
black .
isort .

# Lint code
ruff check .
```

## Support

For issues and questions:
1. Check README.md for detailed documentation
2. Review error messages carefully
3. Ensure all dependencies are installed
4. Check Python version (3.11+ required)

## What's Next?

- **Integrate BlueSky**: Replace adapter stub with real API
- **Tune hyperparameters**: Edit `configs/ppo_baseline.yaml`
- **Add complexity**: Create more challenging scenarios
- **Custom models**: Use attention model in `train/models.py`
- **Metrics**: Track safety and efficiency metrics
