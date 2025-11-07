# Setup and Deployment Checklist

## Installation Checklist

### Prerequisites
- [ ] Python 3.11+ installed
- [ ] pip installed and up to date
- [ ] Git installed (for version control)
- [ ] 8+ CPU cores available
- [ ] 16+ GB RAM available
- [ ] (Optional) CUDA-compatible GPU

### Environment Setup
- [ ] Navigate to project directory
- [ ] Create virtual environment: `python -m venv venv`
- [ ] Activate virtual environment
  - Windows: `venv\Scripts\activate`
  - Linux/Mac: `source venv/bin/activate`
- [ ] Verify Python version: `python --version`

### Dependency Installation
- [ ] Install core dependencies: `pip install -r requirements.txt`
- [ ] Verify installation: `python setup_check.py`
- [ ] Confirm all packages show `[OK]`

Expected output:
```
[OK] gymnasium is installed
[OK] numpy is installed
[OK] ray[rllib] is installed
[OK] torch is installed
[OK] pyyaml is installed
```

## Testing Checklist

### Smoke Tests
- [ ] Run all tests: `pytest -q tests/`
- [ ] Or run directly: `python tests/test_env_smoke.py`
- [ ] Verify all 8 tests pass:
  - [ ] test_env_creation
  - [ ] test_env_reset
  - [ ] test_env_step
  - [ ] test_env_episode
  - [ ] test_action_space_bounds
  - [ ] test_observation_normalization
  - [ ] test_deterministic_reset
  - [ ] test_reward_components

### Environment Verification
- [ ] Create environment instance
- [ ] Reset environment successfully
- [ ] Step through 10 time steps
- [ ] Verify observation shape: (296,)
- [ ] Verify action shape: (32,)
- [ ] Check reward components present

## Training Checklist

### Pre-Training
- [ ] All tests pass
- [ ] Dependencies installed
- [ ] Ray can initialize: `ray.init()`
- [ ] Checkpoints directory exists or will be created
- [ ] Sufficient disk space for checkpoints (~1GB per 100 iters)

### Initial Training Run
- [ ] Start training: `python train/train_rllib.py --cpus 4 --iterations 10`
- [ ] Monitor output for errors
- [ ] Verify episode rewards are logged
- [ ] Check checkpoint creation
- [ ] Confirm no CUDA errors (if using GPU)

### Full Training
- [ ] Adjust CPU count: `--cpus 8` (or available cores - 1)
- [ ] Set iterations: `--iterations 1000`
- [ ] Set checkpoint frequency: `--checkpoint-freq 10`
- [ ] Monitor training progress
- [ ] Track metrics:
  - [ ] Episode reward increasing
  - [ ] Episode length increasing
  - [ ] No LoS events (eventually)

## BlueSky Integration Checklist

### BlueSky Setup
- [ ] Clone BlueSky repository
- [ ] Install BlueSky dependencies
- [ ] Test BlueSky standalone
- [ ] Verify BlueSky Python API accessible

### Adapter Replacement
- [ ] Open `bluesky_adapter/adapter.py`
- [ ] Import BlueSky modules
- [ ] Replace `_load_scenario()`:
  - [ ] Call `bluesky.load_scenario(scenario)`
  - [ ] Initialize BlueSky state
- [ ] Replace `step()`:
  - [ ] Apply commands via BlueSky API
  - [ ] Call `bluesky.sim.step(dt)`
  - [ ] Handle edge cases
- [ ] Replace `_snapshot()`:
  - [ ] Query `bluesky.traf.id`
  - [ ] Query `bluesky.traf.lat`, `lon`, `hdg`, `alt`, `gs`
  - [ ] Convert coordinates to local ENU
  - [ ] Format as state dicts
- [ ] Remove stub methods

### Integration Testing
- [ ] Run smoke tests with BlueSky
- [ ] Verify aircraft spawn correctly
- [ ] Verify commands applied
- [ ] Check position updates
- [ ] Test separation detection
- [ ] Validate reward computation

## Scenario Checklist

### Simple Scenario (4 Aircraft)
- [ ] Create `scenarios/straight_4.scn`
- [ ] 4 aircraft on parallel tracks
- [ ] No conflicts expected
- [ ] All aircraft exit successfully
- [ ] Test loads in BlueSky
- [ ] Test loads in environment

### Medium Scenario (8 Aircraft)
- [ ] Create `scenarios/cross_8.scn`
- [ ] 8 aircraft with crossing paths
- [ ] 2-3 potential conflicts
- [ ] Mix of altitudes
- [ ] Test conflict resolution

### Complex Scenario (16 Aircraft)
- [ ] Create `scenarios/complex_16.scn`
- [ ] 12-16 aircraft
- [ ] Multiple crossing points
- [ ] Altitude constraints
- [ ] Approach/departure procedures

## Curriculum Checklist

### Phase 1: Basic Training
- [ ] Train on `straight_4.scn`
- [ ] 500 iterations
- [ ] Goal: Zero LoS events
- [ ] Metric: Avg reward > -5.0
- [ ] Save checkpoint

### Phase 2: Conflict Resolution
- [ ] Load Phase 1 checkpoint
- [ ] Train on `cross_8.scn`
- [ ] 500 iterations
- [ ] Goal: Resolve all conflicts
- [ ] Metric: Avg reward > -3.0
- [ ] Save checkpoint

### Phase 3: High Density
- [ ] Load Phase 2 checkpoint
- [ ] Train on `complex_16.scn`
- [ ] 1000 iterations
- [ ] Goal: Handle max capacity
- [ ] Metric: Avg reward > -1.0
- [ ] Save final checkpoint

### Phase 4: Realistic Operations
- [ ] Add wind dynamics
- [ ] Add altitude constraints
- [ ] Add holding patterns
- [ ] Add approach procedures
- [ ] Fine-tune on mixed scenarios

## Evaluation Checklist

### Safety Metrics
- [ ] Count LoS events per episode
- [ ] Track minimum separation
- [ ] Log near misses
- [ ] Calculate LoS rate per 1000 aircraft-hours
- [ ] Compare to baseline (random policy)

### Efficiency Metrics
- [ ] Measure average path length
- [ ] Compare to optimal path
- [ ] Track fuel proxy (altitude changes, turns)
- [ ] Calculate throughput (aircraft/hour)
- [ ] Measure average delay

### Stability Metrics
- [ ] Track action variance
- [ ] Count oscillations (heading reversals)
- [ ] Measure smoothness (Δaction magnitude)
- [ ] Log control frequency
- [ ] Compare to human controller

### Generalization
- [ ] Test on unseen scenarios
- [ ] Vary aircraft count
- [ ] Add wind perturbations
- [ ] Test edge cases (1 AC, max AC)
- [ ] Evaluate cross-scenario performance

## Deployment Checklist

### Model Export
- [ ] Select best checkpoint
- [ ] Export policy weights
- [ ] Test inference speed
- [ ] Verify deterministic output (same seed)
- [ ] Document model version

### Safety Guardrails
- [ ] Implement separation enforcement
- [ ] Add altitude limit checks
- [ ] Validate command ranges
- [ ] Add emergency override
- [ ] Test fail-safe modes

### Real-Time Integration
- [ ] Measure inference latency
- [ ] Target: <100ms per step
- [ ] Optimize batch inference
- [ ] Profile bottlenecks
- [ ] Add async processing if needed

### Human-in-the-Loop
- [ ] Build monitoring interface
- [ ] Add manual override
- [ ] Log all actions for review
- [ ] Implement explanation system
- [ ] Test human takeover

## Code Quality Checklist

### Formatting
- [ ] Run `black .`
- [ ] Run `isort .`
- [ ] Verify no formatting errors

### Linting
- [ ] Run `ruff check .`
- [ ] Fix all errors
- [ ] Address warnings

### Type Checking
- [ ] Run `mypy .`
- [ ] Fix type errors
- [ ] Add missing type hints

### Testing
- [ ] All unit tests pass
- [ ] Code coverage > 80%
- [ ] No test warnings

### Documentation
- [ ] All functions have docstrings
- [ ] README is up to date
- [ ] CHANGELOG maintained
- [ ] Examples work

## Version Control Checklist

### Git Setup
- [ ] Initialize git: `git init`
- [ ] Add remote: `git remote add origin <url>`
- [ ] Create `.gitignore` (done)
- [ ] Verify sensitive files excluded

### Initial Commit
- [ ] Stage files: `git add .`
- [ ] Commit: `git commit -m "Initial implementation"`
- [ ] Push: `git push -u origin main`

### Branching Strategy
- [ ] Create `dev` branch
- [ ] Create feature branches as needed
- [ ] Use pull requests for merging
- [ ] Tag releases: `v0.1.0`, etc.

## Troubleshooting Checklist

### Import Errors
- [ ] Check virtual environment activated
- [ ] Verify packages installed: `pip list`
- [ ] Check Python version
- [ ] Reinstall requirements: `pip install -r requirements.txt`

### Ray Errors
- [ ] Stop existing Ray: `ray stop`
- [ ] Clear Ray temp files
- [ ] Reduce num_workers
- [ ] Check available memory

### Training Divergence
- [ ] Reduce learning rate
- [ ] Increase batch size
- [ ] Check reward clipping
- [ ] Verify observation normalization
- [ ] Add entropy bonus

### GPU Errors
- [ ] Verify CUDA installed
- [ ] Check PyTorch CUDA: `torch.cuda.is_available()`
- [ ] Reduce batch size
- [ ] Try CPU-only: `--gpus 0`

## Performance Optimization Checklist

### CPU Optimization
- [ ] Increase num_rollout_workers
- [ ] Tune rollout_fragment_length
- [ ] Vectorize NumPy operations
- [ ] Profile with `cProfile`

### GPU Optimization
- [ ] Enable GPU: `--gpus 1`
- [ ] Increase batch size
- [ ] Use mixed precision
- [ ] Profile with `nvidia-smi`

### Memory Optimization
- [ ] Reduce train_batch_size
- [ ] Reduce num_workers
- [ ] Clear unused variables
- [ ] Monitor with `htop` or Task Manager

### Hyperparameter Tuning
- [ ] Grid search: lr, gamma
- [ ] Tune reward weights
- [ ] Adjust clip_param
- [ ] Optimize batch sizes
- [ ] Use Ray Tune for automated search

## Production Checklist

### Pre-Deployment
- [ ] All tests pass
- [ ] Model evaluated on hold-out set
- [ ] Safety metrics acceptable
- [ ] Documentation complete
- [ ] User guide written

### Deployment
- [ ] Export model
- [ ] Set up inference server
- [ ] Configure monitoring
- [ ] Enable logging
- [ ] Test end-to-end

### Monitoring
- [ ] Track inference latency
- [ ] Log all predictions
- [ ] Monitor LoS events
- [ ] Alert on anomalies
- [ ] Review logs daily

### Maintenance
- [ ] Regular retraining schedule
- [ ] Model versioning
- [ ] A/B testing new versions
- [ ] Collect feedback
- [ ] Continuous improvement

## Success Criteria

### Minimum Viable Product
- [ ] Zero LoS events on simple scenario
- [ ] Average reward > -5.0
- [ ] Episode completion rate > 90%
- [ ] Inference time < 100ms
- [ ] Stable training (no divergence)

### Production Ready
- [ ] Zero LoS events on all scenarios
- [ ] Average reward > -1.0
- [ ] Episode completion rate > 95%
- [ ] Inference time < 50ms
- [ ] Human-competitive performance

### Advanced Features
- [ ] Natural language interface (LLM)
- [ ] Multi-sector coordination
- [ ] Weather handling
- [ ] Realistic procedures
- [ ] Explanation system

---

## Quick Reference Commands

```bash
# Setup
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python setup_check.py

# Testing
pytest -q tests/
python tests/test_env_smoke.py

# Training
python train/train_rllib.py --cpus 8 --iterations 1000

# Code Quality
black .
isort .
ruff check .
mypy .

# Git
git add .
git commit -m "message"
git push

# Ray
ray stop  # Clean up
ray start --head  # Start cluster
```

---

**Last Updated**: 2025-11-06

Check off items as you complete them. Good luck with your ATC training!
