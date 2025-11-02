/**
 * Intent types that engines emit to request actions
 */

export type IntentType =
  | 'reply'
  | 'delete'
  | 'warn'
  | 'timeout'
  | 'ban'
  | 'schedulePost'
  | 'logMetric'
  | 'logModeration'
  | 'updateEngagement'
  | 'createMemory'
  | 'executeTool';

export interface Intent {
  id: string;
  type: IntentType;
  priority: number; // 1-10, higher = more important
  source: 'conversation' | 'moderation' | 'engagement' | 'insight';
  timestamp: number;
  metadata: Record<string, any>;
}

// Conversation intents
export interface ReplyIntent extends Intent {
  type: 'reply';
  channelId: string;
  content: string;
  metadata: {
    agentId: string;
    persona?: string;
    conversationId: string;
    stream?: boolean;
  };
}

export interface ExecuteToolIntent extends Intent {
  type: 'executeTool';
  toolName: string;
  arguments: Record<string, any>;
  metadata: {
    agentId: string;
    userId: string;
  };
}

// Moderation intents
export interface DeleteIntent extends Intent {
  type: 'delete';
  channelId: string;
  messageId: string;
  reason: string;
  metadata: {
    toxicityScore?: number;
    flagType: string;
  };
}

export interface WarnIntent extends Intent {
  type: 'warn';
  userId: string;
  message: string;
  reason: string;
  metadata: {
    severity: number; // 1-10
    infractionsCount?: number;
  };
}

export interface TimeoutIntent extends Intent {
  type: 'timeout';
  guildId: string;
  userId: string;
  durationMs: number;
  reason: string;
  metadata: {
    severity: number;
  };
}

export interface BanIntent extends Intent {
  type: 'ban';
  guildId: string;
  userId: string;
  reason: string;
  deleteMessageDays?: number;
  metadata: {
    permanent: boolean;
  };
}

// Engagement intents
export interface SchedulePostIntent extends Intent {
  type: 'schedulePost';
  channelId: string;
  content: string;
  scheduledAt: number;
  metadata: {
    promptType: string;
    cooldown?: number;
  };
}

export interface UpdateEngagementIntent extends Intent {
  type: 'updateEngagement';
  userId: string;
  agentId?: string;
  metadata: {
    action: 'incrementStreak' | 'updateRelationship' | 'unlockAchievement';
    data: Record<string, any>;
  };
}

// Insight intents
export interface LogMetricIntent extends Intent {
  type: 'logMetric';
  metricType: string;
  data: Record<string, any>;
  metadata: {
    conversationId?: string;
    userId?: string;
    agentId?: string;
  };
}

export interface LogModerationIntent extends Intent {
  type: 'logModeration';
  userId: string;
  action: string;
  reason: string;
  metadata: {
    content?: string;
    toxicityScore?: number;
    automated: boolean;
  };
}

export interface CreateMemoryIntent extends Intent {
  type: 'createMemory';
  agentId: string;
  userId: string;
  content: string;
  kind: 'FACT' | 'PREFERENCE' | 'EVENT' | 'EMOTION';
  metadata: {
    confidence: number;
    source: 'extraction' | 'explicit';
  };
}

// Union type for all specific intents
export type SpecificIntent =
  | ReplyIntent
  | DeleteIntent
  | WarnIntent
  | TimeoutIntent
  | BanIntent
  | SchedulePostIntent
  | LogMetricIntent
  | LogModerationIntent
  | UpdateEngagementIntent
  | CreateMemoryIntent
  | ExecuteToolIntent;

/**
 * Engine interface that all engines must implement
 */
export interface Engine {
  name: string;
  decide(event: any): Promise<Intent[]>;
}
