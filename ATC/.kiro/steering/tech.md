# Technology Stack

## Core Dependencies

### Python Environment
- **Python 3.11** (required - not 3.13 due to NumPy compatibility)
- Virtual environment management via `venv`

### Machine Learning Stack
- **Ray[RLlib] 2.9+**: Distributed reinforcement learning framework
- **PyTorch 2.3+**: Neural network backend for policy/value networks
- **Gymnasium 0.29+**: RL environment interface (OpenAI Gym successor)
- **NumPy 1.24+**: Numerical computing and array operations

### Simulation & Data
- **BlueSky**: Air traffic simulator (currently stubbed in `bluesky_adapter/`)
- **PyYAML 6.0+**: Configuration file parsing

### Development Tools
- **pytest 7.4+**: Unit testing framework
- **black 23.0+**: Code formatting
- **isort 5.12+**: Import sorting
- **mypy 1.5+**: Static type checking
- **ruff 0.1+**: Fast Python linter

## Build System
- **setuptools**: Package building via `pyproject.toml`
- **pip**: Dependency management via `requirements.txt`

## Common Commands

### Environment Setup
```bash
# Create Python 3.11 virtual environment
py -3.11 -m venv venv311
venv311\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Development install
pip install -e ".[dev]"
```

### Testing
```bash
# Run smoke tests
python tests/test_env_smoke.py

# Full test suite
pytest -v --cov=st_env --cov=bluesky_adapter

# Check installation
python setup_check.py
```

### Training
```bash
# Basic PPO training
python train/train_rllib.py --cpus 8 --gpus 0

# With custom parameters
python train/train_rllib.py --cpus 16 --gpus 1 --iterations 1000 --checkpoint-freq 10
```

### Code Quality
```bash
# Format code
black .
isort .

# Lint
ruff check .

# Type check
mypy .
```

## Architecture Patterns

### Gymnasium Environment Pattern
- Implement `gym.Env` interface with `reset()` and `step()` methods
- Observation/action spaces defined as `gymnasium.spaces.Box`
- Reward computation separated into dedicated module

### Adapter Pattern
- `BlueSkySim` wraps external simulator with clean interface
- Stub implementation allows development without BlueSky dependency
- Easy to swap implementations via dependency injection

### RLlib Integration
- Environment factory function for distributed training
- Custom model registration via `ModelCatalog`
- Configuration-driven hyperparameter management

## Performance Considerations
- Use NumPy vectorization for observation encoding
- Batch simulation calls when possible
- Pin memory for GPU transfers
- Parallel rollout workers for experience collection