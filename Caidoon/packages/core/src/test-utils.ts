import type { EncounterSpec, Objective, NPC, DialogueLine, Reward } from './types/encounter.js';
import type { Session, SessionState } from './types/session.js';
import type { PlayerContext } from './types/player.js';

/**
 * Test utilities and mock data generators for AI Encounters Engine
 */

// ============================================================================
// Mock Data Generators
// ============================================================================

/**
 * Creates a mock DialogueLine
 */
export function createMockDialogueLine(overrides?: Partial<DialogueLine>): DialogueLine {
  return {
    trigger: 'greeting',
    text: 'Hello, adventurer!',
    ...overrides
  };
}

/**
 * Creates a mock NPC
 */
export function createMockNPC(overrides?: Partial<NPC>): NPC {
  return {
    id: 'npc_test_001',
    name: 'Test NPC',
    role: 'quest_giver',
    dialogue: [
      createMockDialogueLine({ trigger: 'greeting', text: 'Welcome!' }),
      createMockDialogueLine({ trigger: 'quest_accept', text: 'Thank you for helping!' })
    ],
    ...overrides
  };
}

/**
 * Creates a mock Objective
 */
export function createMockObjective(overrides?: Partial<Objective>): Objective {
  return {
    id: 'obj_test_001',
    description: 'Test objective',
    type: 'collect',
    target: 'test_item',
    quantity: 5,
    completed: false,
    ...overrides
  };
}

/**
 * Creates a mock Reward
 */
export function createMockReward(overrides?: Partial<Reward>): Reward {
  return {
    type: 'currency',
    amount: 100,
    ...overrides
  };
}

/**
 * Creates a mock EncounterSpec
 */
export function createMockEncounterSpec(overrides?: Partial<EncounterSpec>): EncounterSpec {
  return {
    id: 'enc_test_001',
    title: 'Test Encounter',
    description: 'A test encounter for unit testing',
    objectives: [
      createMockObjective({ id: 'obj_1', description: 'Collect 5 items' }),
      createMockObjective({ id: 'obj_2', description: 'Talk to NPC', type: 'interact' })
    ],
    npcs: [
      createMockNPC({ id: 'npc_1', name: 'Test Merchant' })
    ],
    rewards: [
      createMockReward({ type: 'currency', amount: 100 }),
      createMockReward({ type: 'experience', amount: 50 })
    ],
    difficulty: 'medium',
    estimatedDuration: 30,
    ...overrides
  };
}

/**
 * Creates a mock PlayerContext
 */
export function createMockPlayerContext(overrides?: Partial<PlayerContext>): PlayerContext {
  return {
    playerId: 'player_test_001',
    level: 5,
    preferences: ['combat', 'exploration'],
    history: ['enc_previous_001', 'enc_previous_002'],
    ...overrides
  };
}

/**
 * Creates a mock SessionState
 */
export function createMockSessionState(overrides?: Partial<SessionState>): SessionState {
  return {
    currentObjectiveIndex: 0,
    objectivesCompleted: [],
    npcInteractions: {},
    ...overrides
  };
}

/**
 * Creates a mock Session
 */
export function createMockSession(overrides?: Partial<Session>): Session {
  return {
    sessionId: 'session_test_001',
    playerId: 'player_test_001',
    encounter: createMockEncounterSpec(),
    state: createMockSessionState(),
    startedAt: new Date().toISOString(),
    ...overrides
  };
}

// ============================================================================
// Test Server Utilities
// ============================================================================

/**
 * Creates a test server configuration
 */
export interface TestServerConfig {
  port?: number;
  hmacSecret?: string;
  llmProxyUrl?: string;
  storageDir?: string;
}

/**
 * Default test server configuration
 */
export const defaultTestServerConfig: TestServerConfig = {
  port: 0, // Random available port
  hmacSecret: 'test-hmac-secret-key',
  llmProxyUrl: 'http://localhost:3002',
  storageDir: './test-data/sessions'
};

/**
 * Creates environment variables for test server
 */
export function createTestEnv(config: TestServerConfig = {}): Record<string, string> {
  const finalConfig = { ...defaultTestServerConfig, ...config };
  
  return {
    PORT: finalConfig.port?.toString() || '0',
    HMAC_SECRET: finalConfig.hmacSecret || 'test-hmac-secret-key',
    LLM_PROXY_URL: finalConfig.llmProxyUrl || 'http://localhost:3002',
    STORAGE_DIR: finalConfig.storageDir || './test-data/sessions',
    NODE_ENV: 'test'
  };
}

/**
 * Cleanup utility for test data
 */
export async function cleanupTestData(storageDir: string): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  try {
    const fullPath = path.resolve(storageDir);
    await fs.rm(fullPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore errors if directory doesn't exist
  }
}

/**
 * Wait utility for async operations in tests
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility for flaky operations in tests
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; delayMs?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 100 } = options;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      await wait(delayMs);
    }
  }
  
  throw new Error('Retry failed');
}
