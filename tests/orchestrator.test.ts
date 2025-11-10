// Unit tests for AgentOrchestrator: skill selection, execution, timeout, error handling.
import { AgentOrchestrator } from '../src/lib/agent/orchestrator';
import { MockEmbeddings } from '../src/lib/llm/embeddings';
import { JsonlVectorStore } from '../src/lib/memory/vector-memory';
import fs from 'fs/promises';
import path from 'path';

const TEST_FILE = path.join(__dirname, '../data/test-orchestrator-memory.jsonl');

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(async () => {
    const embeddings = new MockEmbeddings();
    const vectorStore = new JsonlVectorStore(embeddings, TEST_FILE);
    orchestrator = new AgentOrchestrator(embeddings, vectorStore);
    await orchestrator.initialize();
  });

  afterEach(async () => {
    try {
      await fs.unlink(TEST_FILE);
    } catch {
      // ignore if not exists
    }
  });

  it('should initialize and load skills', async () => {
    const response = await orchestrator.handle({
      userId: 'user1',
      sessionId: 'sess1',
      userMessage: 'hello',
    });
    expect(response.success).toBe(true);
    expect(response.skillUsed).toBeDefined();
  });

  it('should select and execute converse skill', async () => {
    const response = await orchestrator.handle({
      userId: 'user1',
      sessionId: 'sess1',
      userMessage: 'tell me a joke',
    });
    expect(response.success).toBe(true);
    expect(response.skillUsed).toBe('converse');
    expect(response.result.success).toBe(true);
  });

  it('should include timings for all operations', async () => {
    const response = await orchestrator.handle({
      userId: 'user1',
      sessionId: 'sess1',
      userMessage: 'test',
    });
    expect(response.timings.skillSelection).toBeGreaterThanOrEqual(0);
    expect(response.timings.skillExecution).toBeGreaterThanOrEqual(0);
    expect(response.timings.memoryUpsert).toBeGreaterThanOrEqual(0);
  });

  it('should include trace information', async () => {
    const response = await orchestrator.handle({
      userId: 'user1',
      sessionId: 'sess1',
      userMessage: 'test',
    });
    expect(Array.isArray(response.trace)).toBe(true);
    expect(response.trace.length).toBeGreaterThan(0);
  });

  it('should handle errors gracefully', async () => {
    // This will test error handling if skill execution fails
    const response = await orchestrator.handle({
      userId: 'user1',
      sessionId: 'sess1',
      userMessage: '',
    });
    // Should still return a response even if skill fails
    expect(response).toBeDefined();
    expect(response.skillUsed).toBeDefined();
  });
});
