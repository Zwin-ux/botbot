# Major Update Prompt: Docker Fix & Feature Expansion

## Current State & Issues

### 1. **Docker Runtime Issue - ES Module / CommonJS Mismatch**

**Problem:** The engine service is compiled to CommonJS but `package.json` declares `"type": "module"` (ES modules), causing:
```
ReferenceError: exports is not defined in ES module scope
This file is being treated as an ES module because it has a '.js' file extension and '/app/services/engine/package.json' contains "type": "module".
```

**Root Cause:** `tsconfig.base.json` uses `"module": "commonjs"` but the runtime expects ES modules.

**Solution Needed:** 
- Change `tsconfig.base.json` to use `"module": "esnext"` 
- Verify all packages handle ES module imports correctly
- Rebuild Docker image and test runtime

**Current Status:** TypeScript config changed but Docker not rebuilt yet.

---

### 2. **TypeScript Build Configuration Issues**

**History of iterations:**
1. ✅ Fixed original `TS6306` error by adding `"composite": true` to packages (core, validators, sdk, engine)
2. ✅ Removed project references from tsconfigs (they don't work with plain `tsc`, only with `tsc -b`)
3. ✅ Simplified build to use `pnpm --filter @ai-encounters/engine... build` with per-package `tsc` calls
4. ⏳ Pending: Verify ES module build output works in Docker

**Current Configuration:**
- All packages have `"composite": true` in tsconfig.json
- All project references removed (not compatible with `tsc` without `-b` flag)
- Base module output is `"module": "esnext"` (recently changed from commonjs)
- Build uses pnpm's workspace filtering for dependency ordering

**Required Validation:**
- All packages compile to ES modules without errors
- Docker build completes successfully
- Container runtime executes without module errors

---

### 3. **Docker Image Build Status**

**Last Successful Build:** 
- Image: `actuary:latest`
- Build command: `docker build -f docker/Dockerfile.engine -t actuary:latest . --no-cache`
- Status: ✅ Built successfully (28.8s)
- Runtime Status: ❌ Fails due to ES module/CommonJS mismatch

**Dockerfile Changes:**
- Copies all package tsconfig.json files (lines 12-16)
- Copies all source directories (lines 18-22)
- Build command: `pnpm --filter @ai-encounters/engine... build` (line 41)

**Required Actions:**
1. Rebuild Docker with updated tsconfig.base.json (esnext module output)
2. Test Docker container runtime
3. Verify all services start without errors

---

## New Features to Add

### Phase 1: Enhanced Session Management

#### 1.1 Session Persistence & History
- [ ] Implement session save/load with versioning
- [ ] Add session search/filtering API
- [ ] Create session archive functionality
- [ ] Add session replay/rewind capability
- Location: `services/engine/src/storage/`
- Expected API: `GET /session/history`, `POST /session/{id}/save`, `GET /session/{id}/version/{version}`

#### 1.2 Player Profiles & Progression
- [ ] Create player profile storage system
- [ ] Track player statistics (levels, achievements, playtime)
- [ ] Implement skill progression system
- [ ] Add player preferences learning
- Location: `packages/core/src/types/player.ts`, new: `services/engine/src/storage/player-profiles.ts`
- Types needed: `PlayerProfile`, `PlayerStats`, `Achievement`, `SkillTree`

#### 1.3 Advanced Encounter Generation
- [ ] Add encounter difficulty scaling
- [ ] Implement encounter templates system
- [ ] Create dynamic NPC generation with personalities
- [ ] Add environmental modifiers to encounters
- Location: `packages/llm-proxy/src/prompts/` (new)
- Enhancement: More sophisticated prompting, context injection

### Phase 2: API Improvements

#### 2.1 Batch Operations
- [ ] Implement bulk session start
- [ ] Add batch encounter creation
- [ ] Create CSV/JSON export for sessions
- Location: New routes in `services/engine/src/routes/batch.ts`
- API: `POST /batch/sessions`, `POST /batch/encounters`, `GET /export`

#### 2.2 WebSocket Real-time Updates
- [ ] Add WebSocket support to engine
- [ ] Implement real-time session updates
- [ ] Create live player/NPC dialogue streaming
- Location: New service: `services/engine/src/services/websocket.ts`
- Dependencies: `ws` or `Socket.io`

#### 2.3 Advanced Filtering & Search
- [ ] Implement Elasticsearch integration option
- [ ] Add encounter recommendation engine
- [ ] Create player skill matching for encounters
- Location: `services/engine/src/services/search.ts`
- API: `POST /search/encounters`, `GET /recommendations/{playerId}`

### Phase 3: Monitoring & Observability

#### 3.1 Comprehensive Logging
- [ ] Add structured logging (JSON format)
- [ ] Implement log levels and categorization
- [ ] Create request tracing with correlation IDs
- Location: `packages/core/src/utils/logger.ts`
- Library: `winston` or `pino`

#### 3.2 Metrics & Telemetry
- [ ] Add Prometheus metrics
- [ ] Track encounter generation success rate
- [ ] Monitor API response times
- [ ] Create system health dashboard
- Location: `services/engine/src/middleware/metrics.ts`
- Library: `prom-client`

#### 3.3 Error Handling & Recovery
- [ ] Implement circuit breaker pattern (already started in llm-proxy)
- [ ] Add retry logic with exponential backoff
- [ ] Create error recovery procedures
- [ ] Add graceful degradation
- Enhancement: Expand existing `packages/llm-proxy/src/circuitBreaker.ts`

### Phase 4: UI/UX Enhancements

#### 4.1 Next.js Web Adapter Improvements
- [ ] Add real-time encounter display with WebSocket
- [ ] Implement dynamic encounter card updates
- [ ] Create NPC dialogue animations
- [ ] Add player inventory system display
- [ ] Implement encounter history timeline
- Location: `adapters/web-next/app/components/`

#### 4.2 Mobile Responsiveness
- [ ] Full mobile optimization for all components
- [ ] Add touch gesture support
- [ ] Create mobile-specific UI layouts
- Location: `adapters/web-next/app/components/` with `.mobile.tsx` variants

#### 4.3 Accessibility (A11y)
- [ ] Add ARIA labels to all components
- [ ] Implement keyboard navigation
- [ ] Add screen reader support
- [ ] Create high-contrast theme option
- Location: Audit and update all `.tsx` files in adapters

### Phase 5: Data & Performance

#### 5.1 Database Migration (Optional but recommended)
- [ ] Evaluate PostgreSQL vs MongoDB for current needs
- [ ] Create migration scripts from file-based storage
- [ ] Implement database abstraction layer
- [ ] Add connection pooling and caching
- Location: New: `services/engine/src/storage/db/`

#### 5.2 Caching Strategy
- [ ] Implement Redis for session caching
- [ ] Add encounter template caching
- [ ] Create LLM response cache (deduplicated prompts)
- Location: New: `packages/core/src/cache/`
- Configuration: Add Redis connection variables to `.env`

#### 5.3 Performance Optimization
- [ ] Add database indexing strategy
- [ ] Implement query pagination
- [ ] Create async job queue for long-running operations
- [ ] Optimize LLM prompt sizes
- Library: Consider `bull` for job queue

### Phase 6: Security Enhancements

#### 6.1 Authentication & Authorization
- [ ] Implement JWT token auth (with refresh tokens)
- [ ] Add role-based access control (RBAC)
- [ ] Create API key management system
- [ ] Implement rate limiting per user/API key
- Location: New: `services/engine/src/middleware/auth.ts`
- Library: `jsonwebtoken`, `passport` optional

#### 6.2 Input Validation & Sanitization
- [ ] Enhance validators package with stricter rules
- [ ] Add XSS protection
- [ ] Implement SQL injection prevention (for DB future)
- [ ] Add file upload validation
- Location: Expand `packages/validators/`

#### 6.3 API Security
- [ ] Add CORS configuration
- [ ] Implement HTTPS in production
- [ ] Add request signing verification
- [ ] Create API documentation with OpenAPI/Swagger
- Location: `services/engine/src/server.ts`, new: `docs/openapi.yaml`

### Phase 7: Testing Infrastructure

#### 7.1 Unit Testing
- [ ] Add comprehensive unit tests for validators
- [ ] Create tests for SDK client
- [ ] Add engine route tests
- [ ] Implement test coverage reporting
- Location: `packages/*/tests/unit/`, `services/*/tests/unit/`
- Framework: `vitest` (fast, TypeScript native)

#### 7.2 Integration Testing
- [ ] Create full workflow tests (session → encounter → completion)
- [ ] Add API integration tests
- [ ] Test inter-service communication
- Location: `tests/integration/`
- Framework: `supertest` with `vitest`

#### 7.3 End-to-End Testing
- [ ] Create Docker Compose test environment
- [ ] Add E2E test suite for complete workflows
- [ ] Implement performance benchmarks
- Location: `tests/e2e/`
- Framework: `playwright` or `cypress` (if web testing needed)

---

## Implementation Roadmap

### Week 1: Foundation Fixes
- [ ] Fix ES module compilation issue
- [ ] Verify Docker build & runtime
- [ ] Add comprehensive logging (Phase 3.1)
- [ ] Implement health check improvements

### Week 2: Core Features
- [ ] Session persistence & history (Phase 1.1)
- [ ] Player profiles (Phase 1.2)
- [ ] Batch operations API (Phase 2.1)
- [ ] Initial unit tests (Phase 7.1)

### Week 3: Real-time & Advanced
- [ ] WebSocket implementation (Phase 2.2)
- [ ] Advanced encounter generation (Phase 1.3)
- [ ] Metrics & telemetry (Phase 3.2)
- [ ] Integration tests (Phase 7.2)

### Week 4: UI & Polish
- [ ] Next.js component enhancements (Phase 4.1)
- [ ] Mobile optimization (Phase 4.2)
- [ ] Accessibility audit (Phase 4.3)
- [ ] API documentation (Phase 6.3)

### Future: Scale & Optimize
- [ ] Database migration (Phase 5.1)
- [ ] Redis caching (Phase 5.2)
- [ ] Authentication system (Phase 6.1)
- [ ] E2E testing (Phase 7.3)

---

## Dependencies to Add

### Current in Use
- `express`, `dotenv`, `typescript`, `tsx`, `pnpm`

### Phase 1-3 Recommendations
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^6.0.0"
  },
  "dependencies": {
    "winston": "^3.11.0",
    "prom-client": "^15.0.0",
    "ws": "^8.14.0"
  }
}
```

### Future (If Implementing)
```json
{
  "dependencies": {
    "redis": "^4.6.0",
    "bull": "^4.11.0",
    "pg": "^8.11.0",
    "jsonwebtoken": "^9.1.0",
    "cors": "^2.8.5"
  }
}
```

---

## Configuration Changes Needed

### `.env` Variables to Add
```bash
# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Metrics
PROMETHEUS_PORT=9090
ENABLE_METRICS=true

# WebSocket
WEBSOCKET_ENABLED=true
WEBSOCKET_PING_INTERVAL=30000

# Cache (Future)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false

# Database (Future)
DATABASE_URL=postgresql://user:pass@localhost/encounters
DB_ENABLED=false

# Auth (Future)
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h
```

---

## Success Criteria

### Immediate (Docker Fix)
- [x] TypeScript compiles to ES modules
- [ ] Docker image builds without errors
- [ ] Container starts successfully
- [ ] Health check endpoints respond
- [ ] All services can communicate

### Short-term (Phase 1-2)
- [ ] Session persistence working
- [ ] Player profiles stored correctly
- [ ] Batch API endpoints functional
- [ ] 80%+ unit test coverage for validators
- [ ] Performance: API responses < 200ms (excluding LLM calls)

### Long-term (Phase 3-7)
- [ ] Metrics dashboard operational
- [ ] WebSocket real-time updates working
- [ ] Full E2E test suite passing
- [ ] API documentation complete
- [ ] 90%+ test coverage across codebase

---

## Estimated Effort

| Phase | Features | Effort | Priority |
|-------|----------|--------|----------|
| Docker Fix | ES module compilation | 2 hours | 🔴 CRITICAL |
| Phase 1 | Session & Player features | 40 hours | 🔴 HIGH |
| Phase 2 | Advanced APIs | 30 hours | 🟡 MEDIUM |
| Phase 3 | Monitoring | 25 hours | 🟡 MEDIUM |
| Phase 4 | UI Improvements | 35 hours | 🟡 MEDIUM |
| Phase 5 | Data & Performance | 50 hours | 🟢 LOW (post-MVP) |
| Phase 6 | Security | 40 hours | 🟢 LOW (post-MVP) |
| Phase 7 | Testing | 60 hours | 🟠 ONGOING |

---

## Next Steps

1. **Immediately:** 
   - Rebuild Docker with esnext module config
   - Test container runtime
   - Verify all services start

2. **This session:**
   - Confirm Docker fix works
   - Begin Phase 1 (Session persistence)
   - Add logging infrastructure

3. **Follow-up sessions:**
   - Implement remaining Phase 1-2 features
   - Add comprehensive testing
   - Expand UI/UX

---

## Notes

- **File-based storage current implementation:** Check `services/engine/src/storage/` for existing patterns
- **LLM integration:** `packages/llm-proxy/` is well-structured; expand prompting system
- **Monorepo benefits:** Use `pnpm --filter` for targeted development and testing
- **Docker optimization:** Consider multi-stage builds for reduced image size
- **TypeScript:** Ensure all new code uses strict mode and proper typing

