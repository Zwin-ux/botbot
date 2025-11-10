// Converse skill: calls LLM (OpenAI or Mock) to generate a conversational reply.
// Env vars used: OPENAI_API_KEY (optional, falls back to mock if missing).

import { Skill, SkillContext, SkillResult } from '../skill';
import fetch from 'node-fetch';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const TIMEOUT_MS = 10000;

async function callOpenAI(message: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }],
        max_tokens: 150,
      }),
      signal: controller.signal as AbortSignal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content || 'No response';
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function mockLLM(message: string): string {
  return `Mock LLM reply to: "${message}"`;
}

const converseSkill: Skill = {
  name: 'converse',
  description: 'Generate a conversational reply using an LLM (OpenAI or mock).',
  async execute(context: SkillContext): Promise<SkillResult> {
    try {
      let reply: string;
      if (OPENAI_API_KEY) {
        reply = await callOpenAI(context.userMessage);
      } else {
        reply = mockLLM(context.userMessage);
      }
      return { success: true, data: { reply } };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

export default converseSkill;
