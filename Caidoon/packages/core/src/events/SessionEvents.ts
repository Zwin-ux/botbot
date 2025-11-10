import { Session } from '../types/session.js';
import { PlayerContext } from '../types/player.js';
import { EncounterSpec } from '../types/encounter.js';

/**
 * Session lifecycle events
 * These events are emitted during session operations
 */

export enum SessionEvent {
  // Session creation events
  BEFORE_CREATE = 'session:before-create',
  CREATED = 'session:created',

  // Session retrieval events
  BEFORE_LOAD = 'session:before-load',
  LOADED = 'session:loaded',

  // Objective update events
  BEFORE_OBJECTIVE_UPDATE = 'session:before-objective-update',
  OBJECTIVE_UPDATED = 'session:objective-updated',

  // Session completion events
  BEFORE_COMPLETE = 'session:before-complete',
  COMPLETED = 'session:completed',

  // Session deletion events
  BEFORE_DELETE = 'session:before-delete',
  DELETED = 'session:deleted',

  // Encounter generation events
  BEFORE_ENCOUNTER_GENERATE = 'encounter:before-generate',
  ENCOUNTER_GENERATED = 'encounter:generated',

  // Storage events
  BEFORE_STORAGE_WRITE = 'storage:before-write',
  STORAGE_WRITTEN = 'storage:written',
  BEFORE_STORAGE_READ = 'storage:before-read',
  STORAGE_READ = 'storage:read',

  // LLM events
  BEFORE_LLM_REQUEST = 'llm:before-request',
  LLM_RESPONSE = 'llm:response',
  LLM_ERROR = 'llm:error',

  // Error events
  SESSION_ERROR = 'session:error',
}

/**
 * Event data types
 */

export interface SessionBeforeCreateData {
  playerId: string;
  playerContext?: PlayerContext;
}

export interface SessionCreatedData {
  session: Session;
  durationMs: number;
}

export interface SessionBeforeLoadData {
  sessionId: string;
}

export interface SessionLoadedData {
  session: Session;
  fromCache: boolean;
}

export interface ObjectiveBeforeUpdateData {
  sessionId: string;
  objectiveId: string;
  session: Session;
}

export interface ObjectiveUpdatedData {
  sessionId: string;
  objectiveId: string;
  session: Session;
}

export interface SessionBeforeCompleteData {
  sessionId: string;
  session: Session;
}

export interface SessionCompletedData {
  session: Session;
  totalDurationMs: number;
}

export interface SessionBeforeDeleteData {
  sessionId: string;
}

export interface SessionDeletedData {
  sessionId: string;
}

export interface EncounterBeforeGenerateData {
  playerId: string;
  playerContext?: PlayerContext;
  difficulty?: 'easy' | 'medium' | 'hard';
  theme?: string;
}

export interface EncounterGeneratedData {
  encounter: EncounterSpec;
  playerId: string;
  generationTimeMs: number;
}

export interface StorageBeforeWriteData {
  session: Session;
}

export interface StorageWrittenData {
  session: Session;
  writeTimeMs: number;
}

export interface StorageBeforeReadData {
  sessionId: string;
}

export interface StorageReadData {
  session: Session | null;
  readTimeMs: number;
}

export interface LLMBeforeRequestData {
  provider: string;
  request: any;
}

export interface LLMResponseData {
  provider: string;
  response: any;
  durationMs: number;
  tokensUsed?: number;
}

export interface LLMErrorData {
  provider: string;
  error: Error;
  request: any;
}

export interface SessionErrorData {
  sessionId?: string;
  error: Error;
  operation: string;
}
