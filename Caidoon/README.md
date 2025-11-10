# AI Encounters Engine

A modular, Dockerized system that powers mission-style "encounters" for games and applications using OpenAI as the LLM backend. The system uses a pnpm monorepo architecture with JSON-based local file storage (no database dependencies).

## Features

- 🎮 Dynamic AI-powered encounter generation using OpenAI
- 🏗️ Modular monorepo architecture with shared packages
- 🐳 Fully Dockerized for easy deployment
- 🔌 Platform adapters for Web (Next.js) and GMod
- 💾 Local file-based storage (no external database required)
- 🔒 HMAC-based inter-service authentication

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose
- OpenAI API key

### Setup

1. **Clone the repository and install dependencies:**

```bash
pnpm i
```

2. **Configure environment variables:**

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
# AE_LLM_API_KEY=your-openai-api-key-here
```

3. **Build all packages:**

```bash
pnpm -r build
```

4. **Start all services with Docker:**

```bash
docker-compose up --build
```

The services will be available at:
- **Web Adapter**: http://localhost:3000
- **Encounters Engine**: http://localhost:8786
- **LLM Proxy**: http://localhost:8787
- **GMod Sidecar**: http://localhost:8788

## Architecture

This is a pnpm monorepo with the following structure:

```
actuary/
├── packages/
│   ├── core/              # Shared TypeScript types and interfaces
│   ├── validators/        # Validation logic for API requests
│   ├── sdk/              # Client libraries for consuming the API
│   └── llm-proxy/        # LLM proxy service (OpenAI integration)
├── services/
│   └── engine/           # Core encounters engine service
├── adapters/
│   ├── web-next/         # Next.js web adapter
│   └── gmod-sidecar/     # Garry's Mod integration adapter
└── docker/               # Dockerfiles for all services
```

### Service Overview

- **LLM Proxy** (`packages/llm-proxy`): Interfaces with OpenAI's API to generate encounter content
- **Encounters Engine** (`services/engine`): Core service managing sessions and state
- **Web Adapter** (`adapters/web-next`): Next.js-based web interface
- **GMod Sidecar** (`adapters/gmod-sidecar`): Bridge for Garry's Mod integration

## Environment Variables

### Required Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AE_LLM_API_KEY` | Your OpenAI API key | - | ✅ Yes |
| `AE_HMAC_SECRET` | Shared secret for inter-service authentication | - | ✅ Yes |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AE_LLM_MODEL` | OpenAI model to use | `gpt-4o-mini` |
| `AE_LLM_TEMPERATURE` | Temperature for AI responses (0.0-2.0) | `0.2` |
| `AE_LLM_MAX_OUTPUT_TOKENS` | Maximum tokens in AI response | `800` |
| `LLM_PROXY_PORT` | Port for LLM Proxy service | `8787` |
| `ENGINE_PORT` | Port for Encounters Engine | `8786` |
| `WEB_PORT` | Port for Web Adapter | `3000` |
| `GMOD_SIDECAR_PORT` | Port for GMod Sidecar | `8788` |

### Configuration Details

**AE_LLM_API_KEY**: Obtain from [OpenAI Platform](https://platform.openai.com/api-keys). Required for the LLM Proxy to generate encounters.

**AE_HMAC_SECRET**: A secure random string used to authenticate requests between services. Generate using:
```bash
# Linux/Mac
openssl rand -hex 32

# Or use any secure random string generator
```

**AE_LLM_MODEL**: Recommended models:
- `gpt-4o-mini` - Cost-effective, fast (recommended)
- `gpt-4o` - More capable, higher cost
- `gpt-4-turbo` - Balanced performance
- `gpt-3.5-turbo` - Fastest, lowest cost

**AE_LLM_TEMPERATURE**: Lower values (0.0-0.5) produce more consistent encounters, higher values (0.5-2.0) produce more creative/varied content.

## Health Check Endpoints

All services expose health check endpoints for monitoring:

### LLM Proxy
```bash
curl http://localhost:8787/health
```
**Expected Response:**
```json
{
  "status": "ok",
  "service": "llm-proxy",
  "timestamp": "2025-11-07T10:30:00.000Z"
}
```

### Encounters Engine
```bash
curl http://localhost:8786/health
```
**Expected Response:**
```json
{
  "status": "ok",
  "service": "encounters-engine",
  "timestamp": "2025-11-07T10:30:00.000Z"
}
```

### Web Adapter
```bash
curl http://localhost:3000/api/health
```
**Expected Response:**
```json
{
  "status": "ok",
  "service": "web-adapter"
}
```

### GMod Sidecar
```bash
curl http://localhost:8788/health
```
**Expected Response:**
```json
{
  "status": "ok",
  "service": "gmod-sidecar"
}
```

## API Usage

### Starting a Session

```bash
curl -X POST http://localhost:8786/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "player_123",
    "context": {
      "level": 5,
      "preferences": ["combat", "exploration"]
    }
  }'
```

### Getting Session Details

```bash
curl http://localhost:8786/session/{sessionId}
```

### Updating an Objective

```bash
curl -X PATCH http://localhost:8786/session/{sessionId}/objective/{objectiveId} \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

### Completing a Session

```bash
curl -X POST http://localhost:8786/session/{sessionId}/complete
```

## Testing & Coverage

### Test Results Summary

**Last Run:** November 9, 2025

| Metric | Value | Status |
|--------|-------|--------|
| Test Files | 10/10 | ✓ Passed |
| Total Tests | 172/172 | ✓ Passed |
| Pass Rate | 100% | ✓ Passed |
| Execution Time | 3.06s | ✓ Acceptable |
| Lines Coverage | 44.4% | ⚠ Below Target (70%) |
| Functions Coverage | 48.18% | ⚠ Below Target (70%) |

**Detailed Results:** See [TEST_RESULTS_COMPREHENSIVE.md](./TEST_RESULTS_COMPREHENSIVE.md)

### Test Breakdown

| Component | Tests | Status |
|-----------|-------|--------|
| validators | 62 | ✓ 100% pass |
| SessionManager | 16 | ✓ 100% pass |
| FileStorage | 24 | ✓ 100% pass |
| HMAC Auth | 19 | ✓ 100% pass |
| Health Check (integration) | 6 | ✓ 100% pass |
| Session Flow (integration) | 10 | ✓ 100% pass |
| LLM Proxy | 4 | ✓ 100% pass |
| SDK | 20 | ✓ 100% pass |

**Coverage by Package:**
- `validators`: 90.69% lines coverage (meets 70% target)
- `SDK`: 100% lines coverage (meets 70% target)
- `SessionManager`: 98.75% lines coverage (meets 70% target)

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage report
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch

# Run tests with UI dashboard
pnpm test:ui

# Run tests for specific package
pnpm --filter @ai-encounters/validators test
```

## Development

### Building Packages

```bash
# Build all packages and services
pnpm -r build

# Build specific package
pnpm --filter @ai-encounters/core build
```

### Linting

```bash
# Lint all packages
pnpm lint

# Fix linting issues
pnpm lint:fix
```

### Cleaning Build Artifacts

```bash
# Clean all build outputs
pnpm clean
```

### Local Development Without Docker

```bash
# Terminal 1: Start LLM Proxy
cd packages/llm-proxy
pnpm dev

# Terminal 2: Start Encounters Engine
cd services/engine
pnpm dev

# Terminal 3: Start Web Adapter
cd adapters/web-next
pnpm dev
```

## Adding New Adapters

To integrate with a new platform:

1. Create a new directory in `adapters/`
2. Implement using the `@ai-encounters/sdk` package
3. Add a Dockerfile in `docker/`
4. Update `docker-compose.yml` with the new service

Example adapter structure:
```typescript
import { EncountersClient } from '@ai-encounters/sdk';

const client = new EncountersClient('http://engine:8786');

// Start a session
const session = await client.startSession('player_id', {
  level: 10,
  preferences: ['stealth']
});
```

## Plugin System

The Actuary plugin system provides runtime extensibility through a managed lifecycle architecture. Plugins register hooks, subscribe to events, and execute custom logic during encounter generation and session management.

**Key Features:**
- Dynamic plugin discovery and loading
- Async/await lifecycle management (initialize, activate, deactivate, shutdown)
- Hook-based event interception
- Dependency resolution with topological sorting
- Isolated execution contexts and data directories
- Permission-based access control

**Technical Documentation:** See [services/engine/PLUGIN_README.md](./services/engine/PLUGIN_README.md)

### Creating a Plugin

**Minimal plugin.json:**
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "description": "My custom plugin"
}
```

**Minimal plugin implementation (TypeScript):**
```typescript
import { IPlugin, PluginContext, PluginMetadata } from '@ai-encounters/core';

export default class MyPlugin implements IPlugin {
  private context: PluginContext | null = null;

  getMetadata(): PluginMetadata {
    return {
      name: 'my-plugin',
      version: '1.0.0',
      description: 'My custom plugin'
    };
  }

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    // Register hooks or event listeners here
    context.hooks.register('session.complete', async (session) => {
      context.logger.info('Session completed', { sessionId: session.id });
    });
  }

  async activate(): Promise<void> {
    // Plugin is now active
  }

  async deactivate(): Promise<void> {
    // Cleanup before shutdown
  }

  async shutdown(): Promise<void> {
    // Final cleanup
  }

  async healthCheck(): Promise<boolean> {
    return !!this.context;
  }
}
```

**Plugin file structure:**
```
my-plugin/
├── plugin.json
├── package.json
├── src/
│   └── index.ts
└── dist/
    └── index.js
```

### Using Plugins

Plugins are automatically discovered and loaded from the `plugins/` directory:

```bash
plugins/
├── analytics-plugin/
├── engagement-plugin/
└── custom-logic-plugin/
```

During engine startup, plugins are:
1. **Discovered** — Scanned for plugin.json manifests
2. **Loaded** — Dynamically imported as ES modules
3. **Initialized** — Setup with access to engine APIs
4. **Activated** — Ready for execution

Plugins can access:
- **Events** — Subscribe to session/encounter lifecycle events
- **Hooks** — Intercept and modify engine behavior
- **Storage** — Isolated data directory for persistence
- **Logger** — Plugin-scoped logging with prefix
- **Configuration** — Plugin-specific settings from manifest

## Troubleshooting

### Services won't start
- Verify `AE_LLM_API_KEY` is valid
- Check OpenAI account has available credits
- Review LLM Proxy logs: `docker-compose logs llm-proxy`

### HMAC authentication failures
- Ensure `AE_HMAC_SECRET` is identical across all services
- Check for whitespace or encoding issues in the secret

### Session storage issues
- Verify `/data` directory has write permissions
- Check disk space availability
- Review Engine logs: `docker-compose logs engine`

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

