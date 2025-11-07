# Product Overview

## Synthetic Tower: AI ATC Controller Training Environment

A reinforcement learning environment for training AI air traffic controllers using RLlib PPO and BlueSky simulator integration.

### Core Purpose
Train AI agents to manage air traffic by issuing vectoring commands (heading and altitude changes) while maintaining safety separation and operational efficiency.

### Key Capabilities
- **Single-agent control**: One controller manages all aircraft in sector
- **Continuous actions**: Smooth heading and altitude rate changes  
- **Dense rewards**: Safety penalties, progress rewards, efficiency metrics
- **Curriculum learning**: Progressive complexity increase
- **BlueSky integration**: Stub adapter ready for real BlueSky API

### Target Users
- Researchers developing AI for air traffic control
- Aviation safety organizations
- Academic institutions studying ATC automation
- Developers building ATC simulation tools

### Success Metrics
- **Safety**: Loss of separation events per episode, minimum separation distances
- **Efficiency**: Average path length, fuel consumption proxy
- **Throughput**: Aircraft handled per hour
- **Stability**: Control smoothness, oscillation reduction