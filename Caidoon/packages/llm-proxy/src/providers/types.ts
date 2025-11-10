import { EncounterSpec, Reward } from '@ai-encounters/core';
import { GenerateEncounterRequest, GenerateRewardRequest } from '../openai.js';

/**
 * Health status of an LLM provider
 */
export interface ProviderHealth {
  available: boolean;
  latency?: number;
  error?: string;
  lastChecked: string;
}

/**
 * Metrics for provider performance tracking
 */
export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  estimatedCost: number;
  lastRequestAt?: string;
}

/**
 * Configuration for a specific provider
 */
export interface ProviderConfig {
  name: string;
  apiKey?: string;
  apiEndpoint?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  priority: number; // Lower number = higher priority
}

/**
 * Abstract interface for LLM providers
 * All providers must implement this interface
 */
export interface LLMProvider {
  readonly name: string;
  readonly config: ProviderConfig;

  /**
   * Initialize the provider
   */
  initialize(): Promise<void>;

  /**
   * Generate an encounter using this provider
   */
  generateEncounter(request: GenerateEncounterRequest): Promise<EncounterSpec>;

  /**
   * Generate rewards using this provider
   */
  generateReward(request: GenerateRewardRequest): Promise<Reward[]>;

  /**
   * Check if the provider is healthy and available
   */
  healthCheck(): Promise<ProviderHealth>;

  /**
   * Estimate the cost of a generation request
   */
  estimateCost(request: GenerateEncounterRequest | GenerateRewardRequest): number;

  /**
   * Get current provider metrics
   */
  getMetrics(): ProviderMetrics;

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void;
}

/**
 * Provider selection strategy
 */
export type ProviderStrategy =
  | 'priority' // Use providers in priority order
  | 'round-robin' // Distribute requests evenly
  | 'least-cost' // Use the cheapest provider
  | 'fastest' // Use the provider with lowest latency
  | 'random'; // Random selection (useful for testing)

/**
 * Provider manager configuration
 */
export interface ProviderManagerConfig {
  strategy: ProviderStrategy;
  enableFallback: boolean;
  maxRetries: number;
  healthCheckInterval: number; // in milliseconds
}
