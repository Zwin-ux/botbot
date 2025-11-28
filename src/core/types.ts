/**
 * Core Service Types
 * Platform-agnostic message and response types for BotBot v2
 */

/**
 * Normalized message format from any platform
 */
export interface CoreMessage {
  id: string;
  userId: string;           // Unified user ID
  platformId: string;       // 'discord' | 'slack' | 'web'
  platformUserId: string;   // Platform-specific user ID
  channelId: string;        // Platform-specific channel/conversation ID
  content: string;          // Message text
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Response from the Core Service
 */
export interface CoreResponse {
  text: string;
  richContent?: RichContent;
  events: InternalEvent[];
  metadata?: Record<string, unknown>;
}

/**
 * Rich content for platform-specific rendering
 */
export interface RichContent {
  type: 'embed' | 'card' | 'buttons';
  title?: string;
  description?: string;
  fields?: Array<{ name: string; value: string }>;
  actions?: Array<{ id: string; label: string; style?: string }>;
}

/**
 * Internal events emitted during message processing
 */
export interface InternalEvent {
  type: 'memory_stored' | 'tool_invoked' | 'persona_switched' | 'user_created';
  payload: Record<string, unknown>;
}

/**
 * Supported platform identifiers
 */
export type PlatformId = 'discord' | 'slack' | 'web';

/**
 * Error response structure
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
