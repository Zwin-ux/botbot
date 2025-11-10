import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from '../../services/SessionManager.js';
import {
  IStorageProvider,
  ILLMProvider,
  EventEmitter,
  HookManager,
  EncounterGenerationResponse,
  createMockSession,
  createMockEncounterSpec,
  createMockPlayerContext,
} from '@ai-encounters/core';
import { DifficultyManager } from '@ai-encounters/difficulty-engine';
import { PlayerDataStorage } from '../../storage/PlayerDataStorage.js';

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockStorage: IStorageProvider;
  let mockLLMClient: ILLMProvider;
  let eventEmitter: EventEmitter;
  let hookManager: HookManager;
  let difficultyManager: DifficultyManager;
  let mockPlayerDataStorage: PlayerDataStorage;

  beforeEach(() => {
    // Create mock storage provider
    mockStorage = {
      name: 'mock-storage',
      initialize: vi.fn().mockResolvedValue(undefined),
      readSession: vi.fn().mockResolvedValue(null),
      writeSession: vi.fn().mockResolvedValue(undefined),
      deleteSession: vi.fn().mockResolvedValue(true),
      querySessions: vi.fn().mockResolvedValue([]),
      countSessions: vi.fn().mockResolvedValue(0),
      healthCheck: vi.fn().mockResolvedValue(true),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    // Create mock LLM provider
    const mockEncounter = createMockEncounterSpec();
    const mockLLMResponse: EncounterGenerationResponse = {
      encounter: mockEncounter,
      model: 'gpt-4',
      tokensUsed: 500,
      generationTime: 1500,
    };

    mockLLMClient = {
      name: 'mock-llm',
      version: '1.0.0',
      getCapabilities: vi.fn().mockReturnValue({
        supportsStreaming: false,
        supportsImages: false,
        supportsAudio: false,
        maxTokens: 4096,
        supportedModels: ['gpt-4'],
      }),
      initialize: vi.fn().mockResolvedValue(undefined),
      generateEncounter: vi.fn().mockResolvedValue(mockLLMResponse),
      healthCheck: vi.fn().mockResolvedValue({ available: true }),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    // Create real event emitter and hook manager
    eventEmitter = new EventEmitter();
    hookManager = new HookManager();

    // Create difficulty manager
    difficultyManager = new DifficultyManager();

    // Create mock player data storage
    mockPlayerDataStorage = {
      initialize: vi.fn().mockResolvedValue(undefined),
      savePlayerPerformance: vi.fn().mockResolvedValue(undefined),
      loadPlayerPerformance: vi.fn().mockResolvedValue(null),
      shutdown: vi.fn().mockResolvedValue(undefined),
    } as any;

    // Create session manager
    sessionManager = new SessionManager(
      mockStorage,
      mockLLMClient,
      eventEmitter,
      hookManager,
      difficultyManager,
      mockPlayerDataStorage
    );
  });

  describe('createSession', () => {
    it('should create a session with valid player ID', async () => {
      const playerId = 'player_123';
      const session = await sessionManager.createSession(playerId);

      expect(session).toBeDefined();
      expect(session.sessionId).toMatch(/^sess_[a-f0-9]{32}$/);
      expect(session.playerId).toBe(playerId);
      expect(session.encounter).toBeDefined();
      expect(session.state).toBeDefined();
      expect(session.state.currentObjectiveIndex).toBe(0);
      expect(session.state.objectivesCompleted).toEqual([]);
      expect(session.startedAt).toBeDefined();
      expect(session.completedAt).toBeUndefined();
    });

    it('should create a session with player context', async () => {
      const playerId = 'player_123';
      const playerContext = createMockPlayerContext({ playerId, level: 10 });
      
      const session = await sessionManager.createSession(playerId, playerContext);

      expect(session).toBeDefined();
      expect(session.playerId).toBe(playerId);
      expect(mockLLMClient.generateEncounter).toHaveBeenCalledWith(
        expect.objectContaining({
          playerContext: expect.objectContaining({ playerId, level: 10 }),
          difficulty: 'medium',
        })
      );
    });

    it('should call storage writeSession', async () => {
      const playerId = 'player_123';
      await sessionManager.createSession(playerId);

      expect(mockStorage.writeSession).toHaveBeenCalledTimes(1);
      expect(mockStorage.writeSession).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId,
          encounter: expect.any(Object),
          state: expect.any(Object),
        })
      );
    });

    it('should emit session events', async () => {
      const beforeCreateSpy = vi.fn();
      const createdSpy = vi.fn();

      eventEmitter.on('session:before-create', beforeCreateSpy);
      eventEmitter.on('session:created', createdSpy);

      const playerId = 'player_123';
      await sessionManager.createSession(playerId);

      expect(beforeCreateSpy).toHaveBeenCalledTimes(1);
      expect(createdSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSession', () => {
    it('should return session when it exists', async () => {
      const mockSession = createMockSession();
      mockStorage.readSession = vi.fn().mockResolvedValue(mockSession);

      const session = await sessionManager.getSession(mockSession.sessionId);

      expect(session).toEqual(mockSession);
      expect(mockStorage.readSession).toHaveBeenCalledWith(mockSession.sessionId);
    });

    it('should return null when session does not exist', async () => {
      mockStorage.readSession = vi.fn().mockResolvedValue(null);

      const session = await sessionManager.getSession('nonexistent_session');

      expect(session).toBeNull();
    });
  });

  describe('updateObjective', () => {
    it('should update objective and mark it as completed', async () => {
      const mockSession = createMockSession({
        sessionId: 'sess_123',
        encounter: createMockEncounterSpec({
          objectives: [
            { id: 'obj_1', description: 'First objective', type: 'collect', completed: false },
            { id: 'obj_2', description: 'Second objective', type: 'interact', completed: false },
          ],
        }),
        state: {
          currentObjectiveIndex: 0,
          objectivesCompleted: [],
          npcInteractions: {},
        },
      });

      mockStorage.readSession = vi.fn().mockResolvedValue(mockSession);

      const updatedSession = await sessionManager.updateObjective('sess_123', 'obj_1');

      expect(updatedSession.encounter.objectives[0].completed).toBe(true);
      expect(updatedSession.state.objectivesCompleted).toContain('obj_1');
      expect(mockStorage.writeSession).toHaveBeenCalledWith(updatedSession);
    });

    it('should advance current objective index', async () => {
      const mockSession = createMockSession({
        encounter: createMockEncounterSpec({
          objectives: [
            { id: 'obj_1', description: 'First', type: 'collect', completed: false },
            { id: 'obj_2', description: 'Second', type: 'interact', completed: false },
          ],
        }),
        state: {
          currentObjectiveIndex: 0,
          objectivesCompleted: [],
          npcInteractions: {},
        },
      });

      mockStorage.readSession = vi.fn().mockResolvedValue(mockSession);

      const updatedSession = await sessionManager.updateObjective(mockSession.sessionId, 'obj_1');

      expect(updatedSession.state.currentObjectiveIndex).toBe(1);
    });

    it('should throw error when session not found', async () => {
      mockStorage.readSession = vi.fn().mockResolvedValue(null);

      await expect(
        sessionManager.updateObjective('nonexistent', 'obj_1')
      ).rejects.toThrow('Session not found');
    });

    it('should throw error when session is already completed', async () => {
      const completedSession = createMockSession({
        completedAt: new Date().toISOString(),
      });

      mockStorage.readSession = vi.fn().mockResolvedValue(completedSession);

      await expect(
        sessionManager.updateObjective(completedSession.sessionId, 'obj_1')
      ).rejects.toThrow('Session already completed');
    });

    it('should throw error when objective not found', async () => {
      const mockSession = createMockSession();
      mockStorage.readSession = vi.fn().mockResolvedValue(mockSession);

      await expect(
        sessionManager.updateObjective(mockSession.sessionId, 'nonexistent_obj')
      ).rejects.toThrow('Objective not found');
    });
  });

  describe('completeSession', () => {
    it('should mark session as completed', async () => {
      const mockSession = createMockSession({
        sessionId: 'sess_123',
        startedAt: new Date('2025-01-01T10:00:00Z').toISOString(),
      });

      mockStorage.readSession = vi.fn().mockResolvedValue(mockSession);

      const completedSession = await sessionManager.completeSession('sess_123');

      expect(completedSession.completedAt).toBeDefined();
      expect(new Date(completedSession.completedAt!).getTime()).toBeGreaterThan(
        new Date(completedSession.startedAt).getTime()
      );
      expect(mockStorage.writeSession).toHaveBeenCalledWith(completedSession);
    });

    it('should throw error when session not found', async () => {
      mockStorage.readSession = vi.fn().mockResolvedValue(null);

      await expect(
        sessionManager.completeSession('nonexistent')
      ).rejects.toThrow('Session not found');
    });

    it('should throw error when session is already completed', async () => {
      const completedSession = createMockSession({
        completedAt: new Date().toISOString(),
      });

      mockStorage.readSession = vi.fn().mockResolvedValue(completedSession);

      await expect(
        sessionManager.completeSession(completedSession.sessionId)
      ).rejects.toThrow('Session already completed');
    });

    it('should emit completion events', async () => {
      const beforeCompleteSpy = vi.fn();
      const completedSpy = vi.fn();

      eventEmitter.on('session:before-complete', beforeCompleteSpy);
      eventEmitter.on('session:completed', completedSpy);

      const mockSession = createMockSession();
      mockStorage.readSession = vi.fn().mockResolvedValue(mockSession);

      await sessionManager.completeSession(mockSession.sessionId);

      expect(beforeCompleteSpy).toHaveBeenCalledTimes(1);
      expect(completedSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('session state management', () => {
    it('should maintain state consistency across operations', async () => {
      const mockSession = createMockSession({
        encounter: createMockEncounterSpec({
          objectives: [
            { id: 'obj_1', description: 'First', type: 'collect', completed: false },
            { id: 'obj_2', description: 'Second', type: 'interact', completed: false },
            { id: 'obj_3', description: 'Third', type: 'eliminate', completed: false },
          ],
        }),
        state: {
          currentObjectiveIndex: 0,
          objectivesCompleted: [],
          npcInteractions: {},
        },
      });

      mockStorage.readSession = vi.fn().mockResolvedValue(mockSession);

      // Complete first objective
      let updated = await sessionManager.updateObjective(mockSession.sessionId, 'obj_1');
      expect(updated.state.objectivesCompleted).toEqual(['obj_1']);
      expect(updated.state.currentObjectiveIndex).toBe(1);

      // Update mock to return updated session
      mockStorage.readSession = vi.fn().mockResolvedValue(updated);

      // Complete second objective
      updated = await sessionManager.updateObjective(mockSession.sessionId, 'obj_2');
      expect(updated.state.objectivesCompleted).toEqual(['obj_1', 'obj_2']);
      expect(updated.state.currentObjectiveIndex).toBe(2);
    });
  });
});
