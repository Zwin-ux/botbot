// Unit tests for builtin skills: converse and webSearch with mock adapters.
import converseSkill from '../src/lib/skills/builtins/converse';
import webSearchSkill from '../src/lib/skills/builtins/webSearch';
import { SkillContext } from '../src/lib/skills/skill';

const mockContext: SkillContext = {
  userId: 'user1',
  sessionId: 'sess1',
  userMessage: 'test message',
  timestamp: Date.now(),
};

describe('Converse Skill', () => {
  it('should have correct metadata', () => {
    expect(converseSkill.name).toBe('converse');
    expect(converseSkill.description).toBeDefined();
    expect(typeof converseSkill.execute).toBe('function');
  });

  it('should execute and return success with mock LLM', async () => {
    const result = await converseSkill.execute(mockContext);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should include reply in data', async () => {
    const result = await converseSkill.execute(mockContext);
    expect(result.success).toBe(true);
    expect((result.data as { reply: string }).reply).toContain('test message');
  });
});

describe('WebSearch Skill', () => {
  it('should have correct metadata', () => {
    expect(webSearchSkill.name).toBe('webSearch');
    expect(webSearchSkill.description).toBeDefined();
    expect(typeof webSearchSkill.execute).toBe('function');
  });

  it('should execute and return success with mock search', async () => {
    const result = await webSearchSkill.execute(mockContext);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should return search results array', async () => {
    const result = await webSearchSkill.execute(mockContext);
    expect(result.success).toBe(true);
    expect(Array.isArray((result.data as { results: string[] }).results)).toBe(true);
  });
});
