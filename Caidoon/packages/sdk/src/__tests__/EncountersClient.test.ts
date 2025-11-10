import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EncountersClient } from '../EncountersClient.js';
import { createMockSession, createMockPlayerContext, type Session } from '@ai-encounters/core';

describe('EncountersClient', () => {
  let client: EncountersClient;
  const baseUrl = 'http://localhost:3001';

  beforeEach(() => {
    client = new EncountersClient(baseUrl);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with base URL', () => {
      const testClient = new EncountersClient('http://example.com');
      expect(testClient).toBeInstanceOf(EncountersClient);
    });

    it('should remove trailing slash from base URL', () => {
      const testClient = new EncountersClient('http://example.com/');
      expect(testClient).toBeInstanceOf(EncountersClient);
    });

    it('should accept custom timeout option', () => {
      const testClient = new EncountersClient(baseUrl, { timeout: 5000 });
      expect(testClient).toBeInstanceOf(EncountersClient);
    });

    it('should accept custom headers option', () => {
      const testClient = new EncountersClient(baseUrl, {
        headers: { 'X-Custom-Header': 'test' }
      });
      expect(testClient).toBeInstanceOf(EncountersClient);
    });
  });

  describe('startSession', () => {
    it('should start session with valid data', async () => {
      const mockSession = createMockSession();
      const mockContext = createMockPlayerContext();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockSession
      });

      const result = await client.startSession('player_123', mockContext);

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/session/start`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            playerId: 'player_123',
            context: mockContext
          })
        })
      );
      expect(result).toEqual(mockSession);
    });

    it('should start session without context', async () => {
      const mockSession = createMockSession();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockSession
      });

      const result = await client.startSession('player_123');

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/session/start`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            playerId: 'player_123',
            context: undefined
          })
        })
      );
      expect(result).toEqual(mockSession);
    });

    it('should handle validation error (400)', async () => {
      const errorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'playerId is required',
          details: { field: 'playerId' }
        },
        timestamp: new Date().toISOString()
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => errorResponse
      });

      await expect(client.startSession('')).rejects.toMatchObject({
        name: 'SDKError',
        message: 'playerId is required',
        statusCode: 400,
        details: { field: 'playerId' }
      });
    });
  });

  describe('getSession', () => {
    it('should get session by ID', async () => {
      const mockSession = createMockSession({ sessionId: 'session_123' });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockSession
      });

      const result = await client.getSession('session_123');

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/session/session_123`,
        expect.objectContaining({
          method: 'GET'
        })
      );
      expect(result).toEqual(mockSession);
    });

    it('should handle session not found (404)', async () => {
      const errorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Session not found',
          details: { sessionId: 'invalid_id' }
        },
        timestamp: new Date().toISOString()
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => errorResponse
      });

      await expect(client.getSession('invalid_id')).rejects.toMatchObject({
        name: 'SDKError',
        message: 'Session not found',
        statusCode: 404
      });
    });
  });

  describe('updateObjective', () => {
    it('should update objective successfully', async () => {
      const mockSession = createMockSession({
        sessionId: 'session_123',
        state: {
          currentObjectiveIndex: 1,
          objectivesCompleted: ['obj_1'],
          npcInteractions: {}
        }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockSession
      });

      const result = await client.updateObjective('session_123', 'obj_1');

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/session/session_123/objective/obj_1`,
        expect.objectContaining({
          method: 'PATCH'
        })
      );
      expect(result).toEqual(mockSession);
      expect(result.state.objectivesCompleted).toContain('obj_1');
    });

    it('should handle invalid objective ID', async () => {
      const errorResponse = {
        error: {
          code: 'INVALID_OBJECTIVE',
          message: 'Objective not found in session',
          details: { objectiveId: 'invalid_obj' }
        },
        timestamp: new Date().toISOString()
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => errorResponse
      });

      await expect(
        client.updateObjective('session_123', 'invalid_obj')
      ).rejects.toMatchObject({
        name: 'SDKError',
        message: 'Objective not found in session',
        statusCode: 400
      });
    });
  });

  describe('completeSession', () => {
    it('should complete session successfully', async () => {
      const mockSession = createMockSession({
        sessionId: 'session_123',
        completedAt: new Date().toISOString()
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockSession
      });

      const result = await client.completeSession('session_123');

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/session/session_123/complete`,
        expect.objectContaining({
          method: 'POST'
        })
      );
      expect(result).toEqual(mockSession);
      expect(result.completedAt).toBeDefined();
    });

    it('should handle already completed session', async () => {
      const errorResponse = {
        error: {
          code: 'SESSION_ALREADY_COMPLETED',
          message: 'Session is already completed',
          details: { sessionId: 'session_123' }
        },
        timestamp: new Date().toISOString()
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => errorResponse
      });

      await expect(client.completeSession('session_123')).rejects.toMatchObject({
        name: 'SDKError',
        message: 'Session is already completed',
        statusCode: 400
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network connection failed'));

      await expect(client.startSession('player_123')).rejects.toMatchObject({
        name: 'SDKError',
        message: 'Network error: Network connection failed',
        statusCode: 0
      });
    });

    it('should handle timeout errors', async () => {
      const shortTimeoutClient = new EncountersClient(baseUrl, { timeout: 100 });

      global.fetch = vi.fn().mockImplementation((url, options) => {
        return new Promise((resolve, reject) => {
          // Simulate abort signal behavior
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const abortError = new Error('The operation was aborted');
              abortError.name = 'AbortError';
              reject(abortError);
            });
          }
          
          // Simulate slow response (longer than timeout)
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              headers: new Headers({ 'content-type': 'application/json' }),
              json: async () => ({})
            });
          }, 200);
        });
      });

      await expect(shortTimeoutClient.startSession('player_123')).rejects.toMatchObject({
        name: 'SDKError',
        message: 'Request timeout after 100ms',
        statusCode: 408
      });
    });

    it('should handle server errors (500)', async () => {
      const errorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => errorResponse
      });

      await expect(client.getSession('session_123')).rejects.toMatchObject({
        name: 'SDKError',
        message: 'An unexpected error occurred',
        statusCode: 500
      });
    });

    it('should handle service unavailable (503)', async () => {
      const errorResponse = {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service temporarily unavailable'
        },
        timestamp: new Date().toISOString()
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => errorResponse
      });

      await expect(client.startSession('player_123')).rejects.toMatchObject({
        name: 'SDKError',
        message: 'Service temporarily unavailable',
        statusCode: 503
      });
    });

    it('should handle non-JSON error responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Internal Server Error',
        json: async () => {
          throw new Error('Not JSON');
        }
      });

      await expect(client.getSession('session_123')).rejects.toMatchObject({
        name: 'SDKError',
        statusCode: 500
      });
    });

    it('should handle authentication errors (401)', async () => {
      const errorResponse = {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid authentication credentials'
        },
        timestamp: new Date().toISOString()
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => errorResponse
      });

      await expect(client.startSession('player_123')).rejects.toMatchObject({
        name: 'SDKError',
        message: 'Invalid authentication credentials',
        statusCode: 401
      });
    });
  });

  describe('custom headers', () => {
    it('should include custom headers in requests', async () => {
      const customClient = new EncountersClient(baseUrl, {
        headers: {
          'X-API-Key': 'test-key',
          'X-Custom-Header': 'custom-value'
        }
      });

      const mockSession = createMockSession();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockSession
      });

      await customClient.startSession('player_123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-API-Key': 'test-key',
            'X-Custom-Header': 'custom-value'
          })
        })
      );
    });
  });
});
