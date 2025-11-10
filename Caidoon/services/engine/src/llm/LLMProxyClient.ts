import {
  ILLMProvider,
  EncounterGenerationRequest,
  EncounterGenerationResponse,
  LLMProviderCapabilities,
  LLMProviderHealth,
} from '@ai-encounters/core';
import crypto from 'crypto';
import { config } from '../config.js';
import { logger } from '../server.js';

/**
 * LLM Proxy Client implementation
 * Connects to the LLM Proxy service for encounter generation
 */
export class LLMProxyClient implements ILLMProvider {
  public readonly name = 'llm-proxy';
  public readonly version = '1.0.0';

  private readonly baseUrl: string;
  private readonly hmacSecret: string;

  constructor(baseUrl?: string, hmacSecret?: string) {
    this.baseUrl = baseUrl || config.llmProxyUrl;
    this.hmacSecret = hmacSecret || config.hmacSecret;
  }

  getCapabilities(): LLMProviderCapabilities {
    return {
      supportsStreaming: false,
      supportsImages: false,
      supportsAudio: false,
      maxTokens: 4096,
      supportedModels: ['gpt-4', 'gpt-3.5-turbo'],
    };
  }

  async initialize(): Promise<void> {
    logger.info({ baseUrl: this.baseUrl }, 'LLMProxyClient initialized');
    // Test connection
    try {
      await this.healthCheck();
    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : String(error),
      }, 'LLM Proxy health check failed during initialization');
    }
  }

  async generateEncounter(request: EncounterGenerationRequest): Promise<EncounterGenerationResponse> {
    const startTime = Date.now();
    const endpoint = `${this.baseUrl}/gen/encounter`;
    const body = JSON.stringify(request);
    const signature = this.generateHMAC(body);
    const correlationId = crypto.randomUUID();

    logger.info({
      correlationId,
      endpoint,
      difficulty: request.difficulty,
      theme: request.theme,
    }, 'Calling LLM Proxy to generate encounter');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-HMAC-Signature': signature,
          'X-Correlation-ID': correlationId,
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({
          correlationId,
          endpoint,
          statusCode: response.status,
          error: errorText,
        }, 'LLM Proxy request failed');
        
        throw new Error(
          `LLM Proxy request failed with status ${response.status}: ${errorText}`
        );
      }

      const data = await response.json() as any;
      const generationTime = Date.now() - startTime;

      logger.info({
        correlationId,
        endpoint,
        generationTime,
        tokensUsed: data.tokensUsed,
        model: data.model,
      }, 'LLM Proxy encounter generation completed');

      // Return full response with metadata
      return {
        encounter: data.encounter,
        model: data.model || 'unknown',
        tokensUsed: data.tokensUsed,
        generationTime,
        cost: data.cost,
      };
    } catch (error) {
      logger.error({
        correlationId,
        endpoint,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Failed to generate encounter');
      
      throw new Error(
        `Failed to communicate with LLM Proxy: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async healthCheck(): Promise<LLMProviderHealth> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        logger.debug({
          baseUrl: this.baseUrl,
          statusCode: response.status,
          latency,
        }, 'LLM Proxy health check returned non-OK status');
        
        return {
          available: false,
          latency,
          errorRate: 1.0,
        };
      }

      const data = await response.json() as any;

      return {
        available: true,
        latency,
        errorRate: data.errorRate,
        quotaRemaining: data.quotaRemaining,
      };
    } catch (error) {
      logger.error({
        baseUrl: this.baseUrl,
        error: error instanceof Error ? error.message : String(error),
      }, 'LLM Proxy health check failed');
      
      return {
        available: false,
        latency: Date.now() - startTime,
        errorRate: 1.0,
      };
    }
  }

  async shutdown(): Promise<void> {
    logger.info('LLMProxyClient shutdown complete');
  }

  private generateHMAC(data: string): string {
    return crypto
      .createHmac('sha256', this.hmacSecret)
      .update(data)
      .digest('hex');
  }
}
