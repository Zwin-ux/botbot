import { Session } from '../types/session.js';

/**
 * Query options for filtering and pagination
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'completedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Query filters for session search
 */
export interface SessionFilter {
  playerId?: string;
  completed?: boolean;
  startedAfter?: Date;
  startedBefore?: Date;
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Storage provider interface that all storage implementations must follow
 * Enables pluggable storage backends (file, PostgreSQL, MongoDB, Redis, etc.)
 */
export interface IStorageProvider {
  /**
   * Unique name of the storage provider
   */
  readonly name: string;

  /**
   * Initialize the storage provider
   * Called once during server startup
   */
  initialize(): Promise<void>;

  /**
   * Read a session by ID
   * Returns null if session not found
   */
  readSession(sessionId: string): Promise<Session | null>;

  /**
   * Write/update a session
   * Creates new session if it doesn't exist, updates if it does
   */
  writeSession(session: Session): Promise<void>;

  /**
   * Delete a session by ID
   * Returns true if deleted, false if not found
   */
  deleteSession(sessionId: string): Promise<boolean>;

  /**
   * Query sessions with filters and pagination
   * Returns array of matching sessions
   */
  querySessions(filter: SessionFilter, options?: QueryOptions): Promise<Session[]>;

  /**
   * Count sessions matching filter
   * Useful for pagination
   */
  countSessions(filter: SessionFilter): Promise<number>;

  /**
   * Check if storage provider is healthy and accessible
   */
  healthCheck(): Promise<boolean>;

  /**
   * Cleanup and close connections
   * Called during server shutdown
   */
  shutdown(): Promise<void>;
}
