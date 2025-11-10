import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createServer } from '../server.js';
import { loadConfig } from '../config.js';

describe('LLM Proxy Health Check', () => {
  let app: Express;

  beforeAll(() => {
    const config = loadConfig();
    app = createServer(config);
  });

  it('should return 200 when healthy', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
  });

  it('should match the health check response format specification', async () => {
    const response = await request(app).get('/health');

    // Verify response structure
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('service');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version');

    // Verify status is 'ok'
    expect(response.body.status).toBe('ok');

    // Verify service name
    expect(response.body.service).toBe('llm-proxy');

    // Verify version
    expect(response.body.version).toBe('1.0.0');

    // Verify timestamp is ISO format
    expect(() => new Date(response.body.timestamp)).not.toThrow();
    const timestamp = new Date(response.body.timestamp);
    expect(timestamp.toISOString()).toBe(response.body.timestamp);
  });

  it('should respond within 2 seconds', async () => {
    const start = Date.now();
    await request(app).get('/health');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
  });

  it('should return valid JSON', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toBeDefined();
    expect(typeof response.body).toBe('object');
  });
});
