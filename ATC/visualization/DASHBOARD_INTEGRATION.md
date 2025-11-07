# React Dashboard Integration Guide

This guide explains how to integrate the React-based dashboard with the AI Controller Training Environment.

## Overview

The React dashboard provides a modern, interactive interface for:
- Real-time visualization of air traffic scenarios
- Training control and configuration
- AI decision tracking and explanation
- Performance metrics and analysis

## Architecture

```
┌─────────────────────┐
│  React Dashboard    │
│  (Port 3000)        │
└──────────┬──────────┘
           │ WebSocket
           │
┌──────────▼──────────┐
│  WebSocket Server   │
│  (Port 8080)        │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Event Bus          │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Training Pipeline  │
│  (RLlib + Env)      │
└─────────────────────┘
```

## Setup Instructions

### 1. Install Dashboard Dependencies

```bash
cd visualization/web/react-dashboard
npm install
```

Or use the provided setup script:

```bash
cd visualization/web/react-dashboard
setup.bat
```

### 2. Start the WebSocket Server

The WebSocket server needs to be running to relay data between the training system and the dashboard.

```python
import asyncio
from visualization.server.websocket_server import WebSocketServer
from visualization.events.event_bus import EventBus

async def main():
    # Create event bus and WebSocket server
    event_bus = EventBus()
    ws_server = WebSocketServer(host="localhost", port=8080)
    
    # Start the server
    await ws_server.start()
    
    # Keep server running
    try:
        await asyncio.Future()  # Run forever
    except KeyboardInterrupt:
        await ws_server.stop()

if __name__ == "__main__":
    asyncio.run(main())
```

### 3. Start the React Dashboard

```bash
cd visualization/web/react-dashboard
npm start
```

Or use the provided start script:

```bash
cd visualization/web/react-dashboard
start-dashboard.bat
```

The dashboard will be available at `http://localhost:3000`

### 4. Integrate with Training Pipeline

Modify your training script to publish events to the event bus:

```python
from visualization.events.event_bus import EventBus
from visualization.integration.env_wrapper import EventPublishingEnvWrapper
from visualization.integration.training_callbacks import VisualizationCallbacks

# Create event bus
event_bus = EventBus()

# Wrap your environment
env = EventPublishingEnvWrapper(
    base_env=your_env,
    event_bus=event_bus
)

# Add visualization callbacks to RLlib
callbacks = VisualizationCallbacks(event_bus=event_bus)

# Configure RLlib with callbacks
config = {
    "env": lambda config: env,
    "callbacks": callbacks,
    # ... other config
}
```

## WebSocket Message Protocol

### Messages Sent by Dashboard

#### Training Commands
```json
{
  "type": "training_command",
  "data": {
    "command": "start|pause|stop|save_checkpoint",
    "params": {
      "scenario": "basic-separation",
      "config": { ... }
    }
  },
  "timestamp": 1234567890
}
```

#### Scenario Commands
```json
{
  "type": "scenario_command",
  "data": {
    "command": "load_scenario",
    "params": {
      "scenarioId": "complex-traffic"
    }
  },
  "timestamp": 1234567890
}
```

#### Data Requests
```json
{
  "type": "data_request",
  "data": {
    "dataType": "training_status|scenario_state|performance_history",
    "params": { ... }
  },
  "timestamp": 1234567890
}
```

### Messages Sent to Dashboard

#### Training Status
```json
{
  "type": "training_status",
  "data": {
    "status": "running|paused|idle|completed|error",
    "currentEpisode": 150,
    "totalEpisodes": 1000,
    "currentStep": 250,
    "totalSteps": 500,
    "elapsedTime": 3600,
    "estimatedTimeRemaining": 18000,
    "learningRate": 0.0003,
    "epsilon": 0.1,
    "lastReward": 15.5,
    "averageReward": 12.3,
    "bestReward": 18.7
  },
  "timestamp": 1234567890
}
```

#### Scenario Update
```json
{
  "type": "scenario_update",
  "data": {
    "timestamp": 1234567890,
    "aircraft": [
      {
        "id": "AC001",
        "position": [10.5, 20.3],
        "velocity": 250,
        "heading": 1.57,
        "altitude": 10000,
        "goalPosition": [30.0, 40.0],
        "alive": true,
        "intent": "departure",
        "trailHistory": [[10.4, 20.2], [10.3, 20.1]]
      }
    ],
    "conflicts": [
      {
        "aircraftIds": ["AC001", "AC002"],
        "distance": 4.5,
        "severity": "medium",
        "timeToClosestApproach": 120
      }
    ],
    "sectorBounds": {
      "minX": 0,
      "maxX": 50,
      "minY": 0,
      "maxY": 50
    },
    "episode": 150,
    "step": 250
  },
  "timestamp": 1234567890
}
```

#### Decision Update
```json
{
  "type": "decision_update",
  "data": {
    "timestamp": 1234567890,
    "aircraftId": "AC001",
    "observation": [0.5, 0.3, ...],
    "action": [0.1, -0.2],
    "policyLogits": [1.2, 0.8, ...],
    "valueEstimate": 15.5,
    "confidenceScores": {
      "action_quality": 0.85,
      "safety": 0.92,
      "efficiency": 0.78
    },
    "explanation": "Vectoring aircraft left to maintain separation from AC002",
    "predictedOutcomes": {
      "separation_maintained": 0.95,
      "goal_reached": 0.88
    }
  },
  "timestamp": 1234567890
}
```

#### Performance Update
```json
{
  "type": "performance_update",
  "data": {
    "timestamp": 1234567890,
    "episode": 150,
    "step": 250,
    "reward": 15.5,
    "cumulativeReward": 3875.2,
    "safetyScore": 95.5,
    "efficiencyScore": 87.3,
    "violationCount": 2,
    "averageConfidence": 0.85
  },
  "timestamp": 1234567890
}
```

## Example Integration

Here's a complete example of integrating the dashboard with your training:

```python
import asyncio
from visualization.server.websocket_server import WebSocketServer
from visualization.events.event_bus import EventBus
from visualization.integration.env_wrapper import EventPublishingEnvWrapper
from visualization.integration.training_callbacks import VisualizationCallbacks

async def run_training_with_dashboard():
    # Initialize event bus and WebSocket server
    event_bus = EventBus()
    ws_server = WebSocketServer(host="localhost", port=8080)
    
    # Start WebSocket server
    await ws_server.start()
    
    # Subscribe to training commands from dashboard
    def handle_training_command(message, client_id):
        command = message.data.get('command')
        if command == 'start':
            # Start training
            pass
        elif command == 'pause':
            # Pause training
            pass
        elif command == 'stop':
            # Stop training
            pass
    
    ws_server.message_router.register_handler(
        'training_command',
        handle_training_command
    )
    
    # Create environment with event publishing
    env = EventPublishingEnvWrapper(
        base_env=your_env,
        event_bus=event_bus
    )
    
    # Subscribe event bus to WebSocket broadcasts
    def broadcast_event(event_type, data):
        asyncio.create_task(
            ws_server.broadcast(
                Message(type=event_type, data=data),
                event_type=event_type
            )
        )
    
    event_bus.subscribe('scenario.update', 
                       lambda data: broadcast_event('scenario_update', data))
    event_bus.subscribe('decision.made', 
                       lambda data: broadcast_event('decision_update', data))
    event_bus.subscribe('performance.update', 
                       lambda data: broadcast_event('performance_update', data))
    
    # Run training
    # ... your training code here ...
    
    # Cleanup
    await ws_server.stop()

if __name__ == "__main__":
    asyncio.run(run_training_with_dashboard())
```

## Customization

### Changing WebSocket Port

In `src/App.tsx`, modify the connection URL:

```typescript
wsService.connect('ws://localhost:YOUR_PORT');
```

### Adding Custom Metrics

1. Add new metric type to `src/types/index.ts`
2. Update `PerformanceMetrics.tsx` to display the new metric
3. Send the metric data from your training backend

### Customizing Visualization

Modify `ScenarioVisualizer.tsx` to change:
- Aircraft rendering style
- Separation zone colors
- Grid spacing
- Canvas dimensions

## Troubleshooting

### Dashboard Not Connecting

1. Verify WebSocket server is running on port 8080
2. Check browser console for connection errors
3. Ensure no firewall is blocking the connection

### No Data Displayed

1. Verify training pipeline is publishing events
2. Check WebSocket server logs for incoming messages
3. Verify message format matches expected schema

### Performance Issues

1. Reduce visualization update frequency
2. Limit trail history length
3. Disable unnecessary visual features (grid, separation zones)
4. Use production build (`npm run build`)

## Production Deployment

### Build for Production

```bash
cd visualization/web/react-dashboard
npm run build
```

### Serve Production Build

Use a static file server or integrate with your backend:

```python
from aiohttp import web

app = web.Application()
app.router.add_static('/', 'visualization/web/react-dashboard/build')
web.run_app(app, port=3000)
```

## Support

For issues or questions, refer to:
- Dashboard README: `visualization/web/react-dashboard/README.md`
- Visualization README: `visualization/README.md`
- Main project documentation