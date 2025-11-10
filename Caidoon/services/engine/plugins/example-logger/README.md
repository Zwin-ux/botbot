# Example Logger Plugin

A simple plugin that demonstrates how to build plugins for the AI Encounters engine.

## Features

- Listens to all session lifecycle events
- Logs events to console and optionally to file
- Demonstrates proper plugin structure and lifecycle

## Configuration

Edit `plugin.json` to configure the plugin:

```json
{
  "config": {
    "logLevel": "info",
    "logToFile": true
  }
}
```

## Events Logged

- `session:before-create` - Before session creation
- `session:created` - After session creation
- `session:loaded` - When session is loaded
- `session:before-objective-update` - Before objective update
- `session:objective-updated` - After objective update
- `session:before-complete` - Before session completion
- `session:completed` - After session completion
- `session:before-encounter-generate` - Before encounter generation
- `session:encounter-generated` - After encounter generation

## Log Output

When `logToFile` is enabled, logs are written to:
```
data/plugins/example-logger/events.log
```

Each line is a JSON object with:
```json
{
  "timestamp": "2025-11-07T21:00:00.000Z",
  "event": "Session created",
  "data": {
    "sessionId": "abc123",
    "playerId": "player1",
    "durationMs": 1234
  }
}
```

## Building

Compile the TypeScript source:
```bash
cd services/engine/plugins/example-logger
npx tsc index.ts --target ES2022 --module ES2022 --moduleResolution node --declaration --skipLibCheck --esModuleInterop
```

## Plugin Structure

```
example-logger/
├── plugin.json       # Plugin manifest
├── index.ts          # Source code
├── index.js          # Compiled JavaScript
├── index.d.ts        # Type definitions
└── README.md         # This file
```
