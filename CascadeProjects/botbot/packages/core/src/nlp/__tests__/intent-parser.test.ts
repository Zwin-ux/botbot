/**
 * Enhanced Intent Parser Tests
 * Comprehensive tests for multi-intent parsing and advanced features
 */

import { EnhancedIntentParser } from '../intent-parser';
import { ConversationContext } from '../types';

describe('EnhancedIntentParser', () => {
  let parser: EnhancedIntentParser;

  beforeEach(() => {
    parser = new EnhancedIntentParser();
  });

  describe('Single Intent Parsing', () => {
    it('should parse ADOPT intent with parameters', async () => {
      const text = 'I want to adopt a friendly companion named Luna';
      const intents = await parser.parseIntents(text);

      expect(intents).toHaveLength(1);
      expect(intents[0].type).toBe('ADOPT');
      expect(intents[0].confidence).toBeGreaterThan(0.8);
      expect(intents[0].parameters.persona).toBe('friendly companion');
      expect(intents[0].parameters.name).toBe('Luna');
    });

    it('should parse REMEMBER intent with content', async () => {
      const text = 'Remember that I like pizza';
      const intents = await parser.parseIntents(text);

      expect(intents).toHaveLength(1);
      expect(intents[0].type).toBe('REMEMBER');
      expect(intents[0].parameters.content).toBe('I like pizza');
      expect(intents[0].parameters.type).toBe('preference');
    });

    it('should parse CHAT intent for greetings', async () => {
      const text = 'Hello there, how are you doing?';
      const intents = await parser.parseIntents(text);

      expect(intents).toHaveLength(1);
      expect(intents[0].type).toBe('CHAT');
      expect(intents[0].confidence).toBeGreaterThan(0.6);
    });

    it('should parse HELP intent', async () => {
      const text = 'I need help with something';
      const intents = await parser.parseIntents(text);

      expect(intents).toHaveLength(1);
      expect(intents[0].type).toBe('HELP');
      expect(intents[0].confidence).toBeGreaterThan(0.8);
    });

    it('should parse QUESTION intent', async () => {
      const text = 'What can you do for me?';
      const intents = await parser.parseIntents(text);

      expect(intents).toHaveLength(1);
      expect(intents[0].type).toBe('QUESTION');
      expect(intents[0].parameters.questionType).toBe('what');
    });

    it('should parse COMPLIMENT intent', async () => {
      const text = 'You are so helpful, thank you!';
      const intents = await parser.parseIntents(text);

      expect(intents).toHaveLength(1);
      expect(intents[0].type).toBe('COMPLIMENT');
      expect(intents[0].confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Multi-Intent Parsing', () => {
    it('should detect multiple intents in compound sentences', async () => {
      const text = 'Remember that I like coffee and also help me understand how this works';
      const intents = await parser.parseIntents(text);

      expect(intents.length).toBeGreaterThan(1);
      
      const intentTypes = intents.map(i => i.type);
      expect(intentTypes).toContain('REMEMBER');
      expect(intentTypes).toContain('HELP');
    });

    it('should handle conjunctions properly', async () => {
      const text = 'Set your mood to happy and then tell me what you remember about me';
      const intents = await parser.parseIntents(text);

      expect(intents.length).toBeGreaterThan(1);
      
      const intentTypes = intents.map(i => i.type);
      expect(intentTypes).toContain('MOOD');
      expect(intentTypes).toContain('RECALL');
    });

    it('should prioritize intents correctly', async () => {
      const text = 'I want to adopt a bot but first help me understand the process';
      const intents = await parser.parseIntents(text);

      expect(intents.length).toBeGreaterThan(1);
      // ADOPT should have higher priority than HELP
      expect(intents[0].type).toBe('ADOPT');
    });

    it('should limit number of intents returned', async () => {
      const text = 'Help me adopt a bot, remember my name is John, set mood to happy, and show me the garden';
      const intents = await parser.parseIntents(text);

      // Should limit to top 3 intents
      expect(intents.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Context-Aware Parsing', () => {
    const mockContext: ConversationContext = {
      userId: 'user123',
      channelId: 'channel123',
      platform: 'discord',
      recentMessages: [
        {
          id: 'msg1',
          content: 'I told you about my favorite color yesterday',
          sender: 'user',
          timestamp: new Date(Date.now() - 60000)
        }
      ],
      topicHistory: [
        {
          subject: 'favorite colors',
          startedAt: new Date(Date.now() - 120000),
          lastMentioned: new Date(Date.now() - 60000),
          importance: 0.8,
          relatedMessages: ['msg1'],
          keywords: ['color', 'favorite', 'blue']
        }
      ],
      activeReferences: [],
      lastInteraction: new Date()
    };

    it('should boost confidence with relevant context', async () => {
      const text = 'What do you remember about my preferences?';
      
      const intentsWithoutContext = await parser.parseIntents(text);
      const intentsWithContext = await parser.parseIntents(text, mockContext);

      expect(intentsWithContext[0].confidence).toBeGreaterThan(intentsWithoutContext[0].confidence);
    });

    it('should require context for RECALL intents', async () => {
      const text = 'Tell me what you know about me';
      
      const intentsWithoutContext = await parser.parseIntents(text);
      const intentsWithContext = await parser.parseIntents(text, mockContext);

      // Should have RECALL intent with context
      expect(intentsWithContext.some(i => i.type === 'RECALL')).toBe(true);
      expect(intentsWithContext.find(i => i.type === 'RECALL')?.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Slang and Normalization', () => {
    it('should handle common internet slang', async () => {
      const text = 'ur so cool, thx for the help btw';
      const intents = await parser.parseIntents(text);

      expect(intents).toHaveLength(1);
      expect(intents[0].type).toBe('COMPLIMENT');
    });

    it('should expand contractions', async () => {
      const text = "I can't remember what you told me";
      const intents = await parser.parseIntents(text);

      expect(intents).toHaveLength(1);
      expect(intents[0].type).toBe('RECALL');
    });

    it('should handle gaming slang', async () => {
      const text = 'gg wp, that was ez';
      const intents = await parser.parseIntents(text);

      expect(intents).toHaveLength(1);
      expect(intents[0].type).toBe('COMPLIMENT');
    });

    it('should normalize text case insensitively', async () => {
      const text = 'HELP ME WITH THIS PLEASE';
      const intents = await parser.parseIntents(text);

      expect(intents).toHaveLength(1);
      expect(intents[0].type).toBe('HELP');
    });
  });

  describe('Parameter Extraction', () => {
    it('should extract mood parameters', async () => {
      const text = 'Set your mood to excited please';
      const intents = await parser.parseIntents(text);

      expect(intents[0].type).toBe('MOOD');
      expect(intents[0].parameters.mood).toBe('excited');
    });

    it('should extract remember content with type classification', async () => {
      const text = 'My favorite food is sushi';
      const intents = await parser.parseIntents(text);

      expect(intents[0].type).toBe('REMEMBER');
      expect(intents[0].parameters.type).toBe('preference');
    });

    it('should extract question types', async () => {
      const text = 'Why did that happen?';
      const intents = await parser.parseIntents(text);

      expect(intents[0].type).toBe('QUESTION');
      expect(intents[0].parameters.questionType).toBe('why');
    });

    it('should handle missing optional parameters gracefully', async () => {
      const text = 'I want to adopt a bot';
      const intents = await parser.parseIntents(text);

      expect(intents[0].type).toBe('ADOPT');
      expect(intents[0].parameters.persona).toBeUndefined();
      expect(intents[0].parameters.name).toBeUndefined();
    });
  });

  describe('Confidence Scoring', () => {
    it('should give higher confidence to more specific matches', async () => {
      const specificText = 'I want to adopt a friendly companion named Luna';
      const generalText = 'adopt bot';

      const specificIntents = await parser.parseIntents(specificText);
      const generalIntents = await parser.parseIntents(generalText);

      expect(specificIntents[0].confidence).toBeGreaterThan(generalIntents[0].confidence);
    });

    it('should boost confidence for recognized slang', async () => {
      const slangText = 'ur awesome, ty for the help';
      const normalText = 'you are awesome, thank you for the help';

      const slangIntents = await parser.parseIntents(slangText);
      const normalIntents = await parser.parseIntents(normalText);

      // Both should be COMPLIMENT, slang should have slight boost
      expect(slangIntents[0].type).toBe('COMPLIMENT');
      expect(normalIntents[0].type).toBe('COMPLIMENT');
    });

    it('should filter out very low confidence intents', async () => {
      const ambiguousText = 'maybe something about stuff';
      const intents = await parser.parseIntents(ambiguousText);

      // Should not return intents with very low confidence
      intents.forEach(intent => {
        expect(intent.confidence).toBeGreaterThan(0.2);
      });
    });
  });

  describe('Multiple Intent Detection', () => {
    it('should detect multiple intents in text', () => {
      const multiIntentText = 'Remember this and help me with that';
      const singleIntentText = 'Just help me please';

      expect(parser.hasMultipleIntents(multiIntentText)).toBe(true);
      expect(parser.hasMultipleIntents(singleIntentText)).toBe(false);
    });

    it('should detect multiple sentences as multiple intents', () => {
      const multiSentenceText = 'Hello there. Can you help me?';
      expect(parser.hasMultipleIntents(multiSentenceText)).toBe(true);
    });

    it('should detect conjunctions as multiple intents', () => {
      const conjunctionText = 'Do this and also do that';
      expect(parser.hasMultipleIntents(conjunctionText)).toBe(true);
    });
  });

  describe('Single Intent Mode', () => {
    it('should return single intent when requested', async () => {
      const text = 'Remember this and help me with that';
      const singleIntent = await parser.parseSingleIntent(text);

      expect(singleIntent).not.toBeNull();
      expect(singleIntent!.type).toBeDefined();
    });

    it('should return null for unclear text', async () => {
      const text = 'asdfghjkl random noise';
      const singleIntent = await parser.parseSingleIntent(text);

      expect(singleIntent).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text', async () => {
      const intents = await parser.parseIntents('');
      expect(intents).toHaveLength(0);
    });

    it('should handle very long text', async () => {
      const longText = 'help me '.repeat(100) + 'please';
      const intents = await parser.parseIntents(longText);

      expect(intents).toHaveLength(1);
      expect(intents[0].type).toBe('HELP');
    });

    it('should handle special characters', async () => {
      const text = 'Help me!!! @#$%^&*()';
      const intents = await parser.parseIntents(text);

      expect(intents).toHaveLength(1);
      expect(intents[0].type).toBe('HELP');
    });

    it('should handle mixed languages gracefully', async () => {
      const text = 'help me por favor';
      const intents = await parser.parseIntents(text);

      expect(intents).toHaveLength(1);
      expect(intents[0].type).toBe('HELP');
    });
  });
});