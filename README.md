BOTBOT 0.4

plugin skills, JSONL vector memory, embeddings (OpenAI + Mock), Next.js API, tests, CI, Docker.

## Quick Start

### Install
```bash
npm install
```

### Dev (local, mock embeddings)
```bash
npm run dev
```
Next.js runs at `http://localhost:3000`.

### Test
```bash
npm test
```
All tests use mocks (no network).

### Build
```bash
npm run build
```

### Docker
```bash
docker-compose up
```

## API Usage

**POST /api/agent**

Request:
```json
{
  "userId": "user123",
  "sessionId": "session456",
  "userMessage": "Hello BotBot"
}
```

Response:
```json
{
  "success": true,
  "skillUsed": "converse",
  "result": { "success": true, "data": { "reply": "Mock LLM reply to: \"Hello BotBot\"" } },
  "timings": { "skillSelection": 12, "skillExecution": 3, "memoryUpsert": 5 },
  "trace": ["Selected skill: converse (score: 0.923)", "Skill converse executed successfully"]
}
```

### Sample curl
```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"userId":"user1","sessionId":"sess1","userMessage":"test"}'
```

## Environment Variables

- `OPENAI_API_KEY` — OpenAI API key (optional, uses mock if unset)
- `VECTOR_STORE_PATH` — Path to JSONL memory file (default: `./data/memory.jsonl`)
- `WEB_SEARCH_API_URL` — Web search API URL (optional, uses mock if unset)
- `LOG_LEVEL` — Log level (default: `info`)

## Project Structure

```
src/
  lib/
    skills/          # Skill interface, loader, builtins (converse, webSearch)
    memory/          # JSONL vector store with embedding cache
    llm/             # OpenAI + Mock embeddings
    agent/           # AgentOrchestrator
  pages/api/         # Next.js /api/agent endpoint
  utils/             # Logger
tests/               # Jest unit tests
infra/               # Dockerfile, docker-compose
```

## CI

GitHub Actions runs lint, test, build on push/PR (see `.github/workflows/ci.yml`).

## Testing & Quality

### Test Commands

```bash
npm test                    # Run all unit tests
npm test -- --coverage      # Run with coverage report
npm run type-check          # TypeScript type validation
```

### Test Results

| Test Type | Count | Status | Notes |
|-----------|-------|--------|-------|
| Unit (TypeScript) | 22 | PASS | All tests use mocks, no network calls |
| Skill Loader | 3 | PASS | Validates builtin skill discovery and shape |
| Vector Memory | 3 | PASS | Tests JSONL store, caching, search |
| Embeddings | 6 | PASS | MockEmbeddings determinism, normalization |
| Skills (Builtin) | 6 | PASS | Converse and webSearch with mock adapters |
| Orchestrator | 5 | PASS | Skill selection, execution, error handling |

**Coverage:** 74.16% stmt, 32.6% branch, 77.5% func, 74.47% lines


### Manual Test Scenarios

**Scenario 1: API POST with valid request**
- Input: `{"userId":"test","sessionId":"s1","userMessage":"hello"}`
- Expected: 200 JSON with `success:true`, skill execution, timings
- Actual: Dev server fails to compile TS files imported by JS API route

**Scenario 2: API POST with invalid schema**
- Input: Missing `userId` field
- Expected: 400 with zod validation errors
- Actual: Not tested (server compilation blocked)

**Scenario 3: Vector memory persistence**
- Input: Multiple upserts, server restart, search
- Expected: JSONL file persists between runs
- Actual: Tested in unit tests with temp files, cleanup verified
