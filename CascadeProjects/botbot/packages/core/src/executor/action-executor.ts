import type { Client, TextChannel, GuildMember } from 'discord.js';
import { prisma } from '@botbot/db';
import type {
  SpecificIntent,
  ReplyIntent,
  DeleteIntent,
  WarnIntent,
  TimeoutIntent,
  BanIntent,
  SchedulePostIntent,
  LogMetricIntent,
  LogModerationIntent,
  UpdateEngagementIntent,
  CreateMemoryIntent,
  ExecuteToolIntent,
} from '../brain/types';

/**
 * ActionExecutor executes intents and provides audit logging
 *
 * Responsibilities:
 * - Execute Discord actions (send message, delete, timeout, ban)
 * - Write to database (logs, metrics, engagement)
 * - Provide unified error handling
 * - Rate limiting at execution level
 */
export class ActionExecutor {
  constructor(private client: Client) {}

  /**
   * Execute a batch of intents in order
   */
  async executeBatch(intents: SpecificIntent[]): Promise<void> {
    for (const intent of intents) {
      try {
        await this.execute(intent);
      } catch (error) {
        console.error(`Failed to execute intent ${intent.type}:`, error);
        // Log failure but continue with other intents
      }
    }
  }

  /**
   * Execute a single intent
   */
  async execute(intent: SpecificIntent): Promise<void> {
    switch (intent.type) {
      case 'reply':
        return this.executeReply(intent as ReplyIntent);

      case 'delete':
        return this.executeDelete(intent as DeleteIntent);

      case 'warn':
        return this.executeWarn(intent as WarnIntent);

      case 'timeout':
        return this.executeTimeout(intent as TimeoutIntent);

      case 'ban':
        return this.executeBan(intent as BanIntent);

      case 'schedulePost':
        return this.executeSchedulePost(intent as SchedulePostIntent);

      case 'logMetric':
        return this.executeLogMetric(intent as LogMetricIntent);

      case 'logModeration':
        return this.executeLogModeration(intent as LogModerationIntent);

      case 'updateEngagement':
        return this.executeUpdateEngagement(intent as UpdateEngagementIntent);

      case 'createMemory':
        return this.executeCreateMemory(intent as CreateMemoryIntent);

      case 'executeTool':
        return this.executeExecuteTool(intent as ExecuteToolIntent);

      default:
        console.warn(`Unknown intent type: ${(intent as any).type}`);
    }
  }

  /**
   * Send a reply message to a channel
   */
  private async executeReply(intent: ReplyIntent): Promise<void> {
    const channel = await this.client.channels.fetch(intent.channelId);

    if (!channel || !channel.isTextBased()) {
      throw new Error(`Channel ${intent.channelId} not found or not text-based`);
    }

    const textChannel = channel as TextChannel;

    // Split message if too long (Discord limit is 2000 chars)
    const chunks = this.splitMessage(intent.content);

    for (const chunk of chunks) {
      await textChannel.send(chunk);
    }

    // Log the action
    await this.logAction('reply', {
      channelId: intent.channelId,
      agentId: intent.metadata.agentId,
      messageLength: intent.content.length,
    });
  }

  /**
   * Delete a message
   */
  private async executeDelete(intent: DeleteIntent): Promise<void> {
    const channel = await this.client.channels.fetch(intent.channelId);

    if (!channel || !channel.isTextBased()) {
      throw new Error(`Channel ${intent.channelId} not found`);
    }

    const textChannel = channel as TextChannel;
    const message = await textChannel.messages.fetch(intent.messageId);

    if (message) {
      await message.delete();
    }

    // Log the action
    await this.logAction('delete', {
      channelId: intent.channelId,
      messageId: intent.messageId,
      reason: intent.reason,
      toxicityScore: intent.metadata.toxicityScore,
    });
  }

  /**
   * Send a warning DM to a user
   */
  private async executeWarn(intent: WarnIntent): Promise<void> {
    try {
      const user = await this.client.users.fetch(intent.userId);

      await user.send({
        content: `⚠️ **Warning**\n\n${intent.message}\n\n**Reason:** ${intent.reason}\n\nPlease review the server rules to avoid further action.`,
      });

      // Log the action
      await this.logAction('warn', {
        userId: intent.userId,
        reason: intent.reason,
        severity: intent.metadata.severity,
      });
    } catch (error) {
      // User might have DMs disabled
      console.error(`Failed to send warning DM to ${intent.userId}:`, error);
    }
  }

  /**
   * Timeout a user
   */
  private async executeTimeout(intent: TimeoutIntent): Promise<void> {
    const guild = await this.client.guilds.fetch(intent.guildId);
    const member = await guild.members.fetch(intent.userId);

    if (member) {
      await member.timeout(intent.durationMs, intent.reason);
    }

    // Log the action
    await this.logAction('timeout', {
      guildId: intent.guildId,
      userId: intent.userId,
      durationMs: intent.durationMs,
      reason: intent.reason,
    });
  }

  /**
   * Ban a user
   */
  private async executeBan(intent: BanIntent): Promise<void> {
    const guild = await this.client.guilds.fetch(intent.guildId);

    await guild.members.ban(intent.userId, {
      reason: intent.reason,
      deleteMessageSeconds: (intent.deleteMessageDays || 0) * 86400,
    });

    // Log the action
    await this.logAction('ban', {
      guildId: intent.guildId,
      userId: intent.userId,
      reason: intent.reason,
      permanent: intent.metadata.permanent,
    });
  }

  /**
   * Schedule a post for later
   */
  private async executeSchedulePost(intent: SchedulePostIntent): Promise<void> {
    const delay = intent.scheduledAt - Date.now();

    if (delay > 0) {
      setTimeout(async () => {
        try {
          const channel = await this.client.channels.fetch(intent.channelId);

          if (channel && channel.isTextBased()) {
            const textChannel = channel as TextChannel;
            await textChannel.send(intent.content);
          }
        } catch (error) {
          console.error(`Failed to send scheduled post:`, error);
        }
      }, delay);
    } else {
      // Send immediately if scheduled time has passed
      const channel = await this.client.channels.fetch(intent.channelId);

      if (channel && channel.isTextBased()) {
        const textChannel = channel as TextChannel;
        await textChannel.send(intent.content);
      }
    }

    // Log the action
    await this.logAction('schedulePost', {
      channelId: intent.channelId,
      scheduledAt: intent.scheduledAt,
      promptType: intent.metadata.promptType,
    });
  }

  /**
   * Log a metric to analytics database
   */
  private async executeLogMetric(intent: LogMetricIntent): Promise<void> {
    // This would write to analytics tables (to be created in Phase 5)
    // For now, just log to console
    console.log(`[METRIC] ${intent.metricType}:`, intent.data);

    // TODO: Write to analytics tables in database
  }

  /**
   * Log a moderation event to database
   */
  private async executeLogModeration(intent: LogModerationIntent): Promise<void> {
    // This would write to moderation_logs table (to be created)
    // For now, just log to console
    console.log(`[MODERATION] ${intent.action} for user ${intent.userId}:`, intent.reason);

    // TODO: Write to moderation_logs table
  }

  /**
   * Update user engagement data
   */
  private async executeUpdateEngagement(intent: UpdateEngagementIntent): Promise<void> {
    // This would write to user_engagement table (to be created)
    // For now, just log to console
    console.log(`[ENGAGEMENT] ${intent.metadata.action} for user ${intent.userId}`);

    // TODO: Update user_engagement table
  }

  /**
   * Create a memory
   */
  private async executeCreateMemory(intent: CreateMemoryIntent): Promise<void> {
    // This uses existing memory system
    await prisma.memory.create({
      data: {
        agentId: intent.agentId,
        userId: intent.userId,
        kind: intent.kind,
        content: intent.content,
        salience: intent.metadata.confidence,
        metadata: {
          source: intent.metadata.source,
        },
      },
    });

    await this.logAction('createMemory', {
      agentId: intent.agentId,
      userId: intent.userId,
      kind: intent.kind,
    });
  }

  /**
   * Execute a tool
   */
  private async executeExecuteTool(intent: ExecuteToolIntent): Promise<void> {
    // This will integrate with tool executor (Phase 6)
    console.log(`[TOOL] Executing ${intent.toolName} with args:`, intent.arguments);

    // TODO: Call ToolExecutor
  }

  /**
   * Log an action for audit trail
   */
  private async logAction(action: string, data: Record<string, any>): Promise<void> {
    // This writes to audit log (to be created)
    // For now, just log to console
    console.log(`[ACTION] ${action}:`, data);

    // TODO: Write to audit_log table
  }

  /**
   * Split message into chunks (Discord has 2000 char limit)
   */
  private splitMessage(text: string, maxLength: number = 2000): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    let currentChunk = '';

    const lines = text.split('\n');

    for (const line of lines) {
      if ((currentChunk + line + '\n').length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // If single line is too long, split it
        if (line.length > maxLength) {
          for (let i = 0; i < line.length; i += maxLength) {
            chunks.push(line.slice(i, i + maxLength));
          }
        } else {
          currentChunk = line + '\n';
        }
      } else {
        currentChunk += line + '\n';
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
