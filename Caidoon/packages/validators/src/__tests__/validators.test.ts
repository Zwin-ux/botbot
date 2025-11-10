import { describe, it, expect, beforeEach } from 'vitest';
import {
  validatePlayerContext,
} from '../validatePlayerContext';
import { validateEncounterSpec } from '../validateEncounterSpec';
import { validateSessionStartRequest } from '../validateSessionStartRequest';

describe('validatePlayerContext', () => {
  it('should validate correct player context', () => {
    const context = {
      playerId: 'player-123',
      level: 5,
      preferences: ['combat', 'exploration'],
    };
    const result = validatePlayerContext(context);
    expect(result.valid).toBe(true);
  });

  it('should fail with missing playerId', () => {
    const context = {
      level: 5,
      preferences: ['combat'],
    };
    const result = validatePlayerContext(context as any);
    expect(result.valid).toBe(false);
  });

  it('should fail with invalid level', () => {
    const context = {
      playerId: 'player-123',
      level: -1,
      preferences: ['combat'],
    };
    const result = validatePlayerContext(context);
    expect(result.valid).toBe(false);
  });

  it('should accept undefined preferences', () => {
    const context = {
      playerId: 'player-123',
      level: 10,
    };
    const result = validatePlayerContext(context as any);
    expect(result.valid).toBe(true);
  });
});

describe('validateEncounterSpec', () => {
  const validEncounter = {
    id: 'enc-1',
    title: 'Test Encounter',
    description: 'A test encounter',
    objectives: [
      {
        id: 'obj-1',
        description: 'Complete objective',
        type: 'collect',
        completed: false,
      },
    ],
    npcs: [
      {
        id: 'npc-1',
        name: 'Test NPC',
        role: 'ally',
        dialogue: [
          { trigger: 'start', text: 'Hello' },
        ],
      },
    ],
    rewards: [
      { type: 'experience', amount: 100 },
    ],
    difficulty: 'medium',
    estimatedDuration: 3600,
  };

  it('should validate correct encounter spec', () => {
    const result = validateEncounterSpec(validEncounter);
    expect(result.valid).toBe(true);
  });

  it('should fail with missing title', () => {
    const encounter = { ...validEncounter, title: '' };
    const result = validateEncounterSpec(encounter);
    expect(result.valid).toBe(false);
  });

  it('should fail with empty objectives', () => {
    const encounter = { ...validEncounter, objectives: [] };
    const result = validateEncounterSpec(encounter);
    expect(result.valid).toBe(false);
  });

  it('should fail with invalid difficulty', () => {
    const encounter = { ...validEncounter, difficulty: 'invalid' };
    const result = validateEncounterSpec(encounter);
    expect(result.valid).toBe(false);
  });
});

describe('validateSessionStartRequest', () => {
  it('should validate correct session start request', () => {
    const request = {
      playerId: 'player-123',
      context: {
        level: 5,
        preferences: ['combat'],
      },
    };
    const result = validateSessionStartRequest(request);
    expect(result.valid).toBe(true);
  });

  it('should fail with missing playerId', () => {
    const request = {
      context: { level: 5 },
    };
    const result = validateSessionStartRequest(request as any);
    expect(result.valid).toBe(false);
  });

  it('should validate request with any context (only playerId is validated)', () => {
    const request = {
      playerId: 'player-123',
      context: { level: -1 },
    };
    const result = validateSessionStartRequest(request);
    expect(result.valid).toBe(true);
  });
});
