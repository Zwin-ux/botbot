# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         RLlib Training                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  PPO Algorithm                                            │  │
│  │  - Policy Network (Actor)                                 │  │
│  │  - Value Network (Critic)                                 │  │
│  │  - Advantage Estimation (GAE)                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ▲                                  │
│                              │ (obs, reward, done)             │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Rollout Workers (Parallel)                               │  │
│  │  - Collect experience                                     │  │
│  │  - Execute actions in environment                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ action (Δhdg, Δalt)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Gymnasium Environment                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SyntheticTowerEnv                                        │  │
│  │                                                           │  │
│  │  Observation Encoding:                                    │  │
│  │  - Per-aircraft features (16 × 18)                        │  │
│  │  - Global features (8)                                    │  │
│  │  - Normalization to [-1, 1]                               │  │
│  │                                                           │  │
│  │  Action Decoding:                                         │  │
│  │  - Reshape to (16, 2)                                     │  │
│  │  - Build command list for alive aircraft                 │  │
│  │                                                           │  │
│  │  Reward Computation:                                      │  │
│  │  - Safety penalties (LoS, near miss)                      │  │
│  │  - Progress rewards                                       │  │
│  │  - Terminal bonuses                                       │  │
│  │  - Clipping to [-20, +5]                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ commands [{id, Δhdg, Δvs}, ...]
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BlueSky Adapter                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  BlueSkySim                                               │  │
│  │                                                           │  │
│  │  reset() → states                                         │  │
│  │  - Load scenario                                          │  │
│  │  - Spawn traffic                                          │  │
│  │  - Return initial states                                  │  │
│  │                                                           │  │
│  │  step(commands) → states                                  │  │
│  │  - Apply commands to aircraft                            │  │
│  │  - Advance simulation Δt                                  │  │
│  │  - Return updated states                                  │  │
│  │                                                           │  │
│  │  [STUB: Replace with BlueSky API]                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Observation Pipeline

```
BlueSky State → Adapter → Environment → RLlib
    {raw}       {dict}    {normalized}  {tensor}

Aircraft State Dict:
{
  id: "AC001",
  x_nm: 45.2,
  y_nm: -12.8,
  v_kt: 250.0,
  hdg_rad: 1.57,
  alt_ft: 12000.0,
  goal_x_nm: -40.0,
  goal_y_nm: 15.0,
  alive: true
}
                ↓
Normalized Observation Vector:
[x/100, y/100, v/600, sin(hdg), cos(hdg), (alt-15k)/15k, ...]
                ↓
Flattened Tensor:
shape=(296,), dtype=float32, range=[-1, 1]
```

### Action Pipeline

```
RLlib → Environment → Adapter → BlueSky
{tensor}  {commands}   {API}      {sim}

Policy Output:
shape=(32,), dtype=float32
                ↓
Reshape:
shape=(16, 2)  # [Δhdg, Δalt_rate] per aircraft
                ↓
Command List:
[
  {id: "AC001", delta_hdg: 0.05, delta_vs: 500.0},
  {id: "AC002", delta_hdg: -0.02, delta_vs: -200.0},
  ...
]
                ↓
BlueSky API:
bluesky.traf.ap.selhdg("AC001", new_hdg)
bluesky.traf.ap.selvs("AC001", new_vs)
```

## Component Interactions

### Training Loop

```
1. Initialize:
   RLlib creates N workers
   Each worker creates SyntheticTowerEnv
   Each env creates BlueSkySim

2. Episode Start:
   Worker: obs, info = env.reset()
   Env: states = sim.reset()
   Sim: Load scenario, spawn aircraft

3. Rollout (collect experience):
   Loop for T steps:
     Worker: action = policy(obs)
     Env: obs, r, done, trunc, info = step(action)
       ├─ Decode actions
       ├─ Call sim.step(commands)
       ├─ Compute reward
       ├─ Check termination
       └─ Encode observation
     Sim: Apply commands, advance physics
     Worker: Store (obs, action, reward, done)

4. Training Update:
   RLlib: Aggregate experience from workers
   RLlib: Compute advantages (GAE)
   RLlib: Update policy via PPO
   RLlib: Update value function

5. Checkpoint:
   Save policy weights every K iterations

6. Repeat:
   Go to step 2
```

## Class Hierarchy

```
gym.Env
  │
  └─ SyntheticTowerEnv
       │
       ├─ observation_space: Box(296,)
       ├─ action_space: Box(32,)
       │
       ├─ reset() → (obs, info)
       ├─ step(action) → (obs, reward, term, trunc, info)
       │
       └─ sim: BlueSkySim
            │
            ├─ reset() → List[Dict]
            └─ step(commands) → List[Dict]

TorchModelV2
  │
  └─ AttentionATCModel (optional)
       │
       ├─ ac_embed: Linear(18, 128)
       ├─ attention: MultiheadAttention(128, 4)
       ├─ policy_head: Linear(128, 32)
       └─ value_head: Linear(128, 1)
```

## Module Dependencies

```
train_rllib.py
  │
  ├─ import ray
  ├─ import ray.rllib
  └─ import st_env
       │
       ├─ import gymnasium
       ├─ import numpy
       │
       ├─ from .reward import compute_reward
       ├─ from .utils import pairwise_min_separation_nm
       │
       └─ import bluesky_adapter
            │
            └─ import numpy
```

## State Machines

### Episode State

```
    ┌──────┐
    │ INIT │
    └──┬───┘
       │ reset()
       ▼
    ┌────────┐
    │ ACTIVE │ ◄──────┐
    └───┬────┘        │
        │             │
        │ step()      │
        │ if not done │
        └─────────────┘
        │
        │ done=True
        ▼
    ┌──────────┐
    │ TERMINAL │
    └──────────┘
       │
       │ reset()
       ▼
    ┌────────┐
    │ ACTIVE │
    └────────┘
```

### Aircraft State

```
    ┌────────┐
    │ SPAWNED│
    └───┬────┘
        │
        │ alive=True
        ▼
    ┌────────┐     command
    │ENROUTE │ ◄──────────┐
    └───┬────┘            │
        │                 │
        │ near goal       │
        │ or OOB          │
        ▼                 │
    ┌────────┐            │
    │ EXITED │            │
    └────────┘            │
     alive=False          │
                          │
    Control loop ─────────┘
```

## Reward Components

```
Total Reward = clip(Safety + Progress + Terminal + Smooth + Fuel, -20, +5)

Safety:
  LoS Penalty:    -10.0 × count  (d < 5 NM && Δalt < 1000 ft)
  Near Penalty:   -2.0           (d < 6 NM && Δalt < 1200 ft)
  Catastrophe:    -10.0          (count >= 2)

Progress:
  Per Aircraft:   +0.05 × ΔR_nm  (closer to goal)

Terminal:
  Exit Bonus:     +5.0 × count   (reached goal)

Smooth:
  Action Penalty: -α × |Δaction| (future)

Fuel:
  Efficiency:     -β × (extra path + alt dev) (future)
```

## Configuration Hierarchy

```
configs/ppo_baseline.yaml
  │
  ├─ environment:
  │    ├─ scenario
  │    ├─ step_seconds
  │    └─ horizon
  │
  ├─ training:
  │    ├─ gamma
  │    ├─ lr
  │    ├─ batch_size
  │    └─ ...
  │
  └─ resources:
       ├─ num_gpus
       └─ num_cpus_per_worker

     Overridden by ↓

train_rllib.py --cpus --gpus --iterations ...
```

## File Organization

```
Project Root
│
├─ Core Modules (src)
│  ├─ bluesky_adapter/    Simulator interface
│  ├─ st_env/             RL environment
│  └─ train/              Training scripts
│
├─ Configuration
│  ├─ configs/            Hyperparameters
│  ├─ scenarios/          BlueSky scenes
│  └─ pyproject.toml      Project setup
│
├─ Development
│  ├─ tests/              Unit tests
│  ├─ setup_check.py      Dependency check
│  └─ .gitignore          Version control
│
└─ Documentation
   ├─ README.md           Full guide
   ├─ QUICKSTART.md       Quick setup
   ├─ ARCHITECTURE.md     This file
   └─ IMPLEMENTATION_SUMMARY.md  Details
```

## Execution Flow

### Testing

```bash
pytest -q tests/
    │
    └─ Import st_env
         │
         └─ Create SyntheticTowerEnv
              │
              └─ Create BlueSkySim (stub)
                   │
                   └─ Run 8 test cases
                        └─ Assert correctness
```

### Training

```bash
python train/train_rllib.py --cpus 8
    │
    ├─ ray.init()
    │    └─ Start Ray cluster
    │
    ├─ register_env("SyntheticTowerEnv", make_env)
    │
    ├─ PPOConfig().build()
    │    ├─ Create 7 rollout workers
    │    └─ Initialize policy network
    │
    └─ algo.train() × 1000
         │
         ├─ Workers collect experience (parallel)
         │    └─ Each worker runs episodes
         │
         ├─ Aggregate samples (32K)
         │
         ├─ Compute advantages (GAE)
         │
         ├─ Update policy (8 SGD epochs)
         │
         ├─ Log metrics
         │
         └─ Save checkpoint (every 10 iters)
```

## Key Interfaces

### Adapter Interface

```python
class BlueSkySim:
    def __init__(scenario, step_seconds, max_ac, seed)
    def reset() -> List[Dict]
    def step(commands: List[Dict]) -> List[Dict]
```

### Environment Interface

```python
class SyntheticTowerEnv(gym.Env):
    def __init__(scenario, step_seconds, seed, horizon)
    def reset(seed, options) -> (obs, info)
    def step(action) -> (obs, reward, term, trunc, info)
```

### Training Interface

```python
def make_env(config: Dict) -> SyntheticTowerEnv
def main():
    algo = PPOConfig().build()
    for i in range(N):
        result = algo.train()
        checkpoint = algo.save()
```

## Scalability

### Horizontal Scaling (CPUs)

```
1 Driver Process
  │
  ├─ Worker 1 ──► SyntheticTowerEnv ──► BlueSkySim
  ├─ Worker 2 ──► SyntheticTowerEnv ──► BlueSkySim
  ├─ Worker 3 ──► SyntheticTowerEnv ──► BlueSkySim
  └─ Worker N ──► SyntheticTowerEnv ──► BlueSkySim

Experience aggregation ──► Policy update (GPU)
```

### Vertical Scaling (GPU)

```
CPU: Rollouts (parallel environments)
  │
  │ Transfer batch
  ▼
GPU: Policy/Value network forward pass
  │
  │ Compute gradients
  ▼
GPU: Policy/Value network backward pass
  │
  │ Update parameters
  ▼
CPU: Next rollout with updated policy
```

## Extension Points

### 1. Add Speed Control

```python
# st_env/env.py
self.action_space = spaces.Box(
    low=np.tile([-0.2, -1.0, -0.1], MAX_AC),  # ← Add speed
    high=np.tile([+0.2, +1.0, +0.1], MAX_AC),
)

# bluesky_adapter/adapter.py
def step(self, commands):
    for cmd in commands:
        if "delta_spd" in cmd:
            ac["v_kt"] += cmd["delta_spd"]
```

### 2. Enable Attention Model

```python
# train/train_rllib.py
from train.models import AttentionATCModel
from ray.rllib.models import ModelCatalog

ModelCatalog.register_custom_model("atc_attention", AttentionATCModel)

config = (
    PPOConfig()
    .environment(...)
    .training(
        model={"custom_model": "atc_attention"}
    )
)
```

### 3. Add New Reward Component

```python
# st_env/reward.py
def compute_reward(...):
    comps["fuel"] = -0.01 * sum(alt_changes + speed_changes)
    comps["comms"] = -0.1 * queue_length  # LLM latency
```

### 4. Curriculum Learning

```python
# train/train_rllib.py
def make_env(config):
    iteration = config.get("iteration", 0)
    if iteration < 100:
        scenario = "scenarios/simple_4.scn"
    elif iteration < 500:
        scenario = "scenarios/complex_8.scn"
    else:
        scenario = "scenarios/realistic_16.scn"
    return SyntheticTowerEnv(scenario, ...)
```

## Performance Bottlenecks

Potential bottlenecks and solutions:

| Bottleneck | Solution |
|------------|----------|
| BlueSky simulation speed | Batch sim calls, use headless mode |
| Observation encoding | Vectorize with NumPy |
| Reward computation | Precompute separation matrix |
| Network forward pass | Use GPU, batch inference |
| Data transfer (CPU↔GPU) | Pin memory, async transfers |
| Rollout collection | More workers, longer fragments |

## Testing Strategy

```
Unit Tests (tests/)
  ├─ Env creation
  ├─ Reset/step
  ├─ Action bounds
  ├─ Observation shape
  └─ Reward components

Integration Tests (future)
  ├─ BlueSky adapter
  ├─ Full episodes
  └─ Scenario loading

Training Tests (future)
  ├─ Convergence
  ├─ Checkpointing
  └─ Distributed rollouts

Evaluation (future)
  ├─ Safety metrics
  ├─ Efficiency
  └─ Generalization
```

## Deployment Architecture (Future)

```
┌─────────────┐
│   Pilot     │
└──────┬──────┘
       │ Voice/Text
       ▼
┌─────────────┐     ┌─────────────┐
│     LLM     │────►│ Environment │
│ (Commands)  │     │   State     │
└─────────────┘     └──────┬──────┘
       │                   │
       │ Vectoring         │ Observation
       ▼                   ▼
┌─────────────────────────────┐
│     Trained Policy (PPO)    │
└──────────────┬──────────────┘
               │ Actions
               ▼
┌─────────────────────────────┐
│     Safety Guardrails       │
└──────────────┬──────────────┘
               │ Validated
               ▼
┌─────────────────────────────┐
│      BlueSky Simulator      │
└─────────────────────────────┘
```

This architecture provides a complete, scalable, and extensible foundation for AI ATC training.
