# Quick Start Guide

Get the AI Controller Dashboard up and running in 5 minutes!

## Prerequisites

- Node.js 16+ installed ([Download](https://nodejs.org/))
- Python 3.11 with project dependencies installed

## Step 1: Install Dashboard Dependencies

Open a terminal in the `visualization/web/react-dashboard` directory:

```bash
cd visualization/web/react-dashboard
npm install
```

Or use the setup script (Windows):

```bash
setup.bat
```

## Step 2: Start the Demo Server

The demo server generates synthetic training data so you can test the dashboard without running actual training.

Open a terminal in the project root:

```bash
python visualization/examples/dashboard_demo_server.py
```

You should see:
```
AI Controller Dashboard Demo Server
====================================
Demo server running on ws://localhost:8080
Open the React dashboard at http://localhost:3000
```

## Step 3: Start the Dashboard

Open a **new terminal** in the `visualization/web/react-dashboard` directory:

```bash
npm start
```

Or use the start script (Windows):

```bash
start-dashboard.bat
```

The dashboard will automatically open in your browser at `http://localhost:3000`

## Step 4: Try It Out!

1. **Check Connection**: Look for the green "Connected" indicator in the top right
2. **Start Training**: Click the green "Start" button in the Training Controls section
3. **Watch the Visualization**: See aircraft moving in real-time in the Scenario Visualizer
4. **Monitor Decisions**: View AI decision-making in the Decision Tracker panel
5. **Analyze Performance**: Check performance metrics and charts at the bottom

## Features to Explore

### Training Controls
- **Start/Pause/Stop**: Control the training simulation
- **Scenario Selection**: Choose different traffic scenarios
- **Configure**: Adjust training parameters (learning rate, batch size, etc.)

### Scenario Visualizer
- **Zoom**: Use the zoom buttons or slider to zoom in/out
- **Display Options**: Toggle trails, separation zones, goals, and grid
- **Trail Length**: Adjust how long aircraft trails are displayed

### Decision Tracker
- **Filter by Aircraft**: View decisions for specific aircraft
- **Expand Decisions**: Click on any decision to see detailed information
- **Confidence Scores**: See how confident the AI is in its decisions
- **AI Reasoning**: Read explanations of why the AI made each decision

### Performance Metrics
- **Multiple Metrics**: View reward, safety, efficiency, violations, and confidence
- **Chart Types**: Switch between line, area, and bar charts
- **Time Ranges**: Adjust the time window (last 50, 100, 200, or all data points)
- **Comparison Mode**: Compare multiple metrics simultaneously

## Troubleshooting

### Dashboard Won't Connect

**Problem**: Red "Disconnected" indicator in top right

**Solutions**:
1. Make sure the demo server is running (Step 2)
2. Check that the server is on port 8080
3. Refresh the browser page

### No Data Displayed

**Problem**: Dashboard shows "Waiting for data..."

**Solutions**:
1. Click the "Start" button in Training Controls
2. Make sure the demo server is running
3. Check the browser console for errors (F12)

### Installation Errors

**Problem**: `npm install` fails

**Solutions**:
1. Make sure Node.js 16+ is installed: `node --version`
2. Clear npm cache: `npm cache clean --force`
3. Delete `node_modules` folder and try again

### Port Already in Use

**Problem**: Error about port 3000 or 8080 already in use

**Solutions**:
1. Stop any other applications using these ports
2. Or change the port in the configuration:
   - Dashboard: Set `PORT=3001` environment variable
   - Server: Modify port in `dashboard_demo_server.py`

## Next Steps

### Use with Real Training

To connect the dashboard to actual training instead of the demo:

1. See `visualization/DASHBOARD_INTEGRATION.md` for integration guide
2. Modify your training script to publish events
3. Start the WebSocket server with your training pipeline

### Customize the Dashboard

- Modify components in `src/components/`
- Add new metrics in `src/types/index.ts`
- Customize styling in component files

### Deploy to Production

```bash
npm run build
```

The optimized build will be in the `build/` directory. Serve it with any static file server.

## Getting Help

- Check the main README: `visualization/web/react-dashboard/README.md`
- Review integration guide: `visualization/DASHBOARD_INTEGRATION.md`
- Check visualization docs: `visualization/README.md`

## Demo Server Commands

While the demo server is running, you can:

- **Start Training**: Click "Start" in the dashboard
- **Pause Training**: Click "Pause" in the dashboard
- **Stop Training**: Click "Stop" in the dashboard
- **Change Scenario**: Select a different scenario from the dropdown

The demo server will:
- Generate 4-6 aircraft with random positions
- Simulate aircraft movement and conflicts
- Send realistic decision and performance data
- Update at 10 FPS for smooth visualization

Enjoy exploring the AI Controller Dashboard! 🛩️