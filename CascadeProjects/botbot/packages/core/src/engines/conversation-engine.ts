import type { Engine, Intent, ReplyIntent } from '../brain/types';
import type { InternalEvent, MessageCreateEvent } from '../events/types';
import { AgentRuntime } from '../agent/agent-runtime';
import { prisma } from '@botbot/db';

/**
 * ConversationEngine handles conversational interactions with users
 *
 * Wraps the existing AgentRuntime to:
 * - Process messages mentioning the bot
 * - Generate natural language responses using LLM
 * - Emit ReplyIntent with conversational responses
 * - Handle rate limiting and moderation via AgentRuntime
 *
 * This engine maintains backward compatibility with existing bot functionality
 * while integrating into the new event-driven architecture.
 */
export class ConversationEngine implements Engine {
  name = 'conversation';

  constructor(private runtime: AgentRuntime) {}

  async decide(event: InternalEvent): Promise<Intent[]> {
    // Only handle message.create events that mention the bot
    if (event.type !== 'message.create') {
      return [];
    }

    const messageEvent = event as MessageCreateEvent;

    // Only respond if bot is mentioned
    if (!messageEvent.metadata.mentionsBot) {
      return [];
    }

    // Find the agent for this guild/channel
    const agent = await this.findAgentForChannel(messageEvent.guildId, messageEvent.channelId);

    if (!agent) {
      return [];
    }

    // Get or create conversation
    const conversationId = await this.runtime.getOrCreateConversation({
      agentId: agent.id,
      userId: messageEvent.userId,
      channelType: 'GUILD_TEXT',
      discordChannelId: messageEvent.channelId,
    });

    try {
      // Use AgentRuntime to handle the message
      const result = await this.runtime.handleMessage({
        agentId: agent.id,
        userId: messageEvent.userId,
        conversationId,
        content: messageEvent.content,
      });

      // Emit reply intent
      const intents: Intent[] = [
        {
          type: 'reply',
          channelId: messageEvent.channelId,
          content: result.response,
          priority: 5,
          metadata: {
            agentId: agent.id,
            persona: agent.persona,
          },
        } as ReplyIntent,
      ];

      return intents;
    } catch (error: any) {
      // Handle errors gracefully
      if (error.message?.includes('Rate limit')) {
        return [
          {
            type: 'reply',
            channelId: messageEvent.channelId,
            content: "Whoa there! I need a moment to catch my breath. Try again in a bit!",
            priority: 5,
            metadata: {
              agentId: agent.id,
            },
          } as ReplyIntent,
        ];
      }

      if (error.message?.includes('blocked')) {
        // Don't respond to blocked content
        return [];
      }

      // Generic error
      console.error(`ConversationEngine error:`, error);
      return [
        {
          type: 'reply',
          channelId: messageEvent.channelId,
          content: "Oops! Something went wrong. Please try again.",
          priority: 5,
          metadata: {
            agentId: agent.id,
          },
        } as ReplyIntent,
      ];
    }
  }

  /**
   * Find an active agent for the given channel
   *
   * Current implementation: Returns the most recently updated active agent
   * Future: Could implement guild-specific agent assignment, multi-agent support, etc.
   */
  private async findAgentForChannel(
    guildId: string | undefined,
    channelId: string
  ): Promise<{ id: string; name: string; persona: string } | null> {
    // Find an active agent instance for this guild
    // For now, just get the most recently updated agent
    const agentInstance = await prisma.agentInstance.findFirst({
      where: {
        agent: {
          status: 'ACTIVE',
        },
      },
      include: {
        agent: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!agentInstance) {
      return null;
    }

    return {
      id: agentInstance.agent.id,
      name: agentInstance.agent.name,
      persona: agentInstance.agent.persona,
    };
  }
}
