/**
 * Enhanced Natural Language Understanding Types
 * Core interfaces for the enhanced texting capabilities system
 */

// Input types
export interface MessageInput {
  content: string;
  platform: 'discord' | 'web';
  userId: string;
  channelId: string;
  attachments?: MediaAttachment[];
  timestamp: Date;
}

export interface MediaAttachment {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

// Core NLU output types
export interface ParsedMessage {
  intents: Intent[];
  emotionalTone: EmotionalTone;
  references: Reference[];
  complexity: 'simple' | 'multi-part' | 'complex';
  mediaAnalysis?: MediaAnalysis[];
  confidence: number;
}

export interface Intent {
  type: string;
  confidence: number;
  parameters: Record<string, any>;
  requiresContext: boolean;
  priority: number;
}

export interface EmotionalTone {
  primary: 'happy' | 'sad' | 'angry' | 'excited' | 'frustrated' | 'neutral' | 'confused' | 'anxious';
  intensity: number; // 0-1
  confidence: number; // 0-1
  indicators: string[]; // words/phrases that led to this assessment
  valence: number; // -1 to 1 (negative to positive)
  arousal: number; // 0 to 1 (calm to excited)
}

export interface Reference {
  type: 'pronoun' | 'demonstrative' | 'implicit' | 'temporal';
  text: string;
  resolvedTo?: string;
  confidence: number;
  contextRequired: boolean;
}

export interface MediaAnalysis {
  type: 'image' | 'video' | 'audio' | 'document';
  description: string;
  relevantContext: string[];
  suggestedResponse: string;
  confidence: number;
}

// Context types
export interface ConversationContext {
  userId: string;
  channelId: string;
  platform: 'discord' | 'web';
  recentMessages: ContextMessage[];
  topicHistory: Topic[];
  activeReferences: Reference[];
  lastInteraction: Date;
  contextSummary?: string;
  userPreferences?: UserPreferences;
}

export interface ContextMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent' | 'system';
  timestamp: Date;
  emotionalTone?: EmotionalTone;
  intents?: Intent[];
}

export interface Topic {
  subject: string;
  startedAt: Date;
  lastMentioned: Date;
  importance: number; // 0-1
  relatedMessages: string[];
  keywords: string[];
}

export interface UserPreferences {
  communicationStyle: 'formal' | 'casual' | 'playful' | 'professional';
  emojiPreference: 'none' | 'minimal' | 'moderate' | 'heavy';
  responseLength: 'brief' | 'moderate' | 'detailed';
  proactiveMessages: boolean;
  emotionalSensitivity: number; // 0-1
}

// Emotional intelligence types
export interface UserEmotionalState {
  primary: 'happy' | 'sad' | 'angry' | 'excited' | 'frustrated' | 'neutral' | 'confused' | 'anxious';
  intensity: number; // 0-1
  confidence: number; // 0-1
  indicators: string[];
  history: EmotionalSnapshot[];
  patterns: EmotionalPattern[];
}

export interface AgentMood {
  pleasure: number; // -1 to 1 (PAD model)
  arousal: number; // -1 to 1
  dominance: number; // -1 to 1
  lastUpdated: Date;
  triggers: string[];
  stability: number; // 0-1, how stable the mood is
}

export interface EmotionalSnapshot {
  timestamp: Date;
  userEmotion: EmotionalTone;
  agentMood: AgentMood;
  conversationTone: string;
  trigger?: string;
}

export interface EmotionalPattern {
  pattern: string;
  frequency: number;
  effectiveness: number; // how well agent responses worked
  lastSeen: Date;
}

export interface EmotionalResponse {
  toneAdjustment: 'supportive' | 'energetic' | 'calm' | 'playful' | 'gentle' | 'neutral';
  empathyLevel: number; // 0-1
  suggestedEmojis: string[];
  responseStyle: 'formal' | 'casual' | 'enthusiastic' | 'caring' | 'professional';
  adaptations: string[]; // specific adaptations to make
}

// Formatting types
export interface FormattedContent {
  text: string;
  platform: 'discord' | 'web';
  embeds?: DiscordEmbed[];
  attachments?: Attachment[];
  formatting: TextFormatting;
  metadata: FormattingMetadata;
}

export interface TextFormatting {
  bold: TextRange[];
  italic: TextRange[];
  code: TextRange[];
  lists: ListItem[];
  emojis: EmojiPlacement[];
}

export interface TextRange {
  start: number;
  end: number;
  text: string;
}

export interface ListItem {
  type: 'ordered' | 'unordered';
  items: string[];
  position: number;
}

export interface EmojiPlacement {
  emoji: string;
  position: number;
  reason: string; // why this emoji was chosen
}

export interface FormattingMetadata {
  originalLength: number;
  chunkCount: number;
  emojisAdded: string[];
  formattingApplied: string[];
  adaptations: string[];
}

// Delivery types
export interface MessageChunk {
  content: string;
  order: number;
  delay: number; // ms to wait before sending
  requiresTyping: boolean;
  type: 'text' | 'embed' | 'file';
  platform: 'discord' | 'web';
}

export interface DeliveryOptions {
  typingDelay: number;
  chunkDelay: number;
  maxChunkSize: number;
  respectRateLimit: boolean;
  naturalPacing: boolean;
}

export interface DeliveryPlan {
  chunks: MessageChunk[];
  fallbackAction?: 'dm' | 'summary' | 'file';
  estimatedDuration: number;
  totalSize: number;
}

export interface DeliveryMetadata {
  typingDuration: number;
  deliveryDelay: number;
  platform: 'discord' | 'web';
  chunkOrder?: number;
  success: boolean;
  error?: string;
}

// Proactive communication types
export interface FollowUpOpportunity {
  userId: string;
  type: 'check-in' | 'follow-up' | 'share-info' | 'special-occasion' | 'mood-support';
  context: string;
  priority: number; // 0-1
  scheduledFor: Date;
  relatedConversation?: string;
  emotionalContext?: EmotionalTone;
}

export interface ProactiveMessageType {
  category: 'social' | 'informational' | 'reminder' | 'celebration' | 'support';
  frequency: 'rare' | 'occasional' | 'regular';
  userOptIn: boolean;
  conditions: string[];
}

export interface ProactiveTask {
  id: string;
  type: ProactiveMessageType;
  scheduledFor: Date;
  context: string;
  userId: string;
  completed: boolean;
  attempts: number;
  lastAttempt?: Date;
}

// Sync types
export interface SyncedConversation {
  id: string;
  participants: Participant[];
  messages: ContextMessage[];
  context: ConversationContext;
  lastSyncedAt: Date;
  platforms: ('discord' | 'web')[];
  conflicts: SyncConflict[];
}

export interface Participant {
  id: string;
  type: 'user' | 'agent';
  platform: 'discord' | 'web';
  lastSeen: Date;
}

export interface SyncConflict {
  type: 'message_order' | 'context_mismatch' | 'state_divergence';
  description: string;
  platforms: ('discord' | 'web')[];
  resolution: 'manual' | 'auto' | 'pending';
  timestamp: Date;
}

// Error handling types
export interface NLUError {
  type: 'parsing' | 'context' | 'emotion' | 'formatting' | 'delivery' | 'sync';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  fallbackUsed: boolean;
  context?: any;
  timestamp: Date;
}

export interface FallbackStrategy {
  level: number; // 1-5, higher = more basic fallback
  description: string;
  components: string[]; // which components to disable
  gracefulDegradation: boolean;
}

// Platform-specific types
export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
    iconURL?: string;
  };
  timestamp?: Date;
}

export interface Attachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

// Configuration types
export interface NLUConfig {
  enabledFeatures: {
    multiIntentParsing: boolean;
    referenceResolution: boolean;
    emotionalIntelligence: boolean;
    richFormatting: boolean;
    proactiveCommunication: boolean;
    crossPlatformSync: boolean;
  };
  thresholds: {
    intentConfidence: number;
    emotionConfidence: number;
    referenceConfidence: number;
  };
  limits: {
    maxContextMessages: number;
    maxTopicHistory: number;
    maxChunkSize: number;
    maxDeliveryDelay: number;
  };
  fallbackLevels: FallbackStrategy[];
}