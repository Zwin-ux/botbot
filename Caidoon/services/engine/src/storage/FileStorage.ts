import { Session, IStorageProvider, SessionFilter, QueryOptions } from '@ai-encounters/core';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

interface CacheEntry {
  session: Session;
  lastAccessed: number;
}

/**
 * File-based storage provider implementation
 * Stores sessions as JSON files with LRU caching
 */
export class FileStorage implements IStorageProvider {
  public readonly name = 'file-storage';

  private cache: Map<string, CacheEntry> = new Map();
  private readonly maxCacheSize = 1000;
  private readonly dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || config.dataDir;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(path.join(this.dataDir, 'sessions'), { recursive: true });
      console.log(`Data directory initialized at ${this.dataDir}`);
    } catch (error) {
      console.error('Failed to initialize data directory:', error);
      throw error;
    }
  }

  async writeSession(session: Session): Promise<void> {
    // Update cache
    this.cache.set(session.sessionId, {
      session,
      lastAccessed: Date.now(),
    });

    // Evict old entries if cache is too large
    this.evictLRU();

    // Write to file if session is completed
    if (session.completedAt) {
      const filePath = this.getSessionFilePath(session.sessionId);
      try {
        await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
      } catch (error) {
        console.error(`Failed to write session ${session.sessionId}:`, error);
        throw error;
      }
    }
  }

  async readSession(sessionId: string): Promise<Session | null> {
    // Check cache first
    const cached = this.cache.get(sessionId);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.session;
    }

    // Try to read from file
    const filePath = this.getSessionFilePath(sessionId);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const session = JSON.parse(data) as Session;
      
      // Add to cache
      this.cache.set(sessionId, {
        session,
        lastAccessed: Date.now(),
      });
      
      return session;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      console.error(`Failed to read session ${sessionId}:`, error);
      throw error;
    }
  }

  getSession(sessionId: string): Session | null {
    const cached = this.cache.get(sessionId);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.session;
    }
    return null;
  }

  private getSessionFilePath(sessionId: string): string {
    return path.join(this.dataDir, 'sessions', `${sessionId}.json`);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    // Remove from cache
    this.cache.delete(sessionId);

    // Try to delete file
    const filePath = this.getSessionFilePath(sessionId);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false; // File didn't exist
      }
      console.error(`Failed to delete session ${sessionId}:`, error);
      throw error;
    }
  }

  async querySessions(filter: SessionFilter, options?: QueryOptions): Promise<Session[]> {
    const sessionsDir = path.join(this.dataDir, 'sessions');
    const sessions: Session[] = [];

    try {
      const files = await fs.readdir(sessionsDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const sessionId = file.replace('.json', '');
        const session = await this.readSession(sessionId);

        if (!session) continue;

        // Apply filters
        if (filter.playerId && session.playerId !== filter.playerId) continue;
        if (filter.completed !== undefined && !!session.completedAt !== filter.completed) continue;
        if (filter.startedAfter && new Date(session.startedAt) < filter.startedAfter) continue;
        if (filter.startedBefore && new Date(session.startedAt) > filter.startedBefore) continue;
        if (filter.difficulty && session.encounter.difficulty !== filter.difficulty) continue;

        sessions.push(session);
      }

      // Sort sessions
      const sortBy = options?.sortBy || 'createdAt';
      const sortOrder = options?.sortOrder || 'desc';

      sessions.sort((a, b) => {
        let aValue = 0;
        let bValue = 0;

        if (sortBy === 'createdAt') {
          // Map 'createdAt' to 'startedAt' since that's what Session has
          aValue = new Date(a.startedAt).getTime();
          bValue = new Date(b.startedAt).getTime();
        } else if (sortBy === 'completedAt') {
          aValue = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          bValue = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        } else if (sortBy === 'updatedAt') {
          // updatedAt doesn't exist in Session, use completedAt or startedAt
          aValue = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.startedAt).getTime();
          bValue = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.startedAt).getTime();
        }

        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });

      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit;

      return limit ? sessions.slice(offset, offset + limit) : sessions.slice(offset);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return []; // Sessions directory doesn't exist yet
      }
      console.error('Failed to query sessions:', error);
      throw error;
    }
  }

  async countSessions(filter: SessionFilter): Promise<number> {
    const sessions = await this.querySessions(filter);
    return sessions.length;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if data directory is accessible
      await fs.access(this.dataDir);

      // Check if we can write a test file
      const testPath = path.join(this.dataDir, '.health-check');
      await fs.writeFile(testPath, 'ok', 'utf-8');
      await fs.unlink(testPath);

      return true;
    } catch (error) {
      console.error('FileStorage health check failed:', error);
      return false;
    }
  }

  async shutdown(): Promise<void> {
    // Clear cache
    this.cache.clear();
    console.log('FileStorage shutdown complete');
  }

  private evictLRU(): void {
    if (this.cache.size <= this.maxCacheSize) {
      return;
    }

    // Find the least recently used entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}
