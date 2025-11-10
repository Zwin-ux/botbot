# Implementation Plan

- [x] 1. Fix Docker build and verify deployment





  - Verify TypeScript declaration files are generated in core package
  - Add build verification step to Dockerfiles
  - Test docker-compose up --build completes successfully
  - Verify all containers start and pass health checks
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Setup testing infrastructure






- [x] 2.1 Install and configure Vitest

  - Add vitest and @vitest/ui as dev dependencies to root package.json
  - Create vitest.config.ts with coverage configuration
  - Add test scripts to root package.json (test, test:watch, test:coverage)
  - _Requirements: 2.1_


- [x] 2.2 Create test utilities and helpers

  - Create packages/core/src/test-utils.ts with common test helpers
  - Add mock data generators for EncounterSpec, Session, PlayerContext
  - Create test server setup utilities for integration tests
  - _Requirements: 2.1_

- [x] 3. Implement unit tests for validators package





- [x] 3.1 Write tests for validateEncounterSpec


  - Test valid encounter spec acceptance
  - Test rejection of missing required fields
  - Test validation of objectives array
  - Test validation of NPCs and dialogue
  - Test validation of rewards
  - _Requirements: 2.2, 2.3_

- [x] 3.2 Write tests for validatePlayerContext


  - Test valid player context acceptance
  - Test validation of playerId field
  - Test optional fields (level, preferences, history)
  - Test rejection of invalid data types
  - _Requirements: 2.2, 2.3_

- [x] 4. Implement unit tests for SDK package





- [x] 4.1 Write tests for EncountersClient


  - Mock HTTP requests using msw or similar
  - Test startSession method with valid/invalid data
  - Test getSession method
  - Test updateObjective method
  - Test completeSession method
  - Test error handling for network failures
  - _Requirements: 2.2, 2.4_

- [x] 5. Implement unit tests for engine service





- [x] 5.1 Write tests for SessionManager


  - Test session creation logic
  - Test objective update logic
  - Test session completion logic
  - Test session state management
  - _Requirements: 2.2_

- [x] 5.2 Write tests for FileStorage


  - Test writeSession method
  - Test readSession method
  - Test file path generation
  - Test error handling for I/O failures
  - _Requirements: 2.2_

- [x] 6. Implement integration tests




- [x] 6.1 Write end-to-end session flow test


  - Start test server with all dependencies
  - Test POST /session/start creates session
  - Test PATCH /session/:id/objective/:objectiveId updates objective
  - Test POST /session/:id/complete marks session complete
  - Verify data persists to storage
  - _Requirements: 2.5, 4.1, 4.2, 4.3, 4.4_


- [x] 6.2 Write HMAC authentication tests






  - Test valid HMAC signature is accepted
  - Test invalid HMAC signature is rejected
  - Test missing HMAC header is rejected
  - Test signature generation utility
  - _Requirements: 2.5, 6.2_

- [x] 7. Implement health check enhancements





- [x] 7.1 Enhance health check responses


  - Add version field to health responses
  - Add dependency status checks
  - Add latency measurements for dependencies
  - Return degraded status when dependencies fail
  - _Requirements: 3.1, 3.2, 3.3, 3.4_


- [x] 7.2 Write health check tests


  - Test all health endpoints return 200 when healthy
  - Test health endpoints return 503 when unhealthy
  - Test response format matches specification
  - Test dependency checks work correctly
  - _Requirements: 3.5_

- [x] 8. Implement structured logging





- [x] 8.1 Add pino logging library


  - Install pino and pino-pretty as dependencies
  - Create packages/core/src/logger.ts with logger factory
  - Configure log levels via LOG_LEVEL environment variable
  - Add request ID generation middleware
  - _Requirements: 8.1, 8.5_


- [x] 8.2 Add logging to all services

  - Add request/response logging to engine service
  - Add error logging with stack traces
  - Add inter-service call logging with correlation IDs
  - Use JSON format for production logs
  - _Requirements: 8.2, 8.3, 8.4_

- [ ] 9. Implement standardized error handling
- [ ] 9.1 Create error handling utilities
  - Create packages/core/src/errors.ts with AppError class
  - Define error codes for common scenarios
  - Create ErrorResponse interface
  - _Requirements: 6.1_

- [ ] 9.2 Add error middleware to services
  - Create error handling middleware for Express
  - Return consistent error format across all services
  - Add proper HTTP status codes for different error types
  - Include request ID in error responses
  - Never expose internal details in production
  - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ] 10. Create API documentation
- [ ] 10.1 Setup OpenAPI specification
  - Install swagger-jsdoc and swagger-ui-express
  - Create OpenAPI schema definitions in packages/core/src/openapi/
  - Add JSDoc comments to route handlers with OpenAPI annotations
  - _Requirements: 5.1, 5.2_

- [ ] 10.2 Generate and serve API docs
  - Generate OpenAPI spec from JSDoc comments
  - Serve Swagger UI at /api-docs endpoint
  - Add request/response examples to documentation
  - Document all error codes and responses
  - Document HMAC authentication process
  - _Requirements: 5.3, 5.4, 5.5_

- [ ] 11. Add performance monitoring
- [ ] 11.1 Implement performance metrics
  - Add response time tracking middleware
  - Log P50, P95, P99 latencies
  - Track memory usage per service
  - Monitor LLM API call latency
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 11.2 Create performance benchmarks
  - Write load test for concurrent sessions
  - Measure session creation time
  - Test system under sustained load
  - Document performance baselines
  - _Requirements: 7.4, 7.5_

- [ ] 12. Improve development workflow
- [ ] 12.1 Create development documentation
  - Write CONTRIBUTING.md with setup instructions
  - Create TROUBLESHOOTING.md with common issues
  - Add architecture diagrams to README
  - Document local development without Docker
  - _Requirements: 9.1, 9.5_

- [ ] 12.2 Add development tooling
  - Setup pre-commit hooks with husky
  - Add lint-staged for automatic formatting
  - Configure test watch mode
  - Add npm scripts for common tasks
  - _Requirements: 9.2, 9.3, 9.4_

- [ ] 13. Security hardening
- [ ] 13.1 Add input validation middleware
  - Validate all request bodies against schemas
  - Sanitize user input
  - Add request size limits
  - Rate limit endpoints
  - _Requirements: 10.1_

- [ ] 13.2 Implement security best practices
  - Never log secrets or tokens
  - Use secure HMAC generation
  - Don't expose internal errors to clients
  - Add security headers middleware
  - Setup automated dependency scanning
  - _Requirements: 10.2, 10.3, 10.4, 10.5_

- [ ] 14. Final verification and documentation
- [ ] 14.1 Run full test suite
  - Verify all tests pass
  - Check test coverage meets 70% threshold
  - Run integration tests
  - Run performance benchmarks
  - _Requirements: 2.2_

- [ ] 14.2 Verify Docker deployment
  - Build all services with docker-compose
  - Verify all health checks pass
  - Test end-to-end session flow in Docker
  - Verify logs are properly formatted
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 14.3 Update documentation
  - Update README with new features
  - Ensure API docs are complete
  - Verify troubleshooting guide is accurate
  - Add performance baseline documentation
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
