/**
 * Memory Layer Types
 * Interfaces for persistent memory storage and retrieval
 */

/**
 * Source of a memory entry
 */
export type MemorySource = 'conversation' | 'onboarding' | 'explicit';

/**
 * A stored memory entry
 */
export interface Memory {
  id: string;
  userId: string;
  content: string;
  tags: string[];
  timestamp: Date;
  source: MemorySource;
}

/**
 * Memory Layer Interface
 * All memory implementations must implement this interface
 */
export interface MemoryLayer {
  /** Store a new memory for a user */
  store(userId: string, content: string, tags: string[], source?: MemorySource): Promise<Memory>;

  /** Retrieve relevant memories based on context */
  retrieve(userId: string, context: string, limit?: number): Promise<Memory[]>;

  /** Export all memories for a user */
  exportAll(userId: string): Promise<Memory[]>;

  /** Clear all memories for a user */
  clearAll(userId: string): Promise<void>;
}

/**
 * Vector entry for semantic search
 */
export interface VectorEntry {
  id: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Vector store interface for semantic memory search
 */
export interface VectorStore {
  upsert(entry: Omit<VectorEntry, 'embedding' | 'timestamp'>): Promise<void>;
  search(query: string, topK: number): Promise<VectorEntry[]>;
}
