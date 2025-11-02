import type { Message, Client, GuildMember, VoiceState, ThreadChannel } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import type {
  InternalEvent,
  MessageCreateEvent,
  MessageUpdateEvent,
  MessageDeleteEvent,
  MemberEvent,
  VoiceStateEvent,
  ThreadEvent,
} from './types';

/**
 * EventCollector normalizes Discord events into InternalEvent objects
 * This provides a clean abstraction layer between Discord API and our business logic
 */
export class EventCollector {
  constructor(private client: Client) {}

  /**
   * Convert Discord Message to MessageCreateEvent
   */
  fromMessageCreate(message: Message): MessageCreateEvent {
    const mentions = message.mentions.users.map((u) => u.id);
    const mentionsBot = message.mentions.has(this.client.user!.id);

    return {
      id: uuidv4(),
      type: 'message.create',
      timestamp: message.createdTimestamp,
      guildId: message.guildId || undefined,
      channelId: message.channelId,
      userId: message.author.id,
      content: message.content,
      attachments: message.attachments.map((a) => ({
        id: a.id,
        url: a.url,
        contentType: a.contentType || undefined,
      })),
      metadata: {
        messageId: message.id,
        isBot: message.author.bot,
        isReply: message.reference !== null,
        repliedToUserId: message.reference?.userId,
        repliedToMessageId: message.reference?.messageId,
        mentions,
        mentionsBot,
      },
    };
  }

  /**
   * Convert Discord Message update to MessageUpdateEvent
   */
  fromMessageUpdate(oldMessage: Message | null, newMessage: Message): MessageUpdateEvent {
    return {
      id: uuidv4(),
      type: 'message.update',
      timestamp: Date.now(),
      guildId: newMessage.guildId || undefined,
      channelId: newMessage.channelId,
      userId: newMessage.author.id,
      oldContent: oldMessage?.content,
      newContent: newMessage.content,
      metadata: {
        messageId: newMessage.id,
        editedTimestamp: newMessage.editedTimestamp || Date.now(),
      },
    };
  }

  /**
   * Convert Discord Message delete to MessageDeleteEvent
   */
  fromMessageDelete(message: Message): MessageDeleteEvent {
    return {
      id: uuidv4(),
      type: 'message.delete',
      timestamp: Date.now(),
      guildId: message.guildId || undefined,
      channelId: message.channelId,
      userId: message.author?.id,
      metadata: {
        messageId: message.id,
      },
    };
  }

  /**
   * Convert Discord GuildMember join to MemberEvent
   */
  fromMemberJoin(member: GuildMember): MemberEvent {
    return {
      id: uuidv4(),
      type: 'user.join',
      timestamp: Date.now(),
      guildId: member.guild.id,
      userId: member.id,
      metadata: {
        username: member.user.username,
        joinedAt: member.joinedTimestamp || undefined,
      },
    };
  }

  /**
   * Convert Discord GuildMember leave to MemberEvent
   */
  fromMemberLeave(member: GuildMember): MemberEvent {
    return {
      id: uuidv4(),
      type: 'user.leave',
      timestamp: Date.now(),
      guildId: member.guild.id,
      userId: member.id,
      metadata: {
        username: member.user.username,
      },
    };
  }

  /**
   * Convert Discord VoiceState change to VoiceStateEvent
   */
  fromVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): VoiceStateEvent | null {
    // Joined voice channel
    if (!oldState.channelId && newState.channelId) {
      return {
        id: uuidv4(),
        type: 'voice.join',
        timestamp: Date.now(),
        guildId: newState.guild.id,
        userId: newState.id,
        metadata: {
          channelId: newState.channelId,
          channelName: newState.channel?.name,
          sessionId: newState.sessionId || undefined,
        },
      };
    }

    // Left voice channel
    if (oldState.channelId && !newState.channelId) {
      return {
        id: uuidv4(),
        type: 'voice.leave',
        timestamp: Date.now(),
        guildId: oldState.guild.id,
        userId: oldState.id,
        metadata: {
          channelId: oldState.channelId,
          channelName: oldState.channel?.name,
        },
      };
    }

    // Moved channels (treat as leave + join, but we'll just track the join)
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      return {
        id: uuidv4(),
        type: 'voice.join',
        timestamp: Date.now(),
        guildId: newState.guild.id,
        userId: newState.id,
        metadata: {
          channelId: newState.channelId,
          channelName: newState.channel?.name,
          sessionId: newState.sessionId || undefined,
        },
      };
    }

    // Other state changes (mute/deafen) - ignore for now
    return null;
  }

  /**
   * Convert Discord Thread create to ThreadEvent
   */
  fromThreadCreate(thread: ThreadChannel): ThreadEvent {
    return {
      id: uuidv4(),
      type: 'thread.create',
      timestamp: Date.now(),
      guildId: thread.guildId,
      channelId: thread.id,
      userId: thread.ownerId || 'unknown',
      metadata: {
        threadId: thread.id,
        threadName: thread.name,
        parentChannelId: thread.parentId || 'unknown',
      },
    };
  }

  /**
   * Validate that an event is properly formed
   */
  validate(event: InternalEvent): boolean {
    if (!event.id || !event.type || !event.timestamp) {
      return false;
    }

    // Type-specific validation
    switch (event.type) {
      case 'message.create':
      case 'message.update':
      case 'message.delete':
        return !!event.channelId && !!event.userId;

      case 'voice.join':
      case 'voice.leave':
        return !!event.userId;

      case 'user.join':
      case 'user.leave':
        return !!event.guildId && !!event.userId;

      case 'thread.create':
        return !!event.channelId && !!event.userId;

      default:
        return true;
    }
  }
}
