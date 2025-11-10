import { describe, it, expect } from 'vitest';
import { validateEncounterSpec } from '../validateEncounterSpec.js';

describe('validateEncounterSpec', () => {
  // Valid encounter spec for reuse
  const validEncounterSpec = {
    id: 'enc_123',
    title: 'Test Encounter',
    description: 'A test encounter',
    difficulty: 'medium' as const,
    estimatedDuration: 30,
    objectives: [
      {
        id: 'obj_1',
        description: 'Collect items',
        type: 'collect' as const,
        target: 'gold',
        quantity: 10,
        completed: false
      }
    ],
    npcs: [
      {
        id: 'npc_1',
        name: 'Guard',
        role: 'Quest Giver',
        dialogue: [
          {
            trigger: 'greeting',
            text: 'Hello adventurer!'
          }
        ]
      }
    ],
    rewards: [
      {
        type: 'currency' as const,
        amount: 100
      }
    ]
  };

  describe('valid encounter spec acceptance', () => {
    it('should accept a valid encounter spec', () => {
      const result = validateEncounterSpec(validEncounterSpec);
      
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(validEncounterSpec);
      }
    });

    it('should accept encounter with multiple objectives', () => {
      const spec = {
        ...validEncounterSpec,
        objectives: [
          { id: 'obj_1', description: 'Collect gold', type: 'collect' as const, completed: false },
          { id: 'obj_2', description: 'Defeat boss', type: 'eliminate' as const, completed: false }
        ]
      };
      
      const result = validateEncounterSpec(spec);
      expect(result.valid).toBe(true);
    });

    it('should accept encounter with empty npcs array', () => {
      const spec = { ...validEncounterSpec, npcs: [] };
      
      const result = validateEncounterSpec(spec);
      expect(result.valid).toBe(true);
    });

    it('should accept encounter with empty rewards array', () => {
      const spec = { ...validEncounterSpec, rewards: [] };
      
      const result = validateEncounterSpec(spec);
      expect(result.valid).toBe(true);
    });
  });

  describe('rejection of missing required fields', () => {
    it('should reject non-object input', () => {
      const result = validateEncounterSpec('not an object');
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('EncounterSpec must be an object');
      }
    });

    it('should reject missing id', () => {
      const spec = { ...validEncounterSpec };
      delete (spec as any).id;
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('id must be a non-empty string');
      }
    });

    it('should reject empty id', () => {
      const spec = { ...validEncounterSpec, id: '' };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('id must be a non-empty string');
      }
    });

    it('should reject missing title', () => {
      const spec = { ...validEncounterSpec };
      delete (spec as any).title;
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('title must be a non-empty string');
      }
    });

    it('should reject missing description', () => {
      const spec = { ...validEncounterSpec };
      delete (spec as any).description;
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('description must be a non-empty string');
      }
    });

    it('should reject invalid difficulty', () => {
      const spec = { ...validEncounterSpec, difficulty: 'invalid' };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('difficulty must be one of: easy, medium, hard');
      }
    });

    it('should reject missing estimatedDuration', () => {
      const spec = { ...validEncounterSpec };
      delete (spec as any).estimatedDuration;
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.includes('estimatedDuration'))).toBe(true);
      }
    });

    it('should reject zero or negative estimatedDuration', () => {
      const spec = { ...validEncounterSpec, estimatedDuration: 0 };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('estimatedDuration must be a positive number');
      }
    });
  });

  describe('validation of objectives array', () => {
    it('should reject missing objectives', () => {
      const spec = { ...validEncounterSpec };
      delete (spec as any).objectives;
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('objectives must be an array');
      }
    });

    it('should reject empty objectives array', () => {
      const spec = { ...validEncounterSpec, objectives: [] };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('objectives must contain at least one objective');
      }
    });

    it('should reject objective with missing id', () => {
      const spec = {
        ...validEncounterSpec,
        objectives: [{ description: 'Test', type: 'collect' as const, completed: false }]
      };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('objectives[0].id must be a non-empty string');
      }
    });

    it('should reject objective with missing description', () => {
      const spec = {
        ...validEncounterSpec,
        objectives: [{ id: 'obj_1', type: 'collect' as const, completed: false }]
      };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('objectives[0].description must be a non-empty string');
      }
    });

    it('should reject objective with invalid type', () => {
      const spec = {
        ...validEncounterSpec,
        objectives: [{ id: 'obj_1', description: 'Test', type: 'invalid', completed: false }]
      };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('objectives[0].type must be one of: collect, eliminate, interact, reach');
      }
    });

    it('should reject objective with missing completed field', () => {
      const spec = {
        ...validEncounterSpec,
        objectives: [{ id: 'obj_1', description: 'Test', type: 'collect' as const }]
      };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('objectives[0].completed must be a boolean');
      }
    });

    it('should accept objective with optional target field', () => {
      const spec = {
        ...validEncounterSpec,
        objectives: [{
          id: 'obj_1',
          description: 'Test',
          type: 'collect' as const,
          target: 'gold',
          completed: false
        }]
      };
      
      const result = validateEncounterSpec(spec);
      expect(result.valid).toBe(true);
    });

    it('should accept objective with optional quantity field', () => {
      const spec = {
        ...validEncounterSpec,
        objectives: [{
          id: 'obj_1',
          description: 'Test',
          type: 'collect' as const,
          quantity: 10,
          completed: false
        }]
      };
      
      const result = validateEncounterSpec(spec);
      expect(result.valid).toBe(true);
    });
  });

  describe('validation of NPCs and dialogue', () => {
    it('should reject non-array npcs', () => {
      const spec = { ...validEncounterSpec, npcs: 'not an array' };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('npcs must be an array');
      }
    });

    it('should reject NPC with missing id', () => {
      const spec = {
        ...validEncounterSpec,
        npcs: [{ name: 'Guard', role: 'Quest Giver', dialogue: [] }]
      };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('npcs[0].id must be a non-empty string');
      }
    });

    it('should reject NPC with missing name', () => {
      const spec = {
        ...validEncounterSpec,
        npcs: [{ id: 'npc_1', role: 'Quest Giver', dialogue: [] }]
      };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('npcs[0].name must be a non-empty string');
      }
    });

    it('should reject NPC with missing role', () => {
      const spec = {
        ...validEncounterSpec,
        npcs: [{ id: 'npc_1', name: 'Guard', dialogue: [] }]
      };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('npcs[0].role must be a non-empty string');
      }
    });

    it('should reject NPC with non-array dialogue', () => {
      const spec = {
        ...validEncounterSpec,
        npcs: [{ id: 'npc_1', name: 'Guard', role: 'Quest Giver', dialogue: 'not an array' }]
      };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('npcs[0].dialogue must be an array');
      }
    });

    it('should reject dialogue line with missing trigger', () => {
      const spec = {
        ...validEncounterSpec,
        npcs: [{
          id: 'npc_1',
          name: 'Guard',
          role: 'Quest Giver',
          dialogue: [{ text: 'Hello!' }]
        }]
      };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('npcs[0].dialogue[0].trigger must be a non-empty string');
      }
    });

    it('should reject dialogue line with missing text', () => {
      const spec = {
        ...validEncounterSpec,
        npcs: [{
          id: 'npc_1',
          name: 'Guard',
          role: 'Quest Giver',
          dialogue: [{ trigger: 'greeting' }]
        }]
      };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('npcs[0].dialogue[0].text must be a non-empty string');
      }
    });

    it('should accept NPC with empty dialogue array', () => {
      const spec = {
        ...validEncounterSpec,
        npcs: [{
          id: 'npc_1',
          name: 'Guard',
          role: 'Quest Giver',
          dialogue: []
        }]
      };
      
      const result = validateEncounterSpec(spec);
      expect(result.valid).toBe(true);
    });
  });

  describe('validation of rewards', () => {
    it('should reject non-array rewards', () => {
      const spec = { ...validEncounterSpec, rewards: 'not an array' };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('rewards must be an array');
      }
    });

    it('should reject reward with invalid type', () => {
      const spec = {
        ...validEncounterSpec,
        rewards: [{ type: 'invalid', amount: 100 }]
      };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('rewards[0].type must be one of: currency, item, experience');
      }
    });

    it('should reject reward with missing amount', () => {
      const spec = {
        ...validEncounterSpec,
        rewards: [{ type: 'currency' as const }]
      };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.includes('amount'))).toBe(true);
      }
    });

    it('should reject reward with negative amount', () => {
      const spec = {
        ...validEncounterSpec,
        rewards: [{ type: 'currency' as const, amount: -10 }]
      };
      
      const result = validateEncounterSpec(spec);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('rewards[0].amount must be a non-negative number');
      }
    });

    it('should accept reward with optional itemId', () => {
      const spec = {
        ...validEncounterSpec,
        rewards: [{ type: 'item' as const, amount: 1, itemId: 'sword_123' }]
      };
      
      const result = validateEncounterSpec(spec);
      expect(result.valid).toBe(true);
    });

    it('should accept all valid reward types', () => {
      const spec = {
        ...validEncounterSpec,
        rewards: [
          { type: 'currency' as const, amount: 100 },
          { type: 'item' as const, amount: 1, itemId: 'item_1' },
          { type: 'experience' as const, amount: 500 }
        ]
      };
      
      const result = validateEncounterSpec(spec);
      expect(result.valid).toBe(true);
    });
  });
});
