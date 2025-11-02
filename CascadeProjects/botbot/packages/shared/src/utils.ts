import type { ParsedIntent, MemoryData, MessageData } from './types';
import { INTENT_PATTERNS, MOOD_PRESETS } from './constants';

// Parse natural language intent from user message
export function parseIntent(content: string, mentionedBot: boolean): ParsedIntent {
  // Remove bot mention from content for parsing
  const cleanContent = content.replace(/<@!?\d+>/g, '').trim();

  // ADOPT pattern
  const adoptMatch = cleanContent.match(INTENT_PATTERNS.ADOPT);
  if (adoptMatch) {
    return {
      type: 'ADOPT',
      params: {
        persona: adoptMatch[1].trim(),
        name: adoptMatch[2].trim(),
      },
      confidence: 0.95,
    };
  }

  // REMEMBER pattern
  const rememberMatch = cleanContent.match(INTENT_PATTERNS.REMEMBER);
  if (rememberMatch) {
    return {
      type: 'REMEMBER',
      params: {
        content: rememberMatch[1].trim(),
      },
      confidence: 0.9,
    };
  }

  // RECALL pattern
  const recallMatch = cleanContent.match(INTENT_PATTERNS.RECALL);
  if (recallMatch) {
    return {
      type: 'RECALL',
      params: {},
      confidence: 0.9,
    };
  }

  // MOOD pattern
  const moodMatch = cleanContent.match(INTENT_PATTERNS.MOOD);
  if (moodMatch) {
    const moodName = moodMatch[1].toLowerCase();
    return {
      type: 'MOOD',
      params: {
        mood: moodName,
        preset: MOOD_PRESETS[moodName],
      },
      confidence: MOOD_PRESETS[moodName] ? 0.9 : 0.5,
    };
  }

  // HELP pattern
  if (INTENT_PATTERNS.HELP.test(cleanContent)) {
    return {
      type: 'HELP',
      params: {},
      confidence: 0.95,
    };
  }

  // GARDEN pattern
  if (INTENT_PATTERNS.GARDEN.test(cleanContent)) {
    return {
      type: 'GARDEN',
      params: {},
      confidence: 0.9,
    };
  }

  // Default to CHAT if bot was mentioned or DM
  if (mentionedBot) {
    return {
      type: 'CHAT',
      params: {
        content: cleanContent,
      },
      confidence: 0.8,
    };
  }

  return {
    type: 'UNKNOWN',
    params: {},
    confidence: 0.0,
  };
}

// Calculate token count (rough estimate)
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// Format memories for prompt injection
export function formatMemoriesForPrompt(memories: MemoryData[]): string {
  if (memories.length === 0) {
    return 'No relevant memories.';
  }

  const formatted = memories
    .map((m, i) => {
      const relevance = m.similarity ? `(${(m.similarity * 100).toFixed(0)}% relevant)` : '';
      return `${i + 1}. [${m.kind}] ${m.content} ${relevance}`;
    })
    .join('\n');

  return `**Relevant Memories:**\n${formatted}`;
}

// Format conversation history for prompt
export function formatHistoryForPrompt(messages: MessageData[], limit: number = 30): string {
  const recent = messages.slice(-limit);

  return recent
    .map((m) => {
      const role = m.sender === 'USER' ? 'User' : m.sender === 'AGENT' ? 'You' : 'System';
      return `${role}: ${m.content}`;
    })
    .join('\n');
}

// Calculate memory decay based on time
export function calculateDecayedSalience(
  originalSalience: number,
  createdAt: Date,
  lastAccessedAt: Date,
  decayRate: number = 0.95
): number {
  const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const daysSinceAccess = (Date.now() - lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24);

  // Decay based on time since creation, but boost if recently accessed
  const accessBoost = Math.max(0, 1 - daysSinceAccess / 30); // Boost decays over 30 days
  const decayedSalience = originalSalience * Math.pow(decayRate, daysSinceCreation);

  return Math.min(1, decayedSalience + accessBoost * 0.2);
}

// Truncate text to fit token limit
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);

  if (estimatedTokens <= maxTokens) {
    return text;
  }

  const ratio = maxTokens / estimatedTokens;
  const targetLength = Math.floor(text.length * ratio);

  return text.slice(0, targetLength) + '...';
}

// Generate a unique conversation key
export function generateConversationKey(userId: string, agentId: string, channelId?: string): string {
  return channelId ? `${userId}:${agentId}:${channelId}` : `${userId}:${agentId}`;
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry with exponential backoff
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await sleep(baseDelay * Math.pow(2, i));
      }
    }
  }

  throw lastError;
}
