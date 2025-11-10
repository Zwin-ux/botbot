import { EncounterSpec, Reward } from '@ai-encounters/core';
import { GenerateEncounterRequest, GenerateRewardRequest } from '../openai.js';
import {
  LLMProvider,
  ProviderConfig,
  ProviderHealth,
  ProviderMetrics,
} from './types.js';

/**
 * Base class for all LLM providers
 * Provides common functionality like metrics tracking
 */
export abstract class BaseProvider implements LLMProvider {
  readonly name: string;
  readonly config: ProviderConfig;

  protected metrics: ProviderMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageLatency: 0,
    estimatedCost: 0,
  };

  constructor(name: string, config: ProviderConfig) {
    this.name = name;
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract generateEncounter(request: GenerateEncounterRequest): Promise<EncounterSpec>;
  abstract generateReward(request: GenerateRewardRequest): Promise<Reward[]>;
  abstract healthCheck(): Promise<ProviderHealth>;
  abstract estimateCost(request: GenerateEncounterRequest | GenerateRewardRequest): number;

  getMetrics(): ProviderMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      estimatedCost: 0,
    };
  }

  /**
   * Track a successful request with latency and cost
   */
  protected trackSuccess(latencyMs: number, cost: number): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this.metrics.lastRequestAt = new Date().toISOString();
    this.metrics.estimatedCost += cost;

    // Update average latency using running average
    const totalLatency = this.metrics.averageLatency * (this.metrics.totalRequests - 1);
    this.metrics.averageLatency = (totalLatency + latencyMs) / this.metrics.totalRequests;
  }

  /**
   * Track a failed request
   */
  protected trackFailure(): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    this.metrics.lastRequestAt = new Date().toISOString();
  }

  /**
   * Execute a provider operation with metrics tracking
   */
  protected async executeWithMetrics<T>(
    operation: () => Promise<T>,
    costEstimate: number
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      const latency = Date.now() - startTime;
      this.trackSuccess(latency, costEstimate);
      return result;
    } catch (error) {
      this.trackFailure();
      throw error;
    }
  }

  /**
   * Build a standardized log message
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const prefix = `[${this.name}]`;
    const fullMessage = `${prefix} ${message}`;

    switch (level) {
      case 'info':
        console.log(fullMessage);
        break;
      case 'warn':
        console.warn(fullMessage);
        break;
      case 'error':
        console.error(fullMessage);
        break;
    }
  }
}
