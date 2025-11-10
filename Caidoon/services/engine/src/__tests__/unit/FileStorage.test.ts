import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileStorage } from '../../storage/FileStorage.js';
import { createMockSession } from '@ai-encounters/core';
import fs from 'fs/promises';
import path from 'path';

describe('FileStorage', () => {
  let storage: FileStorage;
  const testDataDir = './test-data/file-storage-test';

  beforeEach(async () => {
    storage = new FileStorage(testDataDir);
    await storage.initialize();
  });

  afterEach(async () => {
    await storage.shutdown();
    // Clean up test data directory
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if directory doesn't exist
    }
  });

  describe('initialize', () => {
    it('should create data directory if it does not exist', async () => {
      const newStorage = new FileStorage('./test-data/new-storage');
      await newStorage.initialize();

      const stats = await fs.stat('./test-data/new-storage/sessions');
      expect(stats.isDirectory()).toBe(true);

      await newStorage.shutdown();
      await fs.rm('./test-data/new-storage', { recursive: true, force: true });
    });
  });

  describe('writeSession', () => {
    it('should write completed session to file', async () => {
      const session = createMockSession({
        sessionId: 'sess_write_test',
        completedAt: new Date().toISOString(),
      });

      await storage.writeSession(session);

      const filePath = path.join(testDataDir, 'sessions', 'sess_write_test.json');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const savedSession = JSON.parse(fileContent);

      expect(savedSession.sessionId).toBe(session.sessionId);
      expect(savedSession.playerId).toBe(session.playerId);
    });

    it('should cache session in memory', async () => {
      const session = createMockSession({
        sessionId: 'sess_cache_test',
      });

      await storage.writeSession(session);

      // Should be retrievable from cache
      const cached = storage.getSession('sess_cache_test');
      expect(cached).toEqual(session);
    });

    it('should not write incomplete session to file', async () => {
      const session = createMockSession({
        sessionId: 'sess_incomplete',
        completedAt: undefined,
      });

      await storage.writeSession(session);

      const filePath = path.join(testDataDir, 'sessions', 'sess_incomplete.json');
      
      // File should not exist
      await expect(fs.access(filePath)).rejects.toThrow();
      
      // But should be in cache
      const cached = storage.getSession('sess_incomplete');
      expect(cached).toEqual(session);
    });
  });

  describe('readSession', () => {
    it('should read session from cache', async () => {
      const session = createMockSession({
        sessionId: 'sess_cache_read',
      });

      await storage.writeSession(session);

      const retrieved = await storage.readSession('sess_cache_read');
      expect(retrieved).toEqual(session);
    });

    it('should read session from file if not in cache', async () => {
      const session = createMockSession({
        sessionId: 'sess_file_read',
        completedAt: new Date().toISOString(),
      });

      // Write to file
      await storage.writeSession(session);

      // Create new storage instance (empty cache)
      const newStorage = new FileStorage(testDataDir);
      await newStorage.initialize();

      const retrieved = await newStorage.readSession('sess_file_read');
      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe(session.sessionId);

      await newStorage.shutdown();
    });

    it('should return null when session does not exist', async () => {
      const retrieved = await storage.readSession('nonexistent_session');
      expect(retrieved).toBeNull();
    });

    it('should add file-read session to cache', async () => {
      const session = createMockSession({
        sessionId: 'sess_cache_after_read',
        completedAt: new Date().toISOString(),
      });

      await storage.writeSession(session);

      // Create new storage (empty cache)
      const newStorage = new FileStorage(testDataDir);
      await newStorage.initialize();

      // Read from file
      await newStorage.readSession('sess_cache_after_read');

      // Should now be in cache
      const cached = newStorage.getSession('sess_cache_after_read');
      expect(cached).toBeDefined();

      await newStorage.shutdown();
    });
  });

  describe('getSession', () => {
    it('should return session from cache', () => {
      const session = createMockSession({
        sessionId: 'sess_get_test',
      });

      storage.writeSession(session);

      const retrieved = storage.getSession('sess_get_test');
      expect(retrieved).toEqual(session);
    });

    it('should return null when session not in cache', () => {
      const retrieved = storage.getSession('not_in_cache');
      expect(retrieved).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete session from cache and file', async () => {
      const session = createMockSession({
        sessionId: 'sess_delete_test',
        completedAt: new Date().toISOString(),
      });

      await storage.writeSession(session);

      const deleted = await storage.deleteSession('sess_delete_test');
      expect(deleted).toBe(true);

      // Should not be in cache
      const cached = storage.getSession('sess_delete_test');
      expect(cached).toBeNull();

      // File should not exist
      const filePath = path.join(testDataDir, 'sessions', 'sess_delete_test.json');
      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('should return false when session does not exist', async () => {
      const deleted = await storage.deleteSession('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('file path generation', () => {
    it('should generate correct file path for session', async () => {
      const session = createMockSession({
        sessionId: 'sess_path_test',
        completedAt: new Date().toISOString(),
      });

      await storage.writeSession(session);

      const expectedPath = path.join(testDataDir, 'sessions', 'sess_path_test.json');
      const stats = await fs.stat(expectedPath);
      expect(stats.isFile()).toBe(true);
    });
  });

  describe('error handling for I/O failures', () => {
    it('should handle read errors for corrupted files', async () => {
      const sessionId = 'sess_corrupted';
      const filePath = path.join(testDataDir, 'sessions', `${sessionId}.json`);

      // Write corrupted JSON
      await fs.writeFile(filePath, 'invalid json content', 'utf-8');

      await expect(storage.readSession(sessionId)).rejects.toThrow();
    });

    it('should handle missing directory gracefully on read', async () => {
      const newStorage = new FileStorage('./test-data/nonexistent-dir');
      
      const result = await newStorage.readSession('any_session');
      expect(result).toBeNull();

      await newStorage.shutdown();
    });
  });

  describe('querySessions', () => {
    beforeEach(async () => {
      // Create test sessions
      const sessions = [
        createMockSession({
          sessionId: 'sess_query_1',
          playerId: 'player_1',
          completedAt: new Date('2025-01-01').toISOString(),
        }),
        createMockSession({
          sessionId: 'sess_query_2',
          playerId: 'player_1',
          completedAt: new Date('2025-01-02').toISOString(),
        }),
        createMockSession({
          sessionId: 'sess_query_3',
          playerId: 'player_2',
          completedAt: undefined,
        }),
      ];

      for (const session of sessions) {
        await storage.writeSession(session);
      }
    });

    it('should query sessions by playerId', async () => {
      const results = await storage.querySessions({ playerId: 'player_1' });
      expect(results).toHaveLength(2);
      expect(results.every(s => s.playerId === 'player_1')).toBe(true);
    });

    it('should query completed sessions', async () => {
      const results = await storage.querySessions({ completed: true });
      expect(results).toHaveLength(2);
      expect(results.every(s => s.completedAt !== undefined)).toBe(true);
    });

    it('should query incomplete sessions', async () => {
      // Note: Incomplete sessions are only in cache, not written to files
      // So querySessions won't find them since it reads from files
      const results = await storage.querySessions({ completed: false });
      expect(results).toHaveLength(0);
    });

    it('should return empty array when no sessions match', async () => {
      const results = await storage.querySessions({ playerId: 'nonexistent' });
      expect(results).toEqual([]);
    });
  });

  describe('countSessions', () => {
    beforeEach(async () => {
      const sessions = [
        createMockSession({ 
          sessionId: 'sess_count_1', 
          playerId: 'player_1',
          completedAt: new Date().toISOString(),
        }),
        createMockSession({ 
          sessionId: 'sess_count_2', 
          playerId: 'player_1',
          completedAt: new Date().toISOString(),
        }),
        createMockSession({ 
          sessionId: 'sess_count_3', 
          playerId: 'player_2',
          completedAt: new Date().toISOString(),
        }),
      ];

      for (const session of sessions) {
        await storage.writeSession(session);
      }
    });

    it('should count sessions matching filter', async () => {
      const count = await storage.countSessions({ playerId: 'player_1' });
      expect(count).toBe(2);
    });

    it('should return 0 when no sessions match', async () => {
      const count = await storage.countSessions({ playerId: 'nonexistent' });
      expect(count).toBe(0);
    });
  });

  describe('healthCheck', () => {
    it('should return true when storage is healthy', async () => {
      const healthy = await storage.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should return false when storage is not accessible', async () => {
      const badStorage = new FileStorage('/invalid/path/that/cannot/be/created');
      
      const healthy = await badStorage.healthCheck();
      expect(healthy).toBe(false);

      await badStorage.shutdown();
    });
  });

  describe('shutdown', () => {
    it('should clear cache on shutdown', async () => {
      const session = createMockSession({ sessionId: 'sess_shutdown' });
      await storage.writeSession(session);

      expect(storage.getSession('sess_shutdown')).toBeDefined();

      await storage.shutdown();

      // Cache should be cleared
      expect(storage.getSession('sess_shutdown')).toBeNull();
    });
  });
});
