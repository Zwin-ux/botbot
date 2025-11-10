import { describe, it, expect } from 'vitest';
import { validatePlayerContext } from '../validatePlayerContext.js';

describe('validatePlayerContext', () => {
  describe('valid player context acceptance', () => {
    it('should accept a valid player context with only playerId', () => {
      const context = {
        playerId: 'player_123'
      };
      
      const result = validatePlayerContext(context);
      
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(context);
      }
    });

    it('should accept a valid player context with all fields', () => {
      const context = {
        playerId: 'player_123',
        level: 10,
        preferences: ['combat', 'exploration'],
        history: ['completed_quest_1', 'visited_town_2']
      };
      
      const result = validatePlayerContext(context);
      
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(context);
      }
    });

    it('should accept player context with level 0', () => {
      const context = {
        playerId: 'player_123',
        level: 0
      };
      
      const result = validatePlayerContext(context);
      expect(result.valid).toBe(true);
    });

    it('should accept player context with empty preferences array', () => {
      const context = {
        playerId: 'player_123',
        preferences: []
      };
      
      const result = validatePlayerContext(context);
      expect(result.valid).toBe(true);
    });

    it('should accept player context with empty history array', () => {
      const context = {
        playerId: 'player_123',
        history: []
      };
      
      const result = validatePlayerContext(context);
      expect(result.valid).toBe(true);
    });
  });

  describe('validation of playerId field', () => {
    it('should reject non-object input', () => {
      const result = validatePlayerContext('not an object');
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('PlayerContext must be an object');
      }
    });

    it('should reject null input', () => {
      const result = validatePlayerContext(null);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('PlayerContext must be an object');
      }
    });

    it('should reject array input', () => {
      const result = validatePlayerContext([]);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('PlayerContext must be an object');
      }
    });

    it('should reject missing playerId', () => {
      const context = {};
      
      const result = validatePlayerContext(context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('playerId must be a non-empty string');
      }
    });

    it('should reject empty playerId', () => {
      const context = {
        playerId: ''
      };
      
      const result = validatePlayerContext(context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('playerId must be a non-empty string');
      }
    });

    it('should reject whitespace-only playerId', () => {
      const context = {
        playerId: '   '
      };
      
      const result = validatePlayerContext(context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('playerId must be a non-empty string');
      }
    });

    it('should reject non-string playerId', () => {
      const context = {
        playerId: 123
      };
      
      const result = validatePlayerContext(context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('playerId must be a non-empty string');
      }
    });
  });

  describe('optional fields (level, preferences, history)', () => {
    it('should accept context without level field', () => {
      const context = {
        playerId: 'player_123'
      };
      
      const result = validatePlayerContext(context);
      expect(result.valid).toBe(true);
    });

    it('should accept context without preferences field', () => {
      const context = {
        playerId: 'player_123'
      };
      
      const result = validatePlayerContext(context);
      expect(result.valid).toBe(true);
    });

    it('should accept context without history field', () => {
      const context = {
        playerId: 'player_123'
      };
      
      const result = validatePlayerContext(context);
      expect(result.valid).toBe(true);
    });

    it('should accept valid level field', () => {
      const context = {
        playerId: 'player_123',
        level: 50
      };
      
      const result = validatePlayerContext(context);
      expect(result.valid).toBe(true);
    });

    it('should accept valid preferences array', () => {
      const context = {
        playerId: 'player_123',
        preferences: ['combat', 'stealth', 'magic']
      };
      
      const result = validatePlayerContext(context);
      expect(result.valid).toBe(true);
    });

    it('should accept valid history array', () => {
      const context = {
        playerId: 'player_123',
        history: ['event_1', 'event_2', 'event_3']
      };
      
      const result = validatePlayerContext(context);
      expect(result.valid).toBe(true);
    });
  });

  describe('rejection of invalid data types', () => {
    it('should reject negative level', () => {
      const context = {
        playerId: 'player_123',
        level: -5
      };
      
      const result = validatePlayerContext(context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('level must be a non-negative number if provided');
      }
    });

    it('should reject non-number level', () => {
      const context = {
        playerId: 'player_123',
        level: '10'
      };
      
      const result = validatePlayerContext(context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('level must be a non-negative number if provided');
      }
    });

    it('should reject NaN level', () => {
      const context = {
        playerId: 'player_123',
        level: NaN
      };
      
      const result = validatePlayerContext(context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('level must be a non-negative number if provided');
      }
    });

    it('should reject non-array preferences', () => {
      const context = {
        playerId: 'player_123',
        preferences: 'combat'
      };
      
      const result = validatePlayerContext(context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('preferences must be an array if provided');
      }
    });

    it('should reject preferences array with non-string elements', () => {
      const context = {
        playerId: 'player_123',
        preferences: ['combat', 123, 'stealth']
      };
      
      const result = validatePlayerContext(context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('preferences must be an array of strings');
      }
    });

    it('should reject preferences array with mixed types', () => {
      const context = {
        playerId: 'player_123',
        preferences: ['combat', null, undefined]
      };
      
      const result = validatePlayerContext(context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('preferences must be an array of strings');
      }
    });

    it('should reject non-array history', () => {
      const context = {
        playerId: 'player_123',
        history: 'event_1'
      };
      
      const result = validatePlayerContext(context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('history must be an array if provided');
      }
    });

    it('should reject history array with non-string elements', () => {
      const context = {
        playerId: 'player_123',
        history: ['event_1', 456, 'event_2']
      };
      
      const result = validatePlayerContext(context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('history must be an array of strings');
      }
    });

    it('should reject history array with object elements', () => {
      const context = {
        playerId: 'player_123',
        history: ['event_1', { event: 'event_2' }]
      };
      
      const result = validatePlayerContext(context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('history must be an array of strings');
      }
    });
  });

  describe('multiple validation errors', () => {
    it('should report all validation errors at once', () => {
      const context = {
        playerId: '',
        level: -1,
        preferences: 'not an array',
        history: [123, 456]
      };
      
      const result = validatePlayerContext(context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThan(1);
        expect(result.errors).toContain('playerId must be a non-empty string');
        expect(result.errors).toContain('level must be a non-negative number if provided');
        expect(result.errors).toContain('preferences must be an array if provided');
        expect(result.errors).toContain('history must be an array of strings');
      }
    });
  });
});
