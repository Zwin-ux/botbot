// WebSearch skill: performs a web search (mock or real HTTP fetch).
// Env vars used: WEB_SEARCH_API_URL (optional, falls back to mock if missing).

import { Skill, SkillContext, SkillResult } from '../skill';
import fetch from 'node-fetch';

const WEB_SEARCH_API_URL = process.env.WEB_SEARCH_API_URL;
const TIMEOUT_MS = 8000;

async function fetchSearch(query: string): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${WEB_SEARCH_API_URL}?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      signal: controller.signal as AbortSignal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      throw new Error(`Search API error: ${response.status}`);
    }
    const data = (await response.json()) as { results?: string[] };
    return data.results || [];
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function mockSearch(query: string): string[] {
  return [`Mock result 1 for "${query}"`, `Mock result 2 for "${query}"`];
}

const webSearchSkill: Skill = {
  name: 'webSearch',
  description: 'Perform a web search and return mock or real results.',
  async execute(context: SkillContext): Promise<SkillResult> {
    try {
      const query = context.userMessage;
      let results: string[];
      if (WEB_SEARCH_API_URL) {
        results = await fetchSearch(query);
      } else {
        results = mockSearch(query);
      }
      return { success: true, data: { results } };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

export default webSearchSkill;
