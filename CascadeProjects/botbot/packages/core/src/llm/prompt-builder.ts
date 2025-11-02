import type { AgentContext, LLMMessage, MemoryData, MessageData } from '@botbot/shared';
import { formatMemoriesForPrompt, formatHistoryForPrompt, CONVERSATION_HISTORY_LIMIT } from '@botbot/shared';

export class PromptBuilder {
  buildSystemPrompt(context: AgentContext): string {
    const { agent, state } = context;

    // Replace template variables
    let systemPrompt = agent.systemPrompt.replace('{AGENT_NAME}', agent.name);

    // Add mood context
    const moodDesc = this.describeMood(state.mood);
    systemPrompt += `\n\n**Current State:**\n- Mood: ${moodDesc}\n- Energy: ${state.energy}/100`;

    // Add traits
    if (Object.keys(agent.traits).length > 0) {
      const traitsDesc = Object.entries(agent.traits)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      systemPrompt += `\n- Traits: ${traitsDesc}`;
    }

    return systemPrompt;
  }

  buildMessages(context: AgentContext, userMessage: string): LLMMessage[] {
    const messages: LLMMessage[] = [];

    // 1. System prompt
    messages.push({
      role: 'system',
      content: this.buildSystemPrompt(context),
    });

    // 2. Retrieved memories
    if (context.memories.length > 0) {
      messages.push({
        role: 'system',
        content: formatMemoriesForPrompt(context.memories),
      });
    }

    // 3. Conversation history
    const recentHistory = context.history.slice(-CONVERSATION_HISTORY_LIMIT);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.sender === 'USER' ? 'user' : msg.sender === 'AGENT' ? 'assistant' : 'system',
        content: msg.content,
      });
    }

    // 4. Current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    return messages;
  }

  private describeMood(mood: { valence: number; arousal: number; dominance: number }): string {
    const { valence, arousal, dominance } = mood;

    // Map PAD (Pleasure-Arousal-Dominance) to descriptive terms
    let description = '';

    // Valence
    if (valence > 0.6) description += 'positive';
    else if (valence < -0.4) description += 'negative';
    else description += 'neutral';

    // Arousal
    if (arousal > 0.6) description += ', energized';
    else if (arousal < 0.3) description += ', calm';

    // Dominance
    if (dominance > 0.6) description += ', confident';
    else if (dominance < 0.3) description += ', submissive';

    return description;
  }
}
