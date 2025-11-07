# AI Controller Training Dashboard

Modern React-based dashboard for visualizing and controlling the AI ATC Controller Training Environment.

## Features

- **Real-time Scenario Visualization**: Canvas-based rendering of aircraft positions, trajectories, and conflicts
- **Training Controls**: Start, pause, stop training with configurable parameters
- **Decision Tracking**: Monitor AI decision-making process with confidence scores and explanations
- **Performance Metrics**: Interactive charts showing training progress and performance trends
- **WebSocket Integration**: Real-time data streaming from training backend

## Technology Stack

- **React 18** with TypeScript
- **Material-UI (MUI)** for UI components
- **Recharts** for data visualization
- **Framer Motion** for animations
- **WebSocket** for real-time communication

## Installation

```bash
cd visualization/web/react-dashboard
npm install
```

## Development

Start the development server:

```bash
npm start
```

The dashboard will be available at `http://localhost:3000`

## Build for Production

```bash
npm run build
```

The optimized production build will be in the `build/` directory.

## Configuration

The dashboard connects to the WebSocket server at `ws://localhost:8080` by default. This can be configured in `src/App.tsx`.

## Project Structure

```
src/
├── components/          # React components
│   ├── ConnectionStatus.tsx
│   ├── TrainingControls.tsx
│   ├── ScenarioVisualizer.tsx
│   ├── DecisionTracker.tsx
│   └── PerformanceMetrics.tsx
├── services/           # Service layer
│   └── WebSocketService.ts
├── types/             # TypeScript type definitions
│   └── index.ts
├── App.tsx            # Main application component
└── index.tsx          # Application entry point
```

## WebSocket Message Format

The dashboard expects WebSocket messages in the following format:

```typescript
{
  type: string;           // Message type (e.g., 'training_status', 'scenario_update')
  data: any;             // Message payload
  timestamp: number;     // Unix timestamp
  clientId?: string;     // Optional client identifier
}
```

### Supported Message Types

- `training_status`: Training state and progress information
- `scenario_update`: Aircraft positions and scenario state
- `decision_update`: AI decision data with explanations
- `performance_update`: Performance metrics and statistics

## Components

### ScenarioVisualizer

Real-time canvas-based visualization of air traffic scenarios with:
- Aircraft position and heading indicators
- Separation zones and conflict highlighting
- Aircraft trails and goal positions
- Interactive zoom and pan controls
- Customizable display options

### TrainingControls

Training control interface with:
- Start/pause/stop training buttons
- Scenario selection dropdown
- Training configuration dialog
- Progress indicators and status display

### DecisionTracker

AI decision monitoring with:
- Decision history (last 100 decisions)
- Confidence score breakdown
- AI reasoning explanations
- Predicted outcomes
- Trend analysis

### PerformanceMetrics

Performance visualization with:
- Multiple chart types (line, area, bar)
- Metric comparison mode
- Configurable time ranges
- Statistical summaries
- Trend indicators

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

Part of the Synthetic Tower AI ATC Controller Training Environment project.