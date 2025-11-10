// Unit tests for skill loader: verifies builtins are loaded and have correct shape.
import { loadBuiltinSkills } from '../src/lib/skills/loader';

describe('Skill Loader', () => {
  it('should load builtin skills', async () => {
    const skills = await loadBuiltinSkills();
    expect(skills.length).toBeGreaterThan(0);
  });

  it('should validate skill shape', async () => {
    const skills = await loadBuiltinSkills();
    for (const skill of skills) {
      expect(skill).toHaveProperty('name');
      expect(skill).toHaveProperty('description');
      expect(skill).toHaveProperty('execute');
      expect(typeof skill.name).toBe('string');
      expect(typeof skill.description).toBe('string');
      expect(typeof skill.execute).toBe('function');
    }
  });

  it('should load converse and webSearch skills', async () => {
    const skills = await loadBuiltinSkills();
    const names = skills.map((s) => s.name);
    expect(names).toContain('converse');
    expect(names).toContain('webSearch');
  });
});
