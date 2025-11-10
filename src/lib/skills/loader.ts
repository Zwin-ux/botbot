// Dynamic skill loader for builtin skills; validates shape at runtime with zod.
// Env vars used: none.

import { Skill } from './skill';
import { z } from 'zod';

const SkillModuleSchema = z.object({
  default: z.custom<Skill>((val) => {
    if (typeof val !== 'object' || val === null) return false;
    const s = val as Record<string, unknown>;
    return (
      typeof s.name === 'string' &&
      typeof s.description === 'string' &&
      typeof s.execute === 'function'
    );
  }),
});

const BUILTIN_SKILLS = ['converse', 'webSearch'];

export async function loadBuiltinSkills(): Promise<Skill[]> {
  const skills: Skill[] = [];
  for (const name of BUILTIN_SKILLS) {
    try {
      // Dynamic require for builtins
      const mod = await import(`./builtins/${name}`);
      const parsed = SkillModuleSchema.safeParse(mod);
      if (!parsed.success) {
        throw new Error(`Skill ${name} failed validation: ${parsed.error.message}`);
      }
      skills.push(parsed.data.default);
    } catch (err) {
      console.error(`Failed to load builtin skill ${name}:`, err);
    }
  }
  return skills;
}
