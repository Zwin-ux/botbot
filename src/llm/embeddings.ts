/**
 * Embedding Adapters
 * OpenAI (fetch-based) and Mock (deterministic) implementations
 * 
 * Environment variables:
 * - OPENAI_API_KEY: Required for OpenAIEmbeddings
 */

import fetch from 'node-fetch';

/**
 * Embedding adapter interface
 */
export interface EmbeddingAdapter {
  embed(text: string): Promise<number[]>;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const TIMEOUT_MS = 10000;

/**
 * OpenAI Embeddings implementation
 */
export class OpenAIEmbeddings implements EmbeddingAdapter {
  async embed(text: string): Promise<number[]> {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not set for OpenAIEmbeddings');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(OPENAI_EMBED_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text,
        }),
        signal: controller.signal as AbortSignal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`OpenAI embeddings error: ${response.status}`);
      }
      const data = (await response.json()) as {
        data?: Array<{ embedding?: number[] }>;
      };
      return data.data?.[0]?.embedding || [];
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }
}

/**
 * Mock Embeddings for testing
 * Deterministic: hashes text to fixed-size vector
 */
export class MockEmbeddings implements EmbeddingAdapter {
  async embed(text: string): Promise<number[]> {
    const hash = this.simpleHash(text);
    const vec: number[] = [];
    for (let i = 0; i < 128; i++) {
      vec.push(Math.sin(hash + i));
    }
    // Normalize
    const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    return vec.map((v) => v / mag);
  }

  private simpleHash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return h;
  }
}
