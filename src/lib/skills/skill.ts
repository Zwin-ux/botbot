// Skill interface and types for BotBot plugin system.
// Env vars used: none (skills may use their own).

import { z } from 'zod';

export const SkillContextSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  userMessage: z.string(),
  timestamp: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export type SkillContext = z.infer<typeof SkillContextSchema>;

export const SkillResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type SkillResult = z.infer<typeof SkillResultSchema>;

export interface Skill {
  name: string;
  description: string;
  execute(context: SkillContext): Promise<SkillResult>;
}
