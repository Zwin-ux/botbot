# Requirements Document

## Introduction

The AI Encounters Engine is a modular, Dockerized system that powers mission-style "encounters" for games and applications (GMod, Sunny, Unity, etc.) using OpenAI as the LLM backend. The system uses a pnpm monorepo architecture with JSON or local file storage (no database dependencies like Supabase). The engine generates dynamic encounter content through OpenAI's API and provides adapters for different platforms to consume this content.

## Glossary

- **Encounters Engine**: The core service that manages encounter sessions, state, and coordinates with the LLM Proxy
- **LLM Proxy**: A service that interfaces with OpenAI's API to generate encounter content and rewards
- **Encounter**: A mission-style interactive experience with objectives, dialogue, and rewards
- **EncounterSpec**: A JSON schema defining the structure of an encounter (objectives, NPCs, rewards, etc.)
- **Session**: A player's active encounter instance with state tracking
- **Adapter**: Platform-specific integration layer (Web, GMod, Unity, etc.)
- **Monorepo**: A single repository containing multiple packages and services managed by pnpm workspaces
- **HMAC Secret**: A cryptographic key used for securing inter-service communication

## Requirements

### Requirement 1

**User Story:** As a game developer, I want a Dockerized monorepo structure, so that I can easily deploy and scale the encounters system across different environments

#### Acceptance Criteria

1. THE Monorepo SHALL contain workspace packages at packages/core, packages/validators, packages/sdk, and packages/llm-proxy
2. THE Monorepo SHALL contain service applications at services/engine
3. THE Monorepo SHALL contain adapter applications at adapters/web-next and adapters/gmod-sidecar
4. THE Monorepo SHALL include a shared tsconfig.base.json for TypeScript configuration inheritance
5. THE Monorepo SHALL include a root package.json with pnpm workspace definitions and shared scripts

### Requirement 2

**User Story:** As a DevOps engineer, I want Docker containerization for all services, so that I can deploy the system consistently across environments

#### Acceptance Criteria

1. THE Docker Setup SHALL include a base Dockerfile at docker/Dockerfile.base for shared dependencies
2. THE Docker Setup SHALL include service-specific Dockerfiles for engine, llm-proxy, web-next, and gmod-sidecar
3. THE Docker Setup SHALL include a docker-compose.yml file that orchestrates all services
4. THE Docker Setup SHALL include a .dockerignore file to exclude unnecessary files from builds
5. WHEN docker-compose up is executed, THE Docker Setup SHALL start all services with proper networking and volume mounts

### Requirement 3

**User Story:** As a system administrator, I want environment-based configuration, so that I can manage API keys and settings securely

#### Acceptance Criteria

1. THE Configuration System SHALL read OpenAI API key from AE_LLM_API_KEY environment variable
2. THE Configuration System SHALL read LLM model name from AE_LLM_MODEL environment variable with default "gpt-4o-mini"
3. THE Configuration System SHALL read temperature setting from AE_LLM_TEMPERATURE environment variable with default 0.2
4. THE Configuration System SHALL read max tokens from AE_LLM_MAX_OUTPUT_TOKENS environment variable with default 800
5. THE Configuration System SHALL read HMAC secret from AE_HMAC_SECRET environment variable for service authentication
6. THE Configuration System SHALL support .env file for local development environment variables

### Requirement 4

**User Story:** As a game developer, I want OpenAI integration for encounter generation, so that I can create dynamic, AI-powered content

#### Acceptance Criteria

1. THE LLM Proxy SHALL send requests to OpenAI API endpoint at https://api.openai.com/v1/chat/completions
2. WHEN generating an encounter, THE LLM Proxy SHALL include a system message instructing strict JSON output matching EncounterSpec schema
3. WHEN generating an encounter, THE LLM Proxy SHALL set response_format to json_object for structured output
4. THE LLM Proxy SHALL parse the OpenAI response and extract the encounter JSON from the message content
5. IF the OpenAI API call fails, THEN THE LLM Proxy SHALL return an error response with appropriate status code

### Requirement 5

**User Story:** As a game developer, I want a REST API for encounter management, so that I can integrate the engine with different game platforms

#### Acceptance Criteria

1. THE Encounters Engine SHALL expose a POST /session/start endpoint that accepts playerId and returns encounter JSON
2. THE Encounters Engine SHALL expose health check endpoints at /health for monitoring
3. THE LLM Proxy SHALL expose a POST /gen/encounter endpoint that accepts seed data and returns generated encounters
4. THE LLM Proxy SHALL expose a /gen/reward endpoint for reward generation
5. WHEN a session is started, THE Encounters Engine SHALL communicate with LLM Proxy to generate encounter content

### Requirement 6

**User Story:** As a game developer, I want local file-based session storage, so that I can persist encounter data without external database dependencies

#### Acceptance Criteria

1. THE Encounters Engine SHALL store completed session data in a local /data volume
2. THE Storage System SHALL use JSON format for session persistence
3. THE Storage System SHALL NOT require Supabase or any external database service
4. WHEN a session completes, THE Encounters Engine SHALL write session data to the /data directory
5. THE Docker Setup SHALL mount a persistent volume for the /data directory

### Requirement 7

**User Story:** As a web developer, I want a Next.js adapter, so that I can build web-based interfaces for encounters

#### Acceptance Criteria

1. THE Web Adapter SHALL be built with Next.js framework
2. THE Web Adapter SHALL connect to the Encounters Engine at http://engine:8786
3. THE Web Adapter SHALL render encounter content received from the engine
4. THE Web Adapter SHALL be containerized with its own Dockerfile
5. THE Web Adapter SHALL be accessible on a designated port defined in docker-compose.yml

### Requirement 8

**User Story:** As a GMod server administrator, I want a GMod sidecar adapter, so that I can integrate encounters into Garry's Mod servers

#### Acceptance Criteria

1. THE GMod Sidecar SHALL connect to the Encounters Engine at http://engine:8786
2. THE GMod Sidecar SHALL provide an API bridge between GMod Lua scripts and the Encounters Engine
3. THE GMod Sidecar SHALL be containerized with its own Dockerfile
4. THE GMod Sidecar SHALL handle request translation between GMod format and engine format
5. THE GMod Sidecar SHALL be accessible on a designated port defined in docker-compose.yml

### Requirement 9

**User Story:** As a developer, I want shared TypeScript packages, so that I can maintain consistent types and utilities across services

#### Acceptance Criteria

1. THE Core Package SHALL define shared TypeScript types and interfaces for encounters, sessions, and players
2. THE Validators Package SHALL provide validation functions for encounter data and API requests
3. THE SDK Package SHALL provide client libraries for consuming the Encounters Engine API
4. THE Packages SHALL be buildable independently with pnpm build command
5. THE Services and Adapters SHALL import and use the shared packages as dependencies

### Requirement 10

**User Story:** As a developer, I want a simple startup process, so that I can quickly run and test the entire system

#### Acceptance Criteria

1. WHEN pnpm i is executed, THE System SHALL install all workspace dependencies
2. WHEN pnpm -r build is executed, THE System SHALL build all packages and services
3. WHEN docker-compose up --build is executed, THE System SHALL build and start all containers
4. THE LLM Proxy Health Check SHALL respond with "ok" at http://localhost:8787/health
5. THE Encounters Engine Health Check SHALL respond with "ok" at http://localhost:8786/health
