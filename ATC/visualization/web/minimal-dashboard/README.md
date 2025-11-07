# Minimal ATC Training Dashboard

A clean, functional React frontend for the AI Air Traffic Controller training system.

## Philosophy

**Truth over aesthetics.** This dashboard exists to visualize real backend data, not to look "AI-generated."

- No Material-UI, no Framer Motion, no chart libraries
- Direct WebSocket connection with zero magic
- Raw data display for debugging
- System font stack, minimal CSS
- Every element has a purpose

## Stack

- React 18 + TypeScript
- Vite (fast, minimal)
- Raw CSS (no Tailwind, no styled-components)
- Native WebSocket API

## Structure

```
src/
├── api/
│   └── websocket.ts       # Direct WebSocket client
├── hooks/
│   └── useWebSocket.ts    # React hooks for WS
├── pages/
│   ├── Dashboard.tsx      # Main metrics view
│   ├── Logs.tsx          # Raw event stream
│   └── About.tsx         # System info
├── App.tsx               # Router + nav
├── main.tsx             # Entry point
└── index.css            # Minimal styles
```

## Quick Start

### 1. Start Python Backend

```bash
# From project root
python launch_simple_demo.py
```

This starts the WebSocket server on `ws://localhost:8080`

### 2. Start Dashboard

```bash
cd visualization/web/minimal-dashboard
npm install
npm run dev
```

Open `http://localhost:3000`

## Features

### Dashboard Page
- Training status (episode, step, rewards)
- Recent AI decisions with confidence scores
- Performance metrics with simple reward chart
- Safety violations table

### Event Stream Page
- Raw WebSocket message log
- Filter by type or content
- Pause/resume logging
- JSON pretty-print

### About Page
- System architecture
- Message type reference
- Quick start guide

## Message Types

The dashboard listens for these WebSocket messages:

- `training_status` - Overall training progress
- `decision_update` - AI policy decisions
- `performance_update` - Episode metrics
- `safety_violation` - Safety events
- `scenario_update` - Aircraft positions

## Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## No Dependencies

This dashboard intentionally avoids:
- ❌ Material-UI / Ant Design / Chakra
- ❌ Chart.js / Recharts / Victory
- ❌ Framer Motion / React Spring
- ❌ Redux / Zustand / Jotai
- ❌ React Router (simple state-based routing)
- ❌ Axios (native fetch/WebSocket)
- ❌ Lodash / Ramda
- ❌ Moment.js / date-fns

Just React, TypeScript, and native browser APIs.

## Design Principles

1. **Functional First** - If it doesn't show real data, it doesn't exist
2. **No Filler** - No stock gradients, no Lottie animations, no hero sections
3. **Developer Console** - Think engineering tool, not marketing site
4. **Testable** - Easy to verify data flow and correctness
5. **Maintainable** - Simple code, clear structure, no magic

## Connection Status

The dashboard shows connection status in the nav bar:
- 🟢 Connected - Receiving data
- 🟡 Connecting - Attempting connection
- 🔴 Disconnected - No connection
- 🔴 Error - Connection failed

Auto-reconnects up to 5 times with exponential backoff.

## Browser Support

Modern browsers only (ES2020+):
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

No IE11, no polyfills.
