/**
 * Internal event types for the event-driven pipeline
 */

export type EventType =
  | 'message.create'
  | 'message.update'
  | 'message.delete'
  | 'reaction.add'
  | 'reaction.remove'
  | 'voice.join'
  | 'voice.leave'
  | 'user.join'
  | 'user.leave'
  | 'thread.create'
  | 'agent.stateChange';

export interface InternalEvent {
  id: string;
  type: EventType;
  timestamp: number;
  guildId?: string;
  channelId?: string;
  userId?: string;
  metadata: Record<string, any>;
}

export interface MessageCreateEvent extends InternalEvent {
  type: 'message.create';
  channelId: string;
  userId: string;
  content: string;
  attachments: Array<{
    id: string;
    url: string;
    contentType?: string;
  }>;
  metadata: {
    messageId: string;
    isBot: boolean;
    isReply: boolean;
    repliedToUserId?: string;
    repliedToMessageId?: string;
    mentions: string[];
    mentionsBot: boolean;
  };
}

export interface MessageUpdateEvent extends InternalEvent {
  type: 'message.update';
  channelId: string;
  userId: string;
  oldContent?: string;
  newContent: string;
  metadata: {
    messageId: string;
    editedTimestamp: number;
  };
}

export interface MessageDeleteEvent extends InternalEvent {
  type: 'message.delete';
  channelId: string;
  userId?: string;
  metadata: {
    messageId: string;
    deletedBy?: string;
  };
}

export interface ReactionEvent extends InternalEvent {
  type: 'reaction.add' | 'reaction.remove';
  channelId: string;
  userId: string;
  metadata: {
    messageId: string;
    emoji: string;
    messageAuthorId: string;
  };
}

export interface VoiceStateEvent extends InternalEvent {
  type: 'voice.join' | 'voice.leave';
  userId: string;
  metadata: {
    channelId?: string;
    channelName?: string;
    sessionId?: string;
  };
}

export interface MemberEvent extends InternalEvent {
  type: 'user.join' | 'user.leave';
  guildId: string;
  userId: string;
  metadata: {
    username: string;
    joinedAt?: number;
  };
}

export interface ThreadEvent extends InternalEvent {
  type: 'thread.create';
  channelId: string;
  userId: string;
  metadata: {
    threadId: string;
    threadName: string;
    parentChannelId: string;
  };
}

export interface AgentStateChangeEvent extends InternalEvent {
  type: 'agent.stateChange';
  metadata: {
    agentId: string;
    change: 'created' | 'updated' | 'paused' | 'resumed' | 'archived';
    data: Record<string, any>;
  };
}

// Union type for all specific event types
export type SpecificInternalEvent =
  | MessageCreateEvent
  | MessageUpdateEvent
  | MessageDeleteEvent
  | ReactionEvent
  | VoiceStateEvent
  | MemberEvent
  | ThreadEvent
  | AgentStateChangeEvent;
