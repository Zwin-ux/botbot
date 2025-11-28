# Implementation Plan

## Phase 1: Repository Cleanup and Core Foundation

- [x] 1. Clean up repository structure and dependencies






  - [x] 1.1 Reorganize src/ into core/, platforms/, llm/, memory/, config/ folders

    - Move existing code into appropriate folders
    - Update all import paths
    - _Requirements: 13.1_

  - [x] 1.2 Audit and clean package.json dependencies

    - Remove unused dependencies
    - Standardize scripts (dev, test, lint, build)
    - _Requirements: 13.2_

  - [x] 1.3 Update .env.example with all required variables and comments

    - Document DISCORD_TOKEN, SLACK_TOKEN, OPENAI_API_KEY, etc.
    - _Requirements: 13.2, 13.5_

  - [x] 1.4 Clean up deployment configs

    - Keep Docker as primary, mark others as legacy
    - Update DEPLOYMENT.md with preferred path
    - _Requirements: 13.1_
  - [x] 1.5 Configure deployment to exclude sensitive files


    - Add .kiro/, steering docs, and spec files to .dockerignore
    - Update .gitignore to protect local configs
    - Ensure no internal documentation is deployed
    - _Requirements: 13.1, 13.5_

- [ ] 2. Implement Core Message types and validation
  - [ ] 2.1 Create TypeScript interfaces for CoreMessage, CoreResponse, RichContent, InternalEvent
    - Define in src/core/types.ts
    - _Requirements: 1.1, 1.2_
  - [ ] 2.2 Implement Zod schemas for message validation
    - Create validators for all core types
    - _Requirements: 1.2, 1.3, 1.5_
  - [ ]* 2.3 Write property test for Core Message round-trip
    - **Property 1: Core Message Round-Trip Consistency**
    - **Validates: Requirements 1.4, 1.5**
  - [ ]* 2.4 Write property test for invalid message rejection
    - **Property 2: Invalid Message Rejection**
    - **Validates: Requirements 1.2, 1.3**

- [ ] 3. Implement Core Service interface
  - [ ] 3.1 Create CoreService class with processMessage method
    - Implement message validation
    - Return structured responses
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ] 3.2 Implement adapter registration system
    - Track registered adapters by platformId
    - _Requirements: 2.4_
  - [ ]* 3.3 Write unit tests for CoreService
    - Test message processing flow
    - Test adapter registration
    - _Requirements: 1.1, 2.4_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Platform Adapter Interface and Discord Refactor

- [ ] 5. Define Platform Adapter interface
  - [ ] 5.1 Create PlatformAdapter interface in src/platforms/types.ts
    - Define initialize, shutdown, normalizeEvent, formatResponse, sendMessage
    - _Requirements: 2.1, 2.2_
  - [ ] 5.2 Implement base adapter class with common functionality
    - Connection management, retry logic, logging
    - _Requirements: 2.3_
  - [ ]* 5.3 Write property test for exponential backoff timing
    - **Property 5: Exponential Backoff Timing**
    - **Validates: Requirements 2.3**

- [ ] 6. Refactor Discord adapter to use new interface
  - [ ] 6.1 Create DiscordAdapter class implementing PlatformAdapter
    - Extract from existing src/index.js
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 6.2 Implement normalizeEvent for Discord messages
    - Extract userId, channelId, guildId, content
    - _Requirements: 3.1_
  - [ ] 6.3 Implement formatResponse for Discord embeds
    - Transform RichContent to Discord embed format
    - _Requirements: 3.2_
  - [ ]* 6.4 Write property test for Discord event normalization
    - **Property 3: Platform Event Normalization Completeness** (Discord)
    - **Validates: Requirements 2.1, 3.1**
  - [ ]* 6.5 Write property test for Discord response transformation
    - **Property 4: Response Transformation Validity** (Discord)
    - **Validates: Requirements 2.2, 3.2**

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: User Identity System

- [ ] 8. Implement User Identity data model and storage
  - [ ] 8.1 Create database migrations for users and platform_links tables
    - Define schema as specified in design
    - _Requirements: 6.2, 6.4_
  - [ ] 8.2 Implement UserIdentityService class
    - resolveUser, createUser, linkPlatform methods
    - _Requirements: 6.1, 6.2, 6.4, 6.5_
  - [ ] 8.3 Implement link code generation and validation
    - generateLinkCode, validateLinkCode methods
    - _Requirements: 6.3_
  - [ ]* 8.4 Write property test for user identity resolution consistency
    - **Property 6: User Identity Resolution Consistency**
    - **Validates: Requirements 6.1**
  - [ ]* 8.5 Write property test for user identity storage round-trip
    - **Property 7: User Identity Storage Round-Trip**
    - **Validates: Requirements 6.2, 6.4, 6.5**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Memory Layer

- [ ] 10. Implement Memory Layer
  - [ ] 10.1 Create database migration for memories table
    - Define schema with id, user_id, content, tags, timestamp, source
    - _Requirements: 7.1_
  - [ ] 10.2 Implement MemoryLayer class with store and retrieve methods
    - Tag-based storage and context-based retrieval
    - _Requirements: 7.1, 7.2_
  - [ ] 10.3 Implement exportAll and clearAll methods
    - Full export and complete deletion
    - _Requirements: 7.3, 7.4_
  - [ ]* 10.4 Write property test for memory storage completeness
    - **Property 8: Memory Storage Completeness**
    - **Validates: Requirements 7.1**
  - [ ]* 10.5 Write property test for memory round-trip consistency
    - **Property 9: Memory Round-Trip Consistency**
    - **Validates: Requirements 7.5, 7.6**
  - [ ]* 10.6 Write property test for memory export completeness
    - **Property 10: Memory Export Completeness**
    - **Validates: Requirements 7.3**
  - [ ]* 10.7 Write property test for memory clear effectiveness
    - **Property 11: Memory Clear Effectiveness**
    - **Validates: Requirements 7.4**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: LLM Abstraction Layer

- [ ] 12. Implement LLM Provider abstraction
  - [ ] 12.1 Create LLMProvider interface and LLMAbstraction class
    - Define in src/llm/types.ts and src/llm/abstraction.ts
    - _Requirements: 8.1, 8.2_
  - [ ] 12.2 Implement OpenAI provider
    - Wrap OpenAI API calls
    - _Requirements: 8.2_
  - [ ] 12.3 Implement Mock provider for testing
    - Deterministic responses for tests
    - _Requirements: 8.2_
  - [ ] 12.4 Implement error wrapping and retry logic
    - Standardized error responses, exponential backoff
    - _Requirements: 8.3, 8.4_
  - [ ]* 12.5 Write property test for LLM response normalization
    - **Property 12: LLM Response Normalization**
    - **Validates: Requirements 8.2**
  - [ ]* 12.6 Write property test for LLM error wrapping
    - **Property 13: LLM Error Wrapping**
    - **Validates: Requirements 8.3**
  - [ ]* 12.7 Write property test for LLM request round-trip
    - **Property 14: LLM Request Round-Trip Consistency**
    - **Validates: Requirements 8.5, 8.6**

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Persona System

- [ ] 14. Implement Persona System
  - [ ] 14.1 Create Persona interface and default persona configuration
    - Define in src/core/persona/types.ts
    - Create default BotBot persona JSON
    - _Requirements: 9.3_
  - [ ] 14.2 Implement PersonaService class
    - getActive, setActive, getDefault, injectPersona methods
    - _Requirements: 9.1, 9.2, 9.3_
  - [ ] 14.3 Wire persona injection into message processing
    - Inject active persona into LLM requests
    - _Requirements: 9.2_
  - [ ]* 14.4 Write property test for persona injection preservation
    - **Property 15: Persona Injection Preservation**
    - **Validates: Requirements 9.2**
  - [ ]* 14.5 Write property test for persona switch memory preservation
    - **Property 16: Persona Switch Memory Preservation**
    - **Validates: Requirements 9.4**
  - [ ]* 14.6 Write property test for persona round-trip consistency
    - **Property 17: Persona Round-Trip Consistency**
    - **Validates: Requirements 9.5, 9.6**

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: Onboarding and User Recognition

- [ ] 16. Implement Onboarding System
  - [ ] 16.1 Create OnboardingService class
    - Detect new users, trigger onboarding flow
    - _Requirements: 10.1, 10.5_
  - [ ] 16.2 Implement onboarding conversation flow
    - Welcome message, capability explanation, preference collection
    - _Requirements: 10.2, 10.3_
  - [ ] 16.3 Store onboarding preferences in Memory Layer
    - Save preferred name and interests
    - _Requirements: 10.4_
  - [ ]* 16.4 Write property test for onboarding trigger
    - **Property 18: Onboarding Trigger for New Users**
    - **Validates: Requirements 10.1**
  - [ ]* 16.5 Write property test for onboarding preference storage
    - **Property 19: Onboarding Preference Storage**
    - **Validates: Requirements 10.4**
  - [ ]* 16.6 Write property test for onboarding completion state
    - **Property 20: Onboarding Completion State**
    - **Validates: Requirements 10.5**

- [ ] 17. Implement Returning User Recognition
  - [ ] 17.1 Create RecognitionService class
    - Retrieve user name and relevant memories
    - _Requirements: 11.1, 11.2_
  - [ ] 17.2 Integrate recognition into greeting generation
    - Include name and past details in greetings
    - _Requirements: 11.2, 11.3_
  - [ ]* 17.3 Write property test for returning user name retrieval
    - **Property 21: Returning User Name Retrieval**
    - **Validates: Requirements 11.1**
  - [ ]* 17.4 Write property test for returning user memory inclusion
    - **Property 22: Returning User Memory Inclusion**
    - **Validates: Requirements 11.2**

- [ ] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 8: Tool System

- [ ] 19. Implement Tool System framework
  - [ ] 19.1 Create Tool interface and ToolService class
    - Define in src/core/tools/types.ts
    - Implement registerTool, detectInvocation, execute
    - _Requirements: 12.1_
  - [ ] 19.2 Implement reminder tool
    - Create reminder records with time and message
    - _Requirements: 12.2_
  - [ ] 19.3 Implement reminder delivery scheduler
    - Check for due reminders, deliver to active platform
    - _Requirements: 12.3_
  - [ ] 19.4 Implement tool error handling
    - User-friendly error messages
    - _Requirements: 12.4_
  - [ ]* 19.5 Write property test for tool execution correctness
    - **Property 23: Tool Execution Correctness**
    - **Validates: Requirements 12.1**
  - [ ]* 19.6 Write property test for reminder creation completeness
    - **Property 24: Reminder Creation Completeness**
    - **Validates: Requirements 12.2**
  - [ ]* 19.7 Write property test for tool error user-friendliness
    - **Property 25: Tool Error User-Friendliness**
    - **Validates: Requirements 12.4**
  - [ ]* 19.8 Write property test for tool invocation round-trip
    - **Property 26: Tool Invocation Round-Trip Consistency**
    - **Validates: Requirements 12.5, 12.6**

- [ ] 20. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 9: Additional Platform Adapters

- [ ] 21. Implement Slack Adapter
  - [ ] 21.1 Create SlackAdapter class implementing PlatformAdapter
    - Socket mode connection, event handling
    - _Requirements: 4.1, 4.3_
  - [ ] 21.2 Implement normalizeEvent for Slack messages
    - Extract userId, channelId, workspaceId, content
    - _Requirements: 4.1_
  - [ ] 21.3 Implement formatResponse for Slack Block Kit
    - Transform RichContent to Block Kit format
    - _Requirements: 4.2_
  - [ ]* 21.4 Write property test for Slack event normalization
    - **Property 3: Platform Event Normalization Completeness** (Slack)
    - **Validates: Requirements 2.1, 4.1**
  - [ ]* 21.5 Write property test for Slack response transformation
    - **Property 4: Response Transformation Validity** (Slack)
    - **Validates: Requirements 2.2, 4.2**

- [ ] 22. Implement Web Chat Adapter
  - [ ] 22.1 Create WebChatAdapter class implementing PlatformAdapter
    - HTTP/WebSocket endpoint handling
    - _Requirements: 5.1, 5.3_
  - [ ] 22.2 Implement normalizeEvent for web chat messages
    - Extract sessionId, userId, content
    - _Requirements: 5.1_
  - [ ] 22.3 Implement formatResponse for HTML/markdown
    - Transform RichContent to web format
    - _Requirements: 5.2_
  - [ ] 22.4 Implement session ID generation
    - Unique session identifiers
    - _Requirements: 5.3_
  - [ ]* 22.5 Write property test for Web Chat event normalization
    - **Property 3: Platform Event Normalization Completeness** (Web)
    - **Validates: Requirements 2.1, 5.1**
  - [ ]* 22.6 Write property test for web session uniqueness
    - **Property 31: Web Session Uniqueness**
    - **Validates: Requirements 5.3**

- [ ] 23. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 10: Logging and Error Handling

- [ ] 24. Implement structured logging
  - [ ] 24.1 Create LoggingService with structured JSON output
    - Include userId, platformId, timestamp in all logs
    - Exclude secrets and sensitive data
    - _Requirements: 14.1, 14.2, 14.5_
  - [ ] 24.2 Integrate logging throughout message flow
    - Log message received, processed, sent events
    - _Requirements: 14.1, 14.2_
  - [ ]* 24.3 Write property test for log entry structure
    - **Property 28: Log Entry Structure**
    - **Validates: Requirements 14.1, 14.2**
  - [ ]* 24.4 Write property test for log entry JSON validity
    - **Property 29: Log Entry JSON Validity**
    - **Validates: Requirements 14.5**

- [ ] 25. Implement error handling strategy
  - [ ] 25.1 Create ErrorHandler class with graceful fallbacks
    - User-friendly messages for all error types
    - _Requirements: 14.3_
  - [ ] 25.2 Implement rate limit handling with backoff
    - Queue and retry with exponential backoff
    - _Requirements: 14.4_
  - [ ]* 25.3 Write property test for error handler graceful fallback
    - **Property 30: Error Handler Graceful Fallback**
    - **Validates: Requirements 14.3**
  - [ ]* 25.4 Write property test for configuration environment loading
    - **Property 27: Configuration Environment Loading**
    - **Validates: Requirements 13.5**

- [ ] 26. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 11: Integration and Polish

- [ ] 27. Wire all components together
  - [ ] 27.1 Update main entry point to use new architecture
    - Initialize CoreService, adapters, services
    - _Requirements: 1.1, 13.2_
  - [ ] 27.2 Implement full message flow integration
    - Connect adapters → core → memory → LLM → response
    - _Requirements: 1.1, 2.1, 2.2_
  - [ ]* 27.3 Write integration tests for end-to-end message flow
    - Test complete flow with mocked LLM
    - _Requirements: 1.1_

- [ ] 28. Update documentation
  - [ ] 28.1 Update README with new architecture and setup instructions
    - Quick start, environment variables, project structure
    - _Requirements: 13.2_
  - [ ] 28.2 Document API interfaces and extension points
    - How to add new adapters, tools, personas
    - _Requirements: 2.1, 12.1, 9.1_

- [ ] 29. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
