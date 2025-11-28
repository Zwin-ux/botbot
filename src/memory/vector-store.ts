/**
 * Vector Store Implementation
 * JSONL-based vector store with embedding cache
 * 
 * Environment variables:
 * - VECTOR_STORE_PATH: Path to store file (default: ./data/memory.jsonl)
 */

import fs from 'fs/promises';
import path from 'path';
import { EmbeddingAdapter } from '../llm/embeddings';
import { VectorEntry, VectorStore } from './types';

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * JSONL-based Vector Store
 * Stores vectors in a newline-delimited JSON file
 */
export class JsonlVectorStore implements VectorStore {
  private filePath: string;
  private embeddingAdapter: EmbeddingAdapter;
  private cache: Map<string, number[]> = new Map();

  constructor(embeddingAdapter: EmbeddingAdapter, filePath?: string) {
    this.filePath = filePath || process.env.VECTOR_STORE_PATH || './data/memory.jsonl';
    this.embeddingAdapter = embeddingAdapter;
  }

  private async ensureDir(): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  private async readEntries(): Promise<VectorEntry[]> {
    await this.ensureDir();
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      return lines.map((line) => JSON.parse(line) as VectorEntry);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }

  private async appendEntry(entry: VectorEntry): Promise<void> {
    await this.ensureDir();
    await fs.appendFile(this.filePath, JSON.stringify(entry) + '\n', 'utf-8');
  }

  async upsert(entry: Omit<VectorEntry, 'embedding' | 'timestamp'>): Promise<void> {
    let embedding = this.cache.get(entry.text);
    if (!embedding) {
      embedding = await this.embeddingAdapter.embed(entry.text);
      this.cache.set(entry.text, embedding);
    }
    const vectorEntry: VectorEntry = {
      ...entry,
      embedding,
      timestamp: Date.now(),
    };
    await this.appendEntry(vectorEntry);
  }

  async search(query: string, topK: number): Promise<VectorEntry[]> {
    let queryEmbedding = this.cache.get(query);
    if (!queryEmbedding) {
      queryEmbedding = await this.embeddingAdapter.embed(query);
      this.cache.set(query, queryEmbedding);
    }
    const entries = await this.readEntries();
    const scored = entries.map((e) => ({
      entry: e,
      score: cosineSimilarity(queryEmbedding!, e.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((s) => s.entry);
  }
}
