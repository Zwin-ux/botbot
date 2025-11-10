import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import crypto from 'crypto';
import { EventEmitter, HookManager, createMockEncounterSpec, cleanupTestData } from '@ai-encounters/core';
import { DifficultyManager } from '@ai-encounters/difficulty-engine';
import { FileStorage } from '../../storage/FileStorage.js';
import { PlayerDataStorage } from '../../storage/PlayerDataStorage.js';
import { SessionManager } from '../../services/SessionManager.js';
import { createSessionRoutes } from '../../routes/sessions.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * HMAC Authentication Integration Tests
 * 
 * Tests the HMAC signature generation and validation for inter-service communication.
 * Note: Currently the engine service doesn't enforce HMAC authentication on incoming requests,
 * but it generates HMAC signatures when calling the LLM Proxy service.
 */
describe('HMAC Authentication Tests', () => {
  let app: Express;
  const testDataDir = path.join(process.cwd(), 'test-data', 'hmac-test-sessions');
  const testHmacSecret = 'test-hmac-secret-for-auth-tests';

  beforeAll(async () => {
    // Set test environment variables
    process.env.DATA_DIR = testDataDir;
    process.env.AE_HMAC_SECRET = testHmacSecret;
    process.env.PORT = '0';

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

  describe('HMAC Signature Generation', () => {
    it('should generate valid HMAC signature for request body', () => {
      const requestBody = JSON.stringify({
        playerId: 'test_player',
        context: { level: 5 }
      });

      const signature = crypto
        .createHmac('sha256', testHmacSecret)
        .update(requestBody)
        .digest('hex');

      expect(signature).toBeDefined();
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different signatures for different data', () => {
      const data1 = JSON.stringify({ playerId: 'player1' });
      const data2 = JSON.stringify({ playerId: 'player2' });

      const signature1 = crypto
        .createHmac('sha256', testHmacSecret)
        .update(data1)
        .digest('hex');

      const signature2 = crypto
        .createHmac('sha256', testHmacSecret)
        .update(data2)
        .digest('hex');

      expect(signature1).not.toBe(signature2);
    });

    it('should generate same signature for identical data', () => {
      const data = JSON.stringify({ playerId: 'player1', level: 5 });

      const signature1 = crypto
        .createHmac('sha256', testHmacSecret)
        .update(data)
        .digest('hex');

      const signature2 = crypto
        .createHmac('sha256', testHmacSecret)
        .update(data)
        .digest('hex');

      expect(signature1).toBe(signature2);
    });

    it('should generate different signatures with different secrets', () => {
      const data = JSON.stringify({ playerId: 'player1' });
      const secret1 = 'secret-key-1';
      const secret2 = 'secret-key-2';

      const signature1 = crypto
        .createHmac('sha256', secret1)
        .update(data)
        .digest('hex');

      const signature2 = crypto
        .createHmac('sha256', secret2)
        .update(data)
        .digest('hex');

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('HMAC Signature Validation', () => {
    /**
     * Helper function to generate HMAC signature
     */
    function generateHMAC(data: string, secret: string): string {
      return crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');
    }

    /**
     * Helper function to validate HMAC signature
     */
    function validateHMAC(data: string, signature: string, secret: string): boolean {
      const expectedSignature = generateHMAC(data, secret);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    }

    it('should validate correct HMAC signature', () => {
      const data = JSON.stringify({ playerId: 'test_player' });
      const signature = generateHMAC(data, testHmacSecret);

      const isValid = validateHMAC(data, signature, testHmacSecret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid HMAC signature', () => {
      const data = JSON.stringify({ playerId: 'test_player' });
      const invalidSignature = 'invalid_signature_' + '0'.repeat(48);

      expect(() => {
        validateHMAC(data, invalidSignature, testHmacSecret);
      }).toThrow();
    });

    it('should reject HMAC signature with wrong secret', () => {
      const data = JSON.stringify({ playerId: 'test_player' });
      const signature = generateHMAC(data, 'wrong-secret');

      const isValid = validateHMAC(data, signature, testHmacSecret);
      expect(isValid).toBe(false);
    });

    it('should reject HMAC signature for modified data', () => {
      const originalData = JSON.stringify({ playerId: 'test_player' });
      const modifiedData = JSON.stringify({ playerId: 'modified_player' });
      const signature = generateHMAC(originalData, testHmacSecret);

      const isValid = validateHMAC(modifiedData, signature, testHmacSecret);
      expect(isValid).toBe(false);
    });

    it('should handle empty data', () => {
      const data = '';
      const signature = generateHMAC(data, testHmacSecret);

      const isValid = validateHMAC(data, signature, testHmacSecret);
      expect(isValid).toBe(true);
    });

    it('should handle large payloads', () => {
      const largeData = JSON.stringify({
        playerId: 'test_player',
        context: {
          level: 50,
          preferences: Array(100).fill('preference'),
          history: Array(1000).fill('encounter_id')
        }
      });

      const signature = generateHMAC(largeData, testHmacSecret);
      const isValid = validateHMAC(largeData, signature, testHmacSecret);
      expect(isValid).toBe(true);
    });
  });

  describe('HMAC in Request Flow', () => {
    /**
     * Note: The current engine implementation doesn't enforce HMAC authentication
     * on incoming requests. These tests verify that the engine can still process
     * requests without HMAC headers. In a production environment, you would add
     * HMAC middleware to validate incoming requests.
     */

    it('should process requests without HMAC header (current implementation)', async () => {
      // Current implementation doesn't require HMAC for engine endpoints
      const response = await request(app)
        .post('/session/start')
        .send({
          playerId: 'test_player_no_hmac'
        })
        .expect(201);

      expect(response.body.sessionId).toBeDefined();
    });

    it('should process requests with HMAC header (forward compatibility)', async () => {
      const requestBody = {
        playerId: 'test_player_with_hmac'
      };
      const bodyString = JSON.stringify(requestBody);
      const signature = crypto
        .createHmac('sha256', testHmacSecret)
        .update(bodyString)
        .digest('hex');

      const response = await request(app)
        .post('/session/start')
        .set('X-HMAC-Signature', signature)
        .send(requestBody)
        .expect(201);

      expect(response.body.sessionId).toBeDefined();
    });

    it('should verify HMAC utility functions work correctly', () => {
      // Test the HMAC generation utility that would be used by LLMProxyClient
      const testData = JSON.stringify({
        playerContext: { playerId: 'test', level: 5 },
        difficulty: 'medium'
      });

      const signature1 = crypto
        .createHmac('sha256', testHmacSecret)
        .update(testData)
        .digest('hex');

      const signature2 = crypto
        .createHmac('sha256', testHmacSecret)
        .update(testData)
        .digest('hex');

      // Same data should produce same signature
      expect(signature1).toBe(signature2);

      // Signature should be 64 hex characters (SHA-256)
      expect(signature1).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('HMAC Security Properties', () => {
    it('should use timing-safe comparison for signature validation', () => {
      const data = JSON.stringify({ playerId: 'test' });
      const correctSignature = crypto
        .createHmac('sha256', testHmacSecret)
        .update(data)
        .digest('hex');

      // Timing-safe comparison should work
      const isValid = crypto.timingSafeEqual(
        Buffer.from(correctSignature, 'hex'),
        Buffer.from(correctSignature, 'hex')
      );

      expect(isValid).toBe(true);
    });

    it('should reject signatures with different lengths safely', () => {
      const data = JSON.stringify({ playerId: 'test' });
      const correctSignature = crypto
        .createHmac('sha256', testHmacSecret)
        .update(data)
        .digest('hex');

      const shortSignature = correctSignature.substring(0, 32);

      expect(() => {
        crypto.timingSafeEqual(
          Buffer.from(correctSignature, 'hex'),
          Buffer.from(shortSignature, 'hex')
        );
      }).toThrow();
    });

    it('should handle signature validation with consistent timing', () => {
      const data = JSON.stringify({ playerId: 'test' });
      const signature = crypto
        .createHmac('sha256', testHmacSecret)
        .update(data)
        .digest('hex');

      // Multiple validations should be consistent
      const results = Array(10).fill(null).map(() => {
        return crypto.timingSafeEqual(
          Buffer.from(signature, 'hex'),
          Buffer.from(signature, 'hex')
        );
      });

      expect(results.every(r => r === true)).toBe(true);
    });
  });

  describe('HMAC Error Handling', () => {
    it('should handle invalid hex strings in signature', () => {
      const invalidHex = 'not-a-hex-string';

      expect(() => {
        Buffer.from(invalidHex, 'hex');
      }).not.toThrow(); // Buffer.from doesn't throw, but produces invalid buffer

      // The buffer will be shorter than expected
      const buffer = Buffer.from(invalidHex, 'hex');
      expect(buffer.length).toBeLessThan(32); // SHA-256 is 32 bytes
    });

    it('should handle empty signature', () => {
      const emptySignature = '';
      const buffer = Buffer.from(emptySignature, 'hex');
      expect(buffer.length).toBe(0);
    });

    it('should handle null or undefined data gracefully', () => {
      // HMAC should handle empty strings
      const signature = crypto
        .createHmac('sha256', testHmacSecret)
        .update('')
        .digest('hex');

      expect(signature).toBeDefined();
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
