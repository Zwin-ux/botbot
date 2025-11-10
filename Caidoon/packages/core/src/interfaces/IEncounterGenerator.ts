import { EncounterSpec } from '../types/encounter.js';
import { PlayerContext } from '../types/player.js';

/**
 * Generation strategy metadata
 */
export interface GeneratorMetadata {
  name: string;
  description: string;
  tags: string[]; // e.g., ['narrative', 'procedural', 'themed']
  supportedDifficulties: Array<'easy' | 'medium' | 'hard'>;
  requiresLLM: boolean;
}

/**
 * Generation options
 */
export interface GenerationOptions {
  difficulty?: 'easy' | 'medium' | 'hard';
  theme?: string;
  playerContext?: PlayerContext;
  seed?: number; // For reproducible generation
  maxRetries?: number;
  timeout?: number;
}

/**
 * Generation result with metadata
 */
export interface GenerationResult {
  encounter: EncounterSpec;
  metadata: {
    generator: string;
    generationTime: number;
    seed?: number;
    llmTokensUsed?: number;
    quality?: number; // 0-1 quality score
  };
}

/**
 * Encounter generator interface for pluggable generation strategies
 * Enables multiple generation approaches (narrative, procedural, template-based, etc.)
 */
export interface IEncounterGenerator {
  /**
   * Generator metadata
   */
  getMetadata(): GeneratorMetadata;

  /**
   * Generate an encounter
   * @param options Generation options
   * @returns Generated encounter with metadata
   */
  generate(options: GenerationOptions): Promise<GenerationResult>;

  /**
   * Validate if this generator can handle the request
   * @param options Generation options
   * @returns True if generator supports these options
   */
  canGenerate(options: GenerationOptions): boolean;

  /**
   * Get estimated generation time
   * @param options Generation options
   * @returns Estimated time in milliseconds
   */
  estimateGenerationTime(options: GenerationOptions): number;
}
