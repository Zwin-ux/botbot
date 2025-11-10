import {
  Session,
  SessionState,
  PlayerContext,
  EventEmitter,
  HookManager,
  SessionEvent,
  StandardHooks,
  SessionBeforeCreateData,
  SessionCreatedData,
  SessionLoadedData,
  ObjectiveBeforeUpdateData,
  ObjectiveUpdatedData,
  SessionBeforeCompleteData,
  SessionCompletedData,
  EncounterBeforeGenerateData,
  EncounterGeneratedData,
  IStorageProvider,
  ILLMProvider,
} from '@ai-encounters/core';
import { DifficultyManager, EncounterResult } from '@ai-encounters/difficulty-engine';
import { randomBytes } from 'crypto';
import { PlayerDataStorage } from '../storage/PlayerDataStorage.js';
import { logger } from '../server.js';

export class SessionManager {
  private storage: IStorageProvider;
  private llmClient: ILLMProvider;
  private events: EventEmitter;
  private hooks: HookManager;
  private difficultyManager: DifficultyManager;
  private playerDataStorage: PlayerDataStorage;

  constructor(
    storage: IStorageProvider,
    llmClient: ILLMProvider,
    events: EventEmitter,
    hooks: HookManager,
    difficultyManager: DifficultyManager,
    playerDataStorage: PlayerDataStorage
  ) {
    this.storage = storage;
    this.llmClient = llmClient;
    this.events = events;
    this.hooks = hooks;
    this.difficultyManager = difficultyManager;
    this.playerDataStorage = playerDataStorage;
  }

  async createSession(
    playerId: string,
    playerContext?: PlayerContext
  ): Promise<Session> {
    const startTime = Date.now();

    // Emit before-create event
    await this.events.emit<SessionBeforeCreateData>(SessionEvent.BEFORE_CREATE, {
      playerId,
      playerContext,
    });

    // Run before-create hook (allows modification of context)
    const hookData = await this.hooks.trigger(StandardHooks.BEFORE_CREATE_SESSION, {
      playerId,
      playerContext,
    });

    // Generate unique session ID
    const sessionId = this.generateSessionId();

    // Load player performance history and calculate adjusted difficulty
    const playerPerformance = await this.playerDataStorage.loadPlayerPerformance(hookData.playerId);
    if (playerPerformance) {
      this.difficultyManager.importPerformance(playerPerformance);
    }

    const difficultyAdjustment = this.difficultyManager.calculateDifficulty(hookData.playerId, 0.5);
    
    // Log difficulty adjustment with reasoning
    logger.info({
      playerId: hookData.playerId,
      sessionId,
      previousDifficulty: difficultyAdjustment.previousDifficulty,
      newDifficulty: difficultyAdjustment.newDifficulty,
      adjustment: difficultyAdjustment.adjustment,
      reason: difficultyAdjustment.reason,
      metrics: difficultyAdjustment.metrics,
    }, 'Difficulty calculated for new session');

    // Emit before encounter generation
    await this.events.emit<EncounterBeforeGenerateData>(SessionEvent.BEFORE_ENCOUNTER_GENERATE, {
      playerId: hookData.playerId,
      playerContext: hookData.playerContext,
      difficulty: 'medium',
    });

    // Generate encounter using LLM provider with adjusted difficulty
    const encounterStartTime = Date.now();
    const encounterResponse = await this.llmClient.generateEncounter({
      playerContext: hookData.playerContext || { playerId: hookData.playerId },
      difficulty: 'medium',
      difficultyLevel: difficultyAdjustment.newDifficulty,
    });

    let encounter = encounterResponse.encounter;

    // Emit encounter generated event
    await this.events.emit<EncounterGeneratedData>(SessionEvent.ENCOUNTER_GENERATED, {
      encounter,
      playerId: hookData.playerId,
      generationTimeMs: encounterResponse.generationTime || (Date.now() - encounterStartTime),
    });

    // Run transform-encounter hook (allows plugins to modify encounter)
    encounter = await this.hooks.trigger(StandardHooks.TRANSFORM_ENCOUNTER, encounter);

    // Initialize session state
    const state: SessionState = {
      currentObjectiveIndex: 0,
      objectivesCompleted: [],
      npcInteractions: {},
    };

    // Create session object
    let session: Session = {
      sessionId,
      playerId: hookData.playerId,
      encounter,
      state,
      startedAt: new Date().toISOString(),
    };

    // Run after-create hook (allows plugins to add session metadata)
    session = await this.hooks.trigger(StandardHooks.AFTER_CREATE_SESSION, session);

    // Store session
    await this.storage.writeSession(session);

    // Emit session created event
    await this.events.emit<SessionCreatedData>(SessionEvent.CREATED, {
      session,
      durationMs: Date.now() - startTime,
    });

    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    // Emit before-load event
    await this.events.emit(SessionEvent.BEFORE_LOAD, { sessionId });

    // Read session (storage provider handles caching internally)
    let session = await this.storage.readSession(sessionId);

    if (session) {
      // Run after-load hook
      session = await this.hooks.trigger(StandardHooks.AFTER_LOAD_SESSION, session);

      // Emit loaded event
      await this.events.emit<SessionLoadedData>(SessionEvent.LOADED, {
        session,
        fromCache: false, // Storage provider handles caching, we don't track it here
      });
    }

    return session;
  }

  async updateObjective(
    sessionId: string,
    objectiveId: string
  ): Promise<Session> {
    let session = await this.getSession(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.completedAt) {
      throw new Error(`Session already completed: ${sessionId}`);
    }

    // Find the objective
    const objectiveIndex = session.encounter.objectives.findIndex(
      (obj) => obj.id === objectiveId
    );

    if (objectiveIndex === -1) {
      throw new Error(`Objective not found: ${objectiveId}`);
    }

    // Emit before update event
    await this.events.emit<ObjectiveBeforeUpdateData>(SessionEvent.BEFORE_OBJECTIVE_UPDATE, {
      sessionId,
      objectiveId,
      session,
    });

    // Run before-update hook
    session = await this.hooks.trigger(StandardHooks.BEFORE_UPDATE_OBJECTIVE, session);

    // Mark objective as completed
    session.encounter.objectives[objectiveIndex].completed = true;

    // Update state
    if (!session.state.objectivesCompleted.includes(objectiveId)) {
      session.state.objectivesCompleted.push(objectiveId);
    }

    // Update current objective index if this was the current objective
    if (objectiveIndex === session.state.currentObjectiveIndex) {
      // Move to next incomplete objective
      const nextIncomplete = session.encounter.objectives.findIndex(
        (obj, idx) => idx > objectiveIndex && !obj.completed
      );
      session.state.currentObjectiveIndex =
        nextIncomplete !== -1 ? nextIncomplete : session.encounter.objectives.length;
    }

    // Run after-update hook
    session = await this.hooks.trigger(StandardHooks.AFTER_UPDATE_OBJECTIVE, session);

    // Save updated session
    await this.storage.writeSession(session);

    // Emit updated event
    await this.events.emit<ObjectiveUpdatedData>(SessionEvent.OBJECTIVE_UPDATED, {
      sessionId,
      objectiveId,
      session,
    });

    return session;
  }

  async completeSession(sessionId: string): Promise<Session> {
    let session = await this.getSession(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.completedAt) {
      throw new Error(`Session already completed: ${sessionId}`);
    }

    // Emit before complete event
    await this.events.emit<SessionBeforeCompleteData>(SessionEvent.BEFORE_COMPLETE, {
      sessionId,
      session,
    });

    // Run before-complete hook
    session = await this.hooks.trigger(StandardHooks.BEFORE_COMPLETE_SESSION, session);

    // Mark session as completed
    session.completedAt = new Date().toISOString();

    // Calculate total duration
    const startTime = new Date(session.startedAt).getTime();
    const endTime = new Date(session.completedAt).getTime();
    const totalDurationMs = endTime - startTime;

    // Record player performance for difficulty adjustment
    const objectivesCompleted = session.state.objectivesCompleted.length;
    const totalObjectives = session.encounter.objectives.length;
    const success = objectivesCompleted === totalObjectives;

    const encounterResult: EncounterResult = {
      encounterId: session.encounter.id || sessionId,
      success,
      completionTime: Math.floor(totalDurationMs / 1000), // Convert to seconds
      objectivesCompleted,
      totalObjectives,
      timestamp: new Date(),
      baseDifficulty: 0.5, // Default base difficulty
    };

    this.difficultyManager.recordPerformance(session.playerId, encounterResult);

    // Save updated player performance to storage
    const updatedPerformance = this.difficultyManager.exportPerformance(session.playerId);
    if (updatedPerformance) {
      await this.playerDataStorage.savePlayerPerformance(updatedPerformance);
      
      logger.info({
        playerId: session.playerId,
        sessionId,
        success,
        completionTime: encounterResult.completionTime,
        objectivesCompleted,
        totalObjectives,
        currentDifficulty: updatedPerformance.currentDifficulty,
      }, 'Player performance recorded');
    }

    // Run after-complete hook
    session = await this.hooks.trigger(StandardHooks.AFTER_COMPLETE_SESSION, session);

    // Persist to file
    await this.storage.writeSession(session);

    // Emit completed event
    await this.events.emit<SessionCompletedData>(SessionEvent.COMPLETED, {
      session,
      totalDurationMs,
    });

    return session;
  }

  private generateSessionId(): string {
    return `sess_${randomBytes(16).toString('hex')}`;
  }
}
