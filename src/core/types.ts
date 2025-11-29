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
  platformId: string;       // 'discord' | 'slack' | 'web' | 'sms'
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
  debug?: DebugFrame;
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
  type: 'memory_stored' | 'tool_invoked' | 'persona_switched' | 'user_created' | 'intent_detected';
  payload: Record<string, unknown>;
}

/**
 * Supported platform identifiers
 */
export type PlatformId = 'discord' | 'slack' | 'web' | 'sms';

/**
 * Error response structure
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// --- New Companion Types ---

/**
 * User Identity & Preferences
 * Tracks *who* the user is, distinct from what they say.
 */
export interface UserProfile {
  id: string;
  name: string;
  preferredTone: 'formal' | 'casual' | 'playful' | 'concise';
  interactionRhythm: 'fast' | 'slow' | 'sporadic';
  doNotMention: string[];
  lastInteraction: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Message Intent
 * Why the user is messaging.
 */
export type IntentType = 'chat' | 'task' | 'help' | 'reflection' | 'command';

export interface Intent {
  type: IntentType;
  confidence: number;
  metadata?: Record<string, unknown>;
}

/**
 * Bot Persona
 * Defines a specific mode of interaction with boundaries.
 */
export interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  constraints: string[];     // e.g. "No emojis", "Max 50 words"
  escalationRules: string[]; // e.g. "If user asks for code, switch to Engineer"
  tone: UserProfile['preferredTone'];
}

/**
 * Debug Traceability
 * Logs the decision-making process for a single turn.
 */
export interface DebugFrame {
  timestamp: number;
  personaId: string;
  intent: Intent;
  memoryUsed: string[]; // IDs of vector entries or short-term context
  platform: PlatformId;
  reasoning: string;
}

/**
 * Short-Term Conversation Context
 * Sliding window of recent interactions.
 */
export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  intent?: IntentType;
}
