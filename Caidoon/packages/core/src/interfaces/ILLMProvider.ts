import { EncounterSpec } from '../types/encounter.js';
import { PlayerContext } from '../types/player.js';

/**
 * Request for encounter generation
 */
export interface EncounterGenerationRequest {
  playerContext?: PlayerContext;
  difficulty?: 'easy' | 'medium' | 'hard';
  difficultyLevel?: number; // Numeric difficulty from 0.1 to 1.0 for dynamic adjustment
  theme?: string;
  constraints?: EncounterConstraints;
}

/**
 * Constraints for encounter generation
 */
export interface EncounterConstraints {
  maxObjectives?: number;
  minObjectives?: number;
  requireNPCs?: boolean;
  estimatedDurationMinutes?: number;
  forbiddenThemes?: string[];
}

/**
 * Response from encounter generation
 */
export interface EncounterGenerationResponse {
  encounter: EncounterSpec;
  model: string;
  tokensUsed?: number;
  generationTime?: number;
  cost?: number;
}

/**
 * Provider capabilities
 */
export interface LLMProviderCapabilities {
  supportsStreaming: boolean;
  supportsImages: boolean;
  supportsAudio: boolean;
  maxTokens: number;
  supportedModels: string[];
}

/**
 * Provider health status
 */
export interface LLMProviderHealth {
  available: boolean;
  latency?: number;
  errorRate?: number;
  quotaRemaining?: number;
}

/**
 * LLM Provider interface for pluggable AI backends
 * Enables multiple LLM providers (OpenAI, Anthropic, local models, etc.)
 */
export interface ILLMProvider {
  /**
   * Unique name of the LLM provider
   */
  readonly name: string;

  /**
   * Provider version
   */
  readonly version: string;

  /**
   * Get provider capabilities
   */
  getCapabilities(): LLMProviderCapabilities;

  /**
   * Initialize the LLM provider
   * Called once during server startup
   */
  initialize(): Promise<void>;

  /**
   * Generate a complete encounter
   * Primary method for creating new encounters
   */
  generateEncounter(request: EncounterGenerationRequest): Promise<EncounterGenerationResponse>;

  /**
   * Check if the provider is available and healthy
   */
  healthCheck(): Promise<LLMProviderHealth>;

  /**
   * Cleanup and close connections
   * Called during server shutdown
   */
  shutdown(): Promise<void>;
}

/**
 * LLM Provider configuration
 */
export interface LLMProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
  [key: string]: unknown; // Allow provider-specific config
}
