// Unit tests for embedding adapters: MockEmbeddings determinism and error handling.
import { MockEmbeddings, OpenAIEmbeddings } from '../src/lib/llm/embeddings';

describe('MockEmbeddings', () => {
  let embeddings: MockEmbeddings;

  beforeEach(() => {
    embeddings = new MockEmbeddings();
  });

  it('should generate deterministic embeddings for same text', async () => {
    const text = 'hello world';
    const emb1 = await embeddings.embed(text);
    const emb2 = await embeddings.embed(text);
    expect(emb1).toEqual(emb2);
  });

  it('should generate different embeddings for different text', async () => {
    const emb1 = await embeddings.embed('hello');
    const emb2 = await embeddings.embed('goodbye');
    expect(emb1).not.toEqual(emb2);
  });

  it('should generate normalized vectors', async () => {
    const emb = await embeddings.embed('test');
    const magnitude = Math.sqrt(emb.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it('should generate vectors of expected length', async () => {
    const emb = await embeddings.embed('test');
    expect(emb.length).toBe(128);
  });
});

describe('OpenAIEmbeddings', () => {
  it('should throw error when OPENAI_API_KEY not set', async () => {
    const oldKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const embeddings = new OpenAIEmbeddings();
    await expect(embeddings.embed('test')).rejects.toThrow('OPENAI_API_KEY not set');

    if (oldKey) process.env.OPENAI_API_KEY = oldKey;
  });
});
