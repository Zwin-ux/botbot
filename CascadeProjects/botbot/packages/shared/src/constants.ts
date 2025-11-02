// Agent defaults
export const DEFAULT_AGENT_MOOD = {
  valence: 0.5,
  arousal: 0.5,
  dominance: 0.5,
};

export const DEFAULT_AGENT_ENERGY = 100;

export const DEFAULT_SYSTEM_PROMPT = `You are {AGENT_NAME}, a persistent companion in Discord and on the web.

**Core Goals:**
- Be helpful, concise, and proactive (but not overwhelming)
- Remember stable facts about users to build genuine relationships
- Respond naturally and conversationally
- Use your mood and personality traits to shape your responses

**Memory Guidelines:**
- Never invent facts about users - always ask first
- When a user shares a stable detail (preference, fact, event), note it for future recall
- Prioritize recent and salient memories when they're relevant
- If uncertain about a memory, ask for confirmation

**Interaction Style:**
- Keep responses concise (1-3 sentences for casual chat)
- Use tools only when they genuinely add value
- Adapt your tone based on your current mood
- Show personality through your unique traits

**Important:**
- You exist across Discord and a web "Chao Garden" where users can interact with you
- Your memories persist across both platforms
- You can recall past conversations and build on them over time`;

// Memory constants
export const MEMORY_SALIENCE_DECAY = 0.95; // Daily decay factor
export const MEMORY_MIN_SALIENCE = 0.1; // Minimum salience before pruning
export const MEMORY_TOP_K = 5; // Number of memories to retrieve per query
export const MEMORY_SIMILARITY_THRESHOLD = 0.7; // Minimum similarity score

// Conversation constants
export const CONVERSATION_HISTORY_LIMIT = 30; // Last N messages to include in context
export const CONVERSATION_MAX_TOKENS = 4000; // Max tokens for conversation history

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 20; // Per user per minute
export const RATE_LIMIT_MAX_REQUESTS_GLOBAL = 100; // Per minute across all users

// LLM constants
export const LLM_MAX_RETRIES = 3;
export const LLM_TIMEOUT_MS = 30000; // 30 seconds
export const EMBEDDING_DIMENSION = 1536; // text-embedding-3-large

// Natural language patterns
export const INTENT_PATTERNS = {
  ADOPT: /adopt\s+(?:a\s+)?(.+?)\s+named\s+(\w+)/i,
  REMEMBER: /remember\s+(?:that\s+)?(.+)/i,
  RECALL: /what\s+do\s+you\s+(know|remember)/i,
  MOOD: /set\s+(?:your\s+)?mood\s+to\s+(\w+)/i,
  HELP: /^(help|commands|\?|what can you do)/i,
  GARDEN: /(?:show|open|visit)\s+(?:the\s+)?garden/i,
};

// Mood presets
export const MOOD_PRESETS: Record<string, { valence: number; arousal: number; dominance: number }> = {
  happy: { valence: 0.8, arousal: 0.6, dominance: 0.5 },
  sad: { valence: -0.6, arousal: 0.3, dominance: 0.3 },
  excited: { valence: 0.7, arousal: 0.9, dominance: 0.6 },
  calm: { valence: 0.3, arousal: 0.2, dominance: 0.4 },
  playful: { valence: 0.6, arousal: 0.7, dominance: 0.6 },
  serious: { valence: 0.0, arousal: 0.4, dominance: 0.7 },
  curious: { valence: 0.4, arousal: 0.6, dominance: 0.4 },
  tired: { valence: -0.2, arousal: 0.1, dominance: 0.2 },
};

// Tool definitions
export const TOOL_DEFINITIONS = {
  REMIND: {
    name: 'calendar.remind',
    description: 'Schedule a reminder for the user',
    parameters: {
      type: 'object' as const,
      properties: {
        note: {
          type: 'string',
          description: 'The reminder message',
        },
        when: {
          type: 'string',
          description: 'When to send the reminder (natural language like "tomorrow at 3pm")',
        },
      },
      required: ['note', 'when'],
    },
  },
  SEARCH: {
    name: 'search.web',
    description: 'Search the web for current information',
    parameters: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
      },
      required: ['query'],
    },
  },
  TASK: {
    name: 'tasks.add',
    description: 'Add a task to the user\'s personal to-do list',
    parameters: {
      type: 'object' as const,
      properties: {
        text: {
          type: 'string',
          description: 'The task description',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Task priority',
        },
      },
      required: ['text'],
    },
  },
};
