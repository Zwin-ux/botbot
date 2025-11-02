import type { Message } from 'discord.js';
import { AgentRuntime } from '@botbot/core';
import { prisma } from '@botbot/db';
import type { IntentParser } from './intent-parser';

export class MessageHandler {
  constructor(
    private runtime: AgentRuntime,
    private intentParser: IntentParser
  ) {}

  async handle(message: Message): Promise<void> {
    // Parse intent
    const intent = this.intentParser.parse(message);
    if (!intent) {
      return;
    }

    // Get or create user
    const user = await this.getOrCreateUser(message.author.id, message.author.username);

    // Route based on intent
    switch (intent.type) {
      case 'ADOPT':
        await this.handleAdopt(message, user.id, intent.params);
        break;

      case 'CHAT':
        await this.handleChat(message, user.id, intent.params);
        break;

      case 'REMEMBER':
        await this.handleRemember(message, user.id, intent.params);
        break;

      case 'RECALL':
        await this.handleRecall(message, user.id);
        break;

      case 'MOOD':
        await this.handleMood(message, user.id, intent.params);
        break;

      case 'HELP':
        await this.handleHelp(message);
        break;

      case 'GARDEN':
        await this.handleGarden(message, user.id);
        break;

      default:
        // Unknown intent
        await message.reply("I'm not sure what you want me to do. Try saying 'help' for options!");
    }
  }

  private async handleAdopt(message: Message, userId: string, params: any): Promise<void> {
    const { persona, name } = params;

    // Check if user already has this agent
    const existing = await prisma.agent.findFirst({
      where: {
        ownerUserId: userId,
        name: { equals: name, mode: 'insensitive' },
      },
    });

    if (existing) {
      await message.reply(`You already have an agent named ${name}!`);
      return;
    }

    // Create agent
    const agentId = await this.runtime.createAgent({
      userId,
      name,
      persona,
    });

    await message.reply(
      `🎉 You've adopted **${name}**!\n\n` +
        `Persona: ${persona}\n\n` +
        `Say "${name}, hello!" or mention me to start chatting!`
    );
  }

  private async handleChat(message: Message, userId: string, params: any): Promise<void> {
    // Find agent to talk to
    const agentName = this.intentParser.extractAgentName(message.content);

    let agent;
    if (agentName) {
      // Find agent by name
      agent = await prisma.agent.findFirst({
        where: {
          ownerUserId: userId,
          name: { equals: agentName, mode: 'insensitive' },
          status: 'ACTIVE',
        },
      });
    } else {
      // Get user's most recently updated agent
      agent = await prisma.agent.findFirst({
        where: {
          ownerUserId: userId,
          status: 'ACTIVE',
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    if (!agent) {
      await message.reply(
        "You don't have any agents yet! Adopt one first:\n" +
          '`@BotBot adopt a curious scientist named Atlas`'
      );
      return;
    }

    // Get or create conversation
    const conversationId = await this.runtime.getOrCreateConversation({
      agentId: agent.id,
      userId,
      channelType: message.guild ? 'GUILD_TEXT' : 'DM',
      discordChannelId: message.channelId,
    });

    // Show typing indicator
    await message.channel.sendTyping();

    // Handle message with streaming
    let response = '';
    const stream = this.runtime.handleMessageStream({
      agentId: agent.id,
      userId,
      conversationId,
      content: message.content,
    });

    // Collect chunks
    for await (const chunk of stream) {
      response += chunk;
    }

    // Send response
    if (response.length > 2000) {
      // Split long messages
      const chunks = this.splitMessage(response);
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } else {
      await message.reply(response);
    }
  }

  private async handleRemember(message: Message, userId: string, params: any): Promise<void> {
    // Get user's active agent
    const agent = await prisma.agent.findFirst({
      where: {
        ownerUserId: userId,
        status: 'ACTIVE',
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!agent) {
      await message.reply('You need to adopt an agent first!');
      return;
    }

    // Create manual memory
    const memoryContent = params.content;
    await prisma.memory.create({
      data: {
        agentId: agent.id,
        userId,
        kind: 'FACT',
        content: memoryContent,
        salience: 1.0,
      },
    });

    await message.reply(`Got it! I'll remember: "${memoryContent}"`);
  }

  private async handleRecall(message: Message, userId: string): Promise<void> {
    // Get user's active agent
    const agent = await prisma.agent.findFirst({
      where: {
        ownerUserId: userId,
        status: 'ACTIVE',
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!agent) {
      await message.reply('You need to adopt an agent first!');
      return;
    }

    // Get recent memories
    const memories = await prisma.memory.findMany({
      where: {
        agentId: agent.id,
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { salience: 'desc' },
      take: 10,
    });

    if (memories.length === 0) {
      await message.reply("I don't have any memories about you yet!");
      return;
    }

    const memoryList = memories
      .map((m, i) => `${i + 1}. [${m.kind}] ${m.content}`)
      .join('\n');

    await message.reply(`**Here's what I remember about you:**\n\n${memoryList}`);
  }

  private async handleMood(message: Message, userId: string, params: any): Promise<void> {
    const { mood, preset } = params;

    if (!preset) {
      await message.reply(`I don't know the mood "${mood}". Try: happy, sad, excited, calm, playful, serious, curious, or tired.`);
      return;
    }

    // Get user's active agent
    const agent = await prisma.agent.findFirst({
      where: {
        ownerUserId: userId,
        status: 'ACTIVE',
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!agent) {
      await message.reply('You need to adopt an agent first!');
      return;
    }

    // Update agent instance mood
    await prisma.agentInstance.updateMany({
      where: { agentId: agent.id },
      data: { mood: preset },
    });

    await message.reply(`Mood set to **${mood}**! 😊`);
  }

  private async handleHelp(message: Message): Promise<void> {
    const helpText = `
**BotBot - Your AI Companion** 🤖

**Getting Started:**
\`@BotBot adopt a [persona] named [Name]\`
Create a new AI agent with a personality.

**Chatting:**
Just mention me or say the agent's name:
\`@BotBot hello!\` or \`Hey Luna, how are you?\`

**Memory:**
\`@BotBot remember that I love pizza\` - Add a memory
\`@BotBot what do you remember?\` - See all memories

**Mood:**
\`@BotBot set your mood to playful\`
Options: happy, sad, excited, calm, playful, serious, curious, tired

**Garden:**
\`@BotBot show garden\` - Get link to web interface

**Examples:**
\`@BotBot adopt a playful cat named Whiskers\`
\`Hey Whiskers, tell me a joke!\`
\`@BotBot remember that I'm a software developer\`
`;

    await message.reply(helpText);
  }

  private async handleGarden(message: Message, userId: string): Promise<void> {
    const gardenUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    await message.reply(
      `🌸 **Visit your Chao Garden** 🌸\n\n` +
        `${gardenUrl}\n\n` +
        `Manage your agents, view memories, and chat from the web!`
    );
  }

  private async getOrCreateUser(discordId: string, username: string) {
    let user = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          discordId,
          username,
        },
      });
    }

    return user;
  }

  private splitMessage(text: string, maxLength: number = 2000): string[] {
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
