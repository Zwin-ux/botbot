# Implementation Plan

- [x] 1. Set up monorepo structure and base configuration





  - Create pnpm workspace configuration with packages, services, and adapters directories
  - Create tsconfig.base.json with shared TypeScript compiler options and path mappings
  - Create root package.json with workspace definitions and shared scripts (build, test, lint)
  - Create .dockerignore file to exclude node_modules, .git, and build artifacts
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Implement core package with shared types





  - Create packages/core/src/types directory structure
  - Define EncounterSpec interface with objectives, NPCs, rewards, and metadata
  - Define Session and SessionState interfaces for state tracking
  - Define PlayerContext interface for player data
  - Create index.ts to export all types
  - Add package.json with TypeScript build configuration
  - _Requirements: 9.1, 9.5_

- [x] 3. Implement validators package





  - Create packages/validators/src directory
  - Implement validateEncounterSpec function with schema validation
  - Implement validateSessionStartRequest function
  - Implement validatePlayerContext function
  - Create ValidationError type for consistent error responses
  - Add package.json with dependency on core package
  - _Requirements: 9.2, 9.5_

- [x] 4. Implement SDK package





  - Create packages/sdk/src directory
  - Implement EncountersClient class with HTTP methods (startSession, getSession, updateObjective, completeSession)
  - Add error handling and response parsing
  - Add TypeScript types for client options and responses
  - Add package.json with dependencies on core and validators packages
  - _Requirements: 9.3, 9.5_

- [x] 5. Implement LLM Proxy service




- [x] 5.1 Set up LLM Proxy project structure


  - Create packages/llm-proxy/src directory
  - Create configuration module to read environment variables (AE_LLM_API_KEY, AE_LLM_MODEL, AE_LLM_TEMPERATURE, AE_LLM_MAX_OUTPUT_TOKENS, AE_HMAC_SECRET)
  - Set up Express server with JSON body parsing
  - Add package.json with dependencies on core and validators packages
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1_

- [x] 5.2 Implement OpenAI integration


  - Create OpenAI client wrapper with API endpoint configuration
  - Implement encounter generation with system prompt for EncounterSpec JSON output
  - Configure response_format as json_object for structured output
  - Implement response parsing and validation against EncounterSpec schema
  - Add error handling for OpenAI API failures with appropriate status codes
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5.3 Implement HMAC authentication middleware


  - Create HMAC validation middleware to verify X-HMAC-Signature header
  - Implement signature generation utility using HMAC-SHA256
  - Add authentication error responses for invalid signatures
  - _Requirements: 3.5_


- [x] 5.4 Implement LLM Proxy API endpoints

  - Implement POST /gen/encounter endpoint with seed data handling
  - Implement POST /gen/reward endpoint for reward generation
  - Implement GET /health endpoint returning "ok" status
  - Add request validation using validators package
  - _Requirements: 5.3, 5.4, 10.4_

- [x] 5.5 Add retry logic and error handling






  - Implement exponential backoff for OpenAI API calls (3 retries: 1s, 2s, 4s)
  - Add circuit breaker pattern for repeated failures
  - Add comprehensive error logging
  - _Requirements: 4.5_

- [x] 6. Implement Encounters Engine service




- [x] 6.1 Set up Engine project structure


  - Create services/engine/src directory
  - Create configuration module to read environment variables (AE_HMAC_SECRET, LLM_PROXY_URL)
  - Set up Express server with JSON body parsing
  - Add package.json with dependencies on core, validators, and sdk packages
  - _Requirements: 3.5, 3.6_

- [x] 6.2 Implement file-based session storage


  - Create FileStorage class for JSON file operations
  - Implement writeSession method to persist sessions to /data directory
  - Implement readSession method to load sessions from /data directory
  - Add in-memory cache for active sessions with LRU eviction
  - Create /data directory structure on startup
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6.3 Implement LLM Proxy client


  - Create LLMProxyClient class to communicate with LLM Proxy
  - Implement HMAC signature generation for requests
  - Implement generateEncounter method calling POST /gen/encounter
  - Add error handling for LLM Proxy communication failures
  - _Requirements: 5.5_

- [x] 6.4 Implement session management logic


  - Implement session creation with unique ID generation
  - Implement session state initialization
  - Implement objective update logic
  - Implement session completion logic with file persistence
  - _Requirements: 5.1, 5.5, 6.4_

- [x] 6.5 Implement Engine API endpoints


  - Implement POST /session/start endpoint with playerId and PlayerContext handling
  - Implement GET /session/:id endpoint
  - Implement PATCH /session/:id/objective/:objectiveId endpoint
  - Implement POST /session/:id/complete endpoint
  - Implement GET /health endpoint returning "ok" status
  - Add request validation using validators package
  - _Requirements: 5.1, 5.2, 10.5_

- [x] 7. Create Docker configuration







- [x] 7.1 Create base Dockerfile

  - Create docker/Dockerfile.base with Node.js runtime
  - Install pnpm package manager
  - Add common system dependencies
  - _Requirements: 2.1_

- [x] 7.2 Create service-specific Dockerfiles


  - Create docker/Dockerfile.llm-proxy extending base image
  - Create docker/Dockerfile.engine extending base image
  - Create docker/Dockerfile.web extending base image
  - Create docker/Dockerfile.gmod extending base image
  - Configure each Dockerfile to copy service code and run build
  - _Requirements: 2.2_

- [x] 7.3 Create docker-compose configuration


  - Create docker-compose.yml with all service definitions
  - Configure llm-proxy service with port 8787 and environment variables
  - Configure engine service with port 8786, /data volume mount, and dependency on llm-proxy
  - Configure web-next service with port 3000 and dependency on engine
  - Configure gmod-sidecar service with port 8788 and dependency on engine
  - Create encounters-net bridge network for inter-service communication
  - _Requirements: 2.3, 2.5, 6.5_

- [x] 8. Implement Web Next.js adapter





- [x] 8.1 Set up Next.js project structure


  - Create adapters/web-next/app directory for Next.js 14 app router
  - Create next.config.js with environment variable configuration
  - Create adapters/web-next/.env.local.example with NEXT_PUBLIC_ENGINE_URL
  - _Requirements: 7.1, 7.2, 7.5_

- [x] 8.2 Implement encounter UI components


  - Create app/components/EncounterDisplay.tsx showing title, description, and objectives
  - Create app/components/ObjectiveList.tsx with completion status
  - Create app/components/NPCDialogue.tsx for NPC interactions
  - Create app/components/RewardsDisplay.tsx for rewards
  - _Requirements: 7.3_

- [x] 8.3 Implement session management pages


  - Create app/page.tsx as session start page with player ID input
  - Create app/session/[id]/page.tsx for active encounter display
  - Integrate EncountersClient from SDK for API calls
  - Add error handling and loading states
  - _Requirements: 7.2, 7.3_

- [x] 9. Implement GMod sidecar adapter





- [x] 9.1 Set up GMod sidecar project structure


  - Create adapters/gmod-sidecar/src directory
  - Create adapters/gmod-sidecar/src/index.ts with Express server setup
  - Create adapters/gmod-sidecar/src/config.ts for environment variables (ENGINE_URL, GMOD_SIDECAR_PORT)
  - _Requirements: 8.1, 8.3, 8.5_

- [x] 9.2 Implement request translation layer


  - Create adapters/gmod-sidecar/src/translators.ts with format converters
  - Implement GMod format to engine format converter
  - Implement engine format to GMod format converter
  - Implement SteamID to playerId mapping logic
  - _Requirements: 8.4_

- [x] 9.3 Implement GMod API endpoints


  - Create adapters/gmod-sidecar/src/routes.ts with GMod-specific endpoints
  - Implement POST /gmod/session/start endpoint
  - Implement GET /gmod/session/:id endpoint
  - Implement POST /gmod/session/:id/objective/:objectiveId endpoint
  - Integrate EncountersClient from SDK for engine communication
  - _Requirements: 8.2, 8.4_

- [x] 10. Create environment configuration and documentation





  - Create .env.example file with all required environment variables (AE_LLM_API_KEY, AE_HMAC_SECRET, AE_LLM_MODEL, AE_LLM_TEMPERATURE, AE_LLM_MAX_OUTPUT_TOKENS)
  - Update README.md with complete environment variable documentation
  - Update README.md with startup instructions (pnpm i, pnpm -r build, docker-compose up --build)
  - Document health check endpoints and expected responses in README.md
  - _Requirements: 3.6, 10.1, 10.2, 10.3, 10.4, 10.5_
