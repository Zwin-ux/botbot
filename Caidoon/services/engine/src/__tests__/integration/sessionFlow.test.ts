import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { EventEmitter, HookManager, createMockEncounterSpec, cleanupTestData } from '@ai-encounters/core';
import { DifficultyManager } from '@ai-encounters/difficulty-engine';
import { FileStorage } from '../../storage/FileStorage.js';
import { PlayerDataStorage } from '../../storage/PlayerDataStorage.js';
import { SessionManager } from '../../services/SessionManager.js';
import { createSessionRoutes } from '../../routes/sessions.js';
import path from 'path';
import fs from 'fs/promises';

describe('Session Flow Integration Tests', () => {
  let app: Express;
  const testDataDir = path.join(process.cwd(), 'test-data', 'integration-sessions');

  beforeAll(async () => {
    // Set test environment variables
    process.env.DATA_DIR = testDataDir;
    process.env.AE_HMAC_SECRET = 'test-hmac-secret';
    process.env.PORT = '0'; // Random port

    // Create test data directory
    await fs.mkdir(path.join(testDataDir, 'sessions'), { recursive: true });

    // Create Express app with mocked dependencies
    app = express();
    app.use(express.json({ limit: '1mb' }));

    // Initialize event emitter and hook manager
    const events = new EventEmitter();
    const hooks = new HookManager();

    // Initialize storage
    const storage = new FileStorage(testDataDir);
    await storage.initialize();

    // Initialize player data storage
    const playerDataStorage = new PlayerDataStorage(testDataDir);
    await playerDataStorage.initialize();

    // Create mock LLM client
    const mockLLMClient = {
      name: 'mock-llm',
      version: '1.0.0',
      getCapabilities: () => ({
        supportsStreaming: false,
        supportsImages: false,
        supportsAudio: false,
        maxTokens: 4096,
        supportedModels: ['gpt-4'],
      }),
      initialize: async () => {},
      generateEncounter: async () => ({
        encounter: createMockEncounterSpec(),
        model: 'gpt-4',
        tokensUsed: 500,
        generationTime: 1500,
      }),
      healthCheck: async () => ({ available: true }),
      shutdown: async () => {},
    };

    // Initialize difficulty manager
    const difficultyManager = new DifficultyManager();

    // Initialize session manager
    const sessionManager = new SessionManager(
      storage,
      mockLLMClient as any,
      events,
      hooks,
      difficultyManager,
      playerDataStorage
    );

    // Health check endpoint
    app.get('/health', async (req, res) => {
      res.json({ status: 'ok' });
    });

    // Session routes
    app.use('/session', createSessionRoutes(sessionManager));
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData(testDataDir);
  });

  beforeEach(() => {
    // Clear any mocks before each test
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up session files after each test
    try {
      const sessionsDir = path.join(testDataDir, 'sessions');
      const files = await fs.readdir(sessionsDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(sessionsDir, file)).catch(() => {}))
      );
    } catch (error) {
      // Ignore errors if directory doesn't exist
    }
  });

  describe('Complete Session Lifecycle', () => {
    it('should complete full session flow: start -> update objective -> complete', async () => {
      // Step 1: Start a new session
      const startResponse = await request(app)
        .post('/session/start')
        .send({
          playerId: 'test_player_001',
          playerContext: {
            playerId: 'test_player_001',
            level: 5,
            preferences: ['combat', 'exploration']
          }
        })
        .expect(201);

      expect(startResponse.body).toBeDefined();
      expect(startResponse.body.sessionId).toMatch(/^sess_[a-f0-9]{32}$/);
      expect(startResponse.body.playerId).toBe('test_player_001');
      expect(startResponse.body.encounter).toBeDefined();
      expect(startResponse.body.encounter.objectives).toBeDefined();
      expect(startResponse.body.encounter.objectives.length).toBeGreaterThan(0);
      expect(startResponse.body.state).toBeDefined();
      expect(startResponse.body.state.currentObjectiveIndex).toBe(0);
      expect(startResponse.body.startedAt).toBeDefined();
      expect(startResponse.body.completedAt).toBeUndefined();

      const sessionId = startResponse.body.sessionId;
      const firstObjectiveId = startResponse.body.encounter.objectives[0].id;

      // Step 2: Get the session to verify it was created
      const getResponse = await request(app)
        .get(`/session/${sessionId}`)
        .expect(200);

      expect(getResponse.body.sessionId).toBe(sessionId);
      expect(getResponse.body.playerId).toBe('test_player_001');

      // Step 3: Update the first objective
      const updateResponse = await request(app)
        .patch(`/session/${sessionId}/objective/${firstObjectiveId}`)
        .expect(200);

      expect(updateResponse.body.sessionId).toBe(sessionId);
      expect(updateResponse.body.encounter.objectives[0].completed).toBe(true);
      expect(updateResponse.body.state.objectivesCompleted).toContain(firstObjectiveId);
      expect(updateResponse.body.state.currentObjectiveIndex).toBeGreaterThanOrEqual(1);

      // Step 4: Complete the session
      const completeResponse = await request(app)
        .post(`/session/${sessionId}/complete`)
        .expect(200);

      expect(completeResponse.body.sessionId).toBe(sessionId);
      expect(completeResponse.body.completedAt).toBeDefined();
      expect(new Date(completeResponse.body.completedAt).getTime()).toBeGreaterThan(
        new Date(completeResponse.body.startedAt).getTime()
      );

      // Step 5: Verify data persists to storage
      const sessionFilePath = path.join(testDataDir, 'sessions', `${sessionId}.json`);
      const fileExists = await fs.access(sessionFilePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      const fileContent = await fs.readFile(sessionFilePath, 'utf-8');
      const persistedSession = JSON.parse(fileContent);
      expect(persistedSession.sessionId).toBe(sessionId);
      expect(persistedSession.completedAt).toBeDefined();
      expect(persistedSession.encounter.objectives[0].completed).toBe(true);
    });

    it('should handle multiple objective updates', async () => {
      // Start session
      const startResponse = await request(app)
        .post('/session/start')
        .send({
          playerId: 'test_player_002',
          playerContext: {
            playerId: 'test_player_002',
            level: 10
          }
        })
        .expect(201);

      const sessionId = startResponse.body.sessionId;
      const objectives = startResponse.body.encounter.objectives;

      // Update multiple objectives
      for (let i = 0; i < Math.min(2, objectives.length); i++) {
        const objectiveId = objectives[i].id;
        const updateResponse = await request(app)
          .patch(`/session/${sessionId}/objective/${objectiveId}`)
          .expect(200);

        expect(updateResponse.body.encounter.objectives[i].completed).toBe(true);
        expect(updateResponse.body.state.objectivesCompleted).toContain(objectiveId);
      }

      // Verify final state
      const getResponse = await request(app)
        .get(`/session/${sessionId}`)
        .expect(200);

      const completedCount = getResponse.body.state.objectivesCompleted.length;
      expect(completedCount).toBe(Math.min(2, objectives.length));
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/session/nonexistent_session_id')
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when updating objective for non-existent session', async () => {
      const response = await request(app)
        .patch('/session/nonexistent_session_id/objective/obj_1')
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when completing non-existent session', async () => {
      const response = await request(app)
        .post('/session/nonexistent_session_id/complete')
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 when updating objective for already completed session', async () => {
      // Start and complete a session
      const startResponse = await request(app)
        .post('/session/start')
        .send({
          playerId: 'test_player_003'
        })
        .expect(201);

      const sessionId = startResponse.body.sessionId;
      const objectiveId = startResponse.body.encounter.objectives[0].id;

      await request(app)
        .post(`/session/${sessionId}/complete`)
        .expect(200);

      // Try to update objective after completion
      const response = await request(app)
        .patch(`/session/${sessionId}/objective/${objectiveId}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_STATE');
    });

    it('should return 400 when completing already completed session', async () => {
      // Start and complete a session
      const startResponse = await request(app)
        .post('/session/start')
        .send({
          playerId: 'test_player_004'
        })
        .expect(201);

      const sessionId = startResponse.body.sessionId;

      await request(app)
        .post(`/session/${sessionId}/complete`)
        .expect(200);

      // Try to complete again
      const response = await request(app)
        .post(`/session/${sessionId}/complete`)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_STATE');
    });

    it('should return 404 when updating non-existent objective', async () => {
      // Start session
      const startResponse = await request(app)
        .post('/session/start')
        .send({
          playerId: 'test_player_005'
        })
        .expect(201);

      const sessionId = startResponse.body.sessionId;

      // Try to update non-existent objective
      const response = await request(app)
        .patch(`/session/${sessionId}/objective/nonexistent_objective`)
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should validate request body for session start', async () => {
      // Missing playerId
      const response = await request(app)
        .post('/session/start')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle session start with minimal data', async () => {
      const response = await request(app)
        .post('/session/start')
        .send({
          playerId: 'test_player_minimal'
        })
        .expect(201);

      expect(response.body.sessionId).toBeDefined();
      expect(response.body.playerId).toBe('test_player_minimal');
      expect(response.body.encounter).toBeDefined();
    });
  });
});
