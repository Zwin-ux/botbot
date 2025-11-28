/**
 * Platform Adapter Types
 * Interface definitions for platform-specific adapters
 */

import { CoreMessage, CoreResponse } from '../core/types';

/**
 * Platform Adapter Interface
 * All platform adapters must implement this interface
 */
export interface PlatformAdapter {
  /** Unique identifier for this platform */
  platformId: string;

  /** Initialize the adapter and establish connection */
  initialize(): Promise<void>;

  /** Gracefully shutdown the adapter */
  shutdown(): Promise<void>;

  /** Convert platform-specific event to CoreMessage */
  normalizeEvent(event: unknown): CoreMessage;

  /** Convert CoreResponse to platform-specific format */
  formatResponse(response: CoreResponse): unknown;

  /** Send a message to a specific channel */
  sendMessage(channelId: string, response: unknown): Promise<void>;

  /** Register callback for connection loss */
  onConnectionLost(callback: () => void): void;

  /** Attempt to reconnect to the platform */
  reconnect(): Promise<void>;
}

/**
 * Adapter connection state
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * Adapter configuration options
 */
export interface AdapterConfig {
  /** Maximum retry attempts for reconnection */
  maxRetries: number;
  /** Initial delay in ms for exponential backoff */
  initialDelayMs: number;
  /** Maximum delay in ms for exponential backoff */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
}

/**
 * Default adapter configuration
 */
export const DEFAULT_ADAPTER_CONFIG: AdapterConfig = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};
