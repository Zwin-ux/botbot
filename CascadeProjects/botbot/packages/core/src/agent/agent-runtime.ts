import { prisma } from '@botbot/db';
import type { AgentContext, MessageData, LLMMessage } from '@botbot/shared';
import { DEFAULT_SYSTEM_PROMPT, CONVERSATION_HISTORY_LIMIT } from '@botbot/shared';
import { LLMClient } from '../llm/client';
import { PromptBuilder } from '../llm/prompt-builder';
import { MemoryManager } from '../memory/memory-manager';
import { ContentModerator } from '../safety/moderator';
import { RateLimiter } from '../safety/rate-limiter';
import { ToolExecutor } from '../tools/tool-executor';

export class AgentRuntime {
  private llm: LLMClient;
  private memory: MemoryManager;
  private moderator: ContentModerator;
  private rateLimiter: RateLimiter;
  private toolExecutor: ToolExecutor;
  private promptBuilder: PromptBuilder;

  constructor(config: {
    openaiApiKey: string;
    redisUrl: string;
    blocklist?: string[];
  }) {
    this.llm = new LLMClient(config.openaiApiKey);
    this.memory = new MemoryManager(this.llm);
    this.moderator = new ContentModerator(this.llm, config.blocklist);
    this.rateLimiter = new RateLimiter(config.redisUrl);
    this.toolExecutor = new ToolExecutor();
    this.promptBuilder = new PromptBuilder();
  }

  // Main message handling flow
  async handleMessage(params: {
    agentId: string;
    userId: string;
    conversationId: string;
    content: string;
  }): Promise<{ response: string; tokens: number }> {
    const { agentId, userId, conversationId, content } = params;

    // 1. Rate limiting
    const rateLimit = await this.rateLimiter.checkLimit(`user:${userId}`);
    if (!rateLimit.allowed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // 2. Content moderation
    const moderation = await this.moderator.moderate(content);
    if (!moderation.safe) {
      throw new Error(`Message blocked: ${moderation.reason}`);
    }

    // 3. Load context
    const context = await this.loadContext(agentId, userId, conversationId);

    // 4. Retrieve relevant memories
    const memories = await this.memory.retrieve(agentId, content, userId);
    context.memories = memories;

    // 5. Build prompt
    const messages = this.promptBuilder.buildMessages(context, content);

    // 6. Get LLM response
    const llmResponse = await this.llm.chat(messages);

    // 7. Moderate response
    const responseModeration = await this.moderator.moderate(llmResponse.content);
    if (!responseModeration.safe) {
      return {
        response: "I'm sorry, I can't respond to that right now.",
        tokens: llmResponse.tokens.total,
      };
    }

    // 8. Save messages
    await this.saveMessages(conversationId, [
      { sender: 'USER', content, tokens: llmResponse.tokens.prompt },
      { sender: 'AGENT', content: llmResponse.content, tokens: llmResponse.tokens.completion },
    ]);

    // 9. Extract and store new memories (async)
    this.extractAndStoreMemories(agentId, userId, messages, llmResponse.content).catch((err) =>
      console.error('Memory extraction failed:', err)
    );

    return {
      response: llmResponse.content,
      tokens: llmResponse.tokens.total,
    };
  }

  // Stream message response
  async *handleMessageStream(params: {
    agentId: string;
    userId: string;
    conversationId: string;
    content: string;
  }): AsyncGenerator<string, void, unknown> {
    const { agentId, userId, conversationId, content } = params;

    // Same checks as handleMessage
    const rateLimit = await this.rateLimiter.checkLimit(`user:${userId}`);
    if (!rateLimit.allowed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const moderation = await this.moderator.moderate(content);
    if (!moderation.safe) {
      throw new Error(`Message blocked: ${moderation.reason}`);
    }

    const context = await this.loadContext(agentId, userId, conversationId);
    const memories = await this.memory.retrieve(agentId, content, userId);
    context.memories = memories;

    const messages = this.promptBuilder.buildMessages(context, content);

    // Stream response
    let fullResponse = '';
    for await (const chunk of this.llm.chatStream(messages)) {
      fullResponse += chunk;
      yield chunk;
    }

    // Save after streaming completes
    await this.saveMessages(conversationId, [
      { sender: 'USER', content },
      { sender: 'AGENT', content: fullResponse },
    ]);

    this.extractAndStoreMemories(agentId, userId, messages, fullResponse).catch((err) =>
      console.error('Memory extraction failed:', err)
    );
  }

  // Load agent context
  private async loadContext(
    agentId: string,
    userId: string,
    conversationId: string
  ): Promise<AgentContext> {
    const [agent, instance, messages] = await Promise.all([
      prisma.agent.findUnique({ where: { id: agentId } }),
      prisma.agentInstance.findFirst({
        where: { agentId },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: CONVERSATION_HISTORY_LIMIT,
      }),
    ]);

    if (!agent) {
      throw new Error('Agent not found');
    }

    return {
      agentId,
      userId,
      conversationId,
      agent: {
        id: agent.id,
        name: agent.name,
        persona: agent.persona,
        systemPrompt: agent.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        traits: agent.traits as Record<string, any>,
        status: agent.status,
      },
      history: messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        tokens: m.tokens || undefined,
        createdAt: m.createdAt,
      })),
      memories: [],
      state: instance
        ? {
            mood: instance.mood as any,
            energy: instance.energy,
            environment: instance.environment as any,
          }
        : {
            mood: { valence: 0.5, arousal: 0.5, dominance: 0.5 },
            energy: 100,
            environment: {},
          },
    };
  }

  // Save messages to database
  private async saveMessages(
    conversationId: string,
    messages: Array<{ sender: 'USER' | 'AGENT' | 'SYSTEM'; content: string; tokens?: number }>
  ): Promise<void> {
    await prisma.message.createMany({
      data: messages.map((m) => ({
        conversationId,
        sender: m.sender,
        content: m.content,
        tokens: m.tokens,
      })),
    });
  }

  // Extract and store memories from conversation
  private async extractAndStoreMemories(
    agentId: string,
    userId: string,
    messages: LLMMessage[],
    response: string
  ): Promise<void> {
    // Convert to format expected by extraction
    const conversationMessages = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Add the response
    conversationMessages.push({
      role: 'assistant',
      content: response,
    });

    await this.memory.extractFromConversation(agentId, userId, conversationMessages);
  }

  // Create a new agent
  async createAgent(params: {
    userId: string;
    name: string;
    persona: string;
    traits?: Record<string, any>;
  }): Promise<string> {
    const systemPrompt = DEFAULT_SYSTEM_PROMPT.replace('{AGENT_NAME}', params.name);

    const agent = await prisma.agent.create({
      data: {
        ownerUserId: params.userId,
        name: params.name,
        persona: params.persona,
        systemPrompt,
        traits: params.traits || {},
      },
    });

    // Create initial instance
    await prisma.agentInstance.create({
      data: {
        agentId: agent.id,
        mood: { valence: 0.5, arousal: 0.5, dominance: 0.5 },
        energy: 100,
        environment: {},
      },
    });

    return agent.id;
  }

  // Get or create conversation
  async getOrCreateConversation(params: {
    agentId: string;
    userId: string;
    channelType: 'DM' | 'GUILD_TEXT' | 'THREAD' | 'WEB';
    discordChannelId?: string;
  }): Promise<string> {
    const existing = await prisma.conversation.findFirst({
      where: {
        agentId: params.agentId,
        userId: params.userId,
        channelType: params.channelType,
        discordChannelId: params.discordChannelId,
      },
    });

    if (existing) {
      return existing.id;
    }

    const conversation = await prisma.conversation.create({
      data: {
        agentId: params.agentId,
        userId: params.userId,
        channelType: params.channelType,
        discordChannelId: params.discordChannelId,
      },
    });

    return conversation.id;
  }
}
