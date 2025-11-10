# Design Document

## Overview

This design addresses the critical stability and quality issues in the AI Encounters Engine by implementing comprehensive testing, fixing Docker builds, and improving observability. The approach prioritizes quick wins while establishing foundations for long-term maintainability.

## Architecture

### Current State Analysis

**Strengths:**
- Clean monorepo structure with clear separation of concerns
- All packages build successfully locally
- Well-documented environment configuration
- Proper service isolation with Docker

**Weaknesses:**
- Docker builds fail due to TypeScript path resolution
- Zero test coverage
- No structured logging
- Inconsistent error handling
- Missing API documentation

### Proposed Improvements

```
┌─────────────────────────────────────────────────────────────┐
│                    System Improvements                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Docker     │  │   Testing    │  │    Docs      │     │
│  │   Build Fix  │  │   Suite      │  │  OpenAPI     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                           │                                 │
│                  ┌────────▼────────┐                        │
│                  │  Core Services  │                        │
│                  │  (Unchanged)    │                        │
│                  └─────────────────┘                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Logging    │  │    Error     │  │  Performance │     │
│  │   System     │  │   Handling   │  │  Monitoring  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Docker Build Fix

**Problem:** TypeScript cannot resolve `@ai-encounters/core` types in Docker environment

**Solution:**
- Remove all tsconfig path aliases (already done)
- Ensure declaration files are generated
- Verify pnpm workspace links work in Docker
- Add build verification step in Dockerfile

**Changes:**
```typescript
// packages/core/tsconfig.json - Ensure declaration is enabled
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}

// Dockerfile verification step
RUN ls -la packages/core/dist/ && \
    test -f packages/core/dist/index.d.ts || exit 1
```

### 2. Testing Infrastructure

**Framework:** Vitest (fast, ESM-native, TypeScript support)

**Structure:**
```
packages/
  validators/
    src/
      __tests__/
        validateEncounterSpec.test.ts
        validatePlayerContext.test.ts
  sdk/
    src/
      __tests__/
        EncountersClient.test.ts
services/
  engine/
    src/
      __tests__/
        unit/
          SessionManager.test.ts
          FileStorage.test.ts
        integration/
          sessionFlow.test.ts
          hmacAuth.test.ts
```

**Test Configuration:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.test.ts', '**/dist/**', '**/node_modules/**']
    },
    globals: true,
    environment: 'node'
  }
});
```

### 3. Health Check Enhancement

**Current:** Basic health endpoints exist
**Enhancement:** Add dependency checks and detailed status

```typescript
// Enhanced health check interface
interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  timestamp: string;
  version: string;
  dependencies?: {
    [key: string]: {
      status: 'ok' | 'error';
      latency?: number;
      error?: string;
    };
  };
}

// Example for Engine service
GET /health
{
  "status": "ok",
  "service": "encounters-engine",
  "timestamp": "2025-11-07T19:30:00Z",
  "version": "1.0.0",
  "dependencies": {
    "llm-proxy": {
      "status": "ok",
      "latency": 45
    },
    "storage": {
      "status": "ok"
    }
  }
}
```

### 4. API Documentation

**Tool:** Swagger/OpenAPI with express-openapi

**Implementation:**
```typescript
// packages/core/src/openapi/schemas.ts
export const SessionStartRequestSchema = {
  type: 'object',
  required: ['playerId', 'context'],
  properties: {
    playerId: { type: 'string', minLength: 1 },
    context: {
      type: 'object',
      properties: {
        level: { type: 'number', minimum: 1 },
        preferences: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  }
};

// services/engine/src/routes/sessions.ts
/**
 * @openapi
 * /session/start:
 *   post:
 *     summary: Start a new encounter session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SessionStartRequest'
 *     responses:
 *       200:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 */
```

### 5. Structured Logging

**Library:** pino (fast, structured, JSON output)

**Implementation:**
```typescript
// packages/core/src/logger.ts
import pino from 'pino';

export const createLogger = (serviceName: string) => {
  return pino({
    name: serviceName,
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => ({ level: label })
    },
    timestamp: pino.stdTimeFunctions.isoTime
  });
};

// Usage in services
const logger = createLogger('encounters-engine');

logger.info({ requestId, method, path, duration }, 'Request completed');
logger.error({ requestId, error: err.message, stack: err.stack }, 'Request failed');
```

### 6. Error Handling Middleware

**Standardized Error Format:**
```typescript
// packages/core/src/errors.ts
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
    timestamp: string;
  };
}

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Express middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string;
  
  if (err instanceof AppError) {
    logger.error({ requestId, error: err }, 'Application error');
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  // Unexpected errors
  logger.error({ requestId, error: err }, 'Unexpected error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId,
      timestamp: new Date().toISOString()
    }
  });
};
```

## Data Models

No changes to existing data models. All improvements are additive.

## Error Handling

### Error Categories

1. **Validation Errors** (400)
   - Invalid input data
   - Missing required fields
   - Type mismatches

2. **Authentication Errors** (401)
   - Invalid HMAC signature
   - Missing authentication header

3. **Not Found Errors** (404)
   - Session not found
   - Resource doesn't exist

4. **Service Errors** (503)
   - LLM Proxy unavailable
   - Storage failure
   - Dependency timeout

5. **Internal Errors** (500)
   - Unexpected exceptions
   - Programming errors

## Testing Strategy

### Unit Tests (70% of test effort)

**Target Coverage:** 80%+

**Focus Areas:**
- Validator functions (100% coverage required)
- SDK client methods
- Session management logic
- File storage operations
- HMAC signature generation

**Example:**
```typescript
// packages/validators/src/__tests__/validateEncounterSpec.test.ts
describe('validateEncounterSpec', () => {
  it('should accept valid encounter spec', () => {
    const spec = {
      id: 'enc_123',
      title: 'Test Encounter',
      description: 'A test',
      difficulty: 'medium',
      estimatedDuration: 30,
      objectives: [/* ... */],
      npcs: [],
      rewards: []
    };
    
    const result = validateEncounterSpec(spec);
    expect(result.valid).toBe(true);
  });
  
  it('should reject spec with missing title', () => {
    const spec = { /* missing title */ };
    const result = validateEncounterSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('title must be a non-empty string');
  });
});
```

### Integration Tests (25% of test effort)

**Focus Areas:**
- End-to-end session flow
- HMAC authentication between services
- Health check endpoints
- Error propagation

**Example:**
```typescript
// services/engine/src/__tests__/integration/sessionFlow.test.ts
describe('Session Flow Integration', () => {
  let server: Server;
  
  beforeAll(async () => {
    server = await startTestServer();
  });
  
  it('should complete full session lifecycle', async () => {
    // Start session
    const startRes = await request(server)
      .post('/session/start')
      .send({ playerId: 'test', context: { level: 5 } });
    
    expect(startRes.status).toBe(200);
    const sessionId = startRes.body.id;
    
    // Update objective
    const updateRes = await request(server)
      .patch(`/session/${sessionId}/objective/obj_1`)
      .send({ completed: true });
    
    expect(updateRes.status).toBe(200);
    
    // Complete session
    const completeRes = await request(server)
      .post(`/session/${sessionId}/complete`);
    
    expect(completeRes.status).toBe(200);
  });
});
```

### Performance Tests (5% of test effort)

**Focus Areas:**
- Session creation latency
- Concurrent request handling
- Memory usage under load

**Example:**
```typescript
// services/engine/src/__tests__/performance/load.test.ts
describe('Performance Benchmarks', () => {
  it('should handle 10 concurrent sessions', async () => {
    const promises = Array.from({ length: 10 }, () =>
      request(server)
        .post('/session/start')
        .send({ playerId: `player_${Math.random()}`, context: {} })
    );
    
    const start = Date.now();
    const results = await Promise.all(promises);
    const duration = Date.now() - start;
    
    expect(results.every(r => r.status === 200)).toBe(true);
    expect(duration).toBeLessThan(5000); // 5 seconds for 10 sessions
  });
});
```

## Performance Considerations

### Metrics to Track

1. **Latency**
   - P50, P95, P99 for all endpoints
   - LLM response time
   - Database query time

2. **Throughput**
   - Requests per second
   - Concurrent sessions supported

3. **Resource Usage**
   - Memory per service
   - CPU utilization
   - Disk I/O for file storage

### Optimization Strategies

1. **Caching**
   - In-memory session cache (already implemented)
   - LLM response caching for common scenarios

2. **Connection Pooling**
   - HTTP keep-alive for inter-service calls
   - Reuse OpenAI client connections

3. **Async Processing**
   - Non-blocking I/O for file operations
   - Parallel validation where possible

## Security Considerations

### Input Validation
- Validate all request bodies against schemas
- Sanitize user input to prevent injection
- Limit request size to prevent DoS

### Authentication
- HMAC signatures for inter-service auth
- Rotate secrets regularly
- Never log secrets or tokens

### Error Messages
- Don't expose internal paths or stack traces
- Generic error messages for production
- Detailed logs for debugging (server-side only)

### Dependencies
- Regular security audits with `pnpm audit`
- Automated dependency updates
- Pin versions in production

## Deployment Strategy

### Phase 1: Fix Docker Build (Week 1)
- Resolve TypeScript declaration issues
- Verify all services build and start
- Test health checks

### Phase 2: Add Testing (Week 1-2)
- Setup Vitest
- Write unit tests for validators and SDK
- Add integration tests for critical flows
- Achieve 70% coverage

### Phase 3: Enhance Observability (Week 2)
- Add structured logging
- Implement enhanced health checks
- Add performance monitoring

### Phase 4: Documentation (Week 2-3)
- Generate OpenAPI spec
- Create API documentation site
- Write troubleshooting guide
- Add contributing guidelines

### Phase 5: Production Hardening (Week 3-4)
- Security audit
- Load testing
- Error handling review
- Performance optimization

## Rollback Plan

All changes are additive and non-breaking:
- Tests can be disabled if they cause issues
- Logging can be reduced via LOG_LEVEL
- Health checks maintain backward compatibility
- API docs are optional additions

No database migrations or breaking API changes required.
