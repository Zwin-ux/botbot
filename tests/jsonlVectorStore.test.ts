// Unit tests for JsonlVectorStore using MockEmbeddings (no network calls).
import { JsonlVectorStore } from '../src/lib/memory/vector-memory';
import { MockEmbeddings } from '../src/lib/llm/embeddings';
import fs from 'fs/promises';
import path from 'path';

const TEST_FILE = path.join(__dirname, '../data/test-memory.jsonl');

describe('JsonlVectorStore', () => {
  let store: JsonlVectorStore;

  beforeEach(() => {
    store = new JsonlVectorStore(new MockEmbeddings(), TEST_FILE);
  });

  afterEach(async () => {
    try {
      await fs.unlink(TEST_FILE);
    } catch {
      // ignore if not exists
    }
  });

  it('should upsert and search entries', async () => {
    await store.upsert({ id: '1', text: 'hello world' });
    await store.upsert({ id: '2', text: 'goodbye world' });

    const results = await store.search('hello', 1);
    expect(results.length).toBe(1);
    expect(results[0].text).toBe('hello world');
  });

  it('should cache embeddings for identical text', async () => {
    await store.upsert({ id: '3', text: 'repeated text' });
    await store.upsert({ id: '4', text: 'repeated text' });

    const results = await store.search('repeated text', 2);
    expect(results.length).toBe(2);
    expect(results[0].text).toBe('repeated text');
    expect(results[1].text).toBe('repeated text');
  });

  it('should return empty array when no entries exist', async () => {
    const results = await store.search('nonexistent', 5);
    expect(results).toEqual([]);
  });
});
