import { z } from 'zod';

// Re-export zod for convenience
export { z };

// Environment schema
export const envSchema = z.object({
  // Discord
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_PUBLIC_KEY: z.string().min(1),
  DISCORD_REDIRECT_URI: z.string().url(),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-large'),

  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Next.js
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

// Memory candidate schema (for LLM structured output)
export const memoryCandidateSchema = z.object({
  type: z.enum(['FACT', 'PREFERENCE', 'EVENT', 'EMOTION']),
  subject: z.string(),
  content: z.string(),
  confidence: z.number().min(0).max(1),
  expiryHint: z.string().optional(),
});

export const memoryCandidatesSchema = z.object({
  memories: z.array(memoryCandidateSchema),
});

// Agent creation schema
export const createAgentSchema = z.object({
  name: z.string().min(1).max(50),
  persona: z.string().min(10).max(500),
  traits: z.record(z.any()).optional(),
});

// Message schema
export const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  agentId: z.string(),
  userId: z.string(),
  channelType: z.enum(['DM', 'GUILD_TEXT', 'THREAD', 'WEB']),
  channelId: z.string().optional(),
});

// Tool call schema
export const toolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
});

// Agent mood schema
export const agentMoodSchema = z.object({
  valence: z.number().min(-1).max(1),
  arousal: z.number().min(0).max(1),
  dominance: z.number().min(0).max(1),
});

// Validate environment at runtime
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw new Error('Invalid environment configuration');
  }
}
