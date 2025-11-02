import type { Message, Client } from 'discord.js';
import { parseIntent, type ParsedIntent } from '@botbot/shared';

export class IntentParser {
  constructor(private client: Client) {}

  parse(message: Message): ParsedIntent | null {
    // Ignore bot messages
    if (message.author.bot) {
      return null;
    }

    // Check if bot was mentioned
    const botMention = message.mentions.has(this.client.user!);

    // Check if DM
    const isDM = !message.guild;

    // Parse intent
    const intent = parseIntent(message.content, botMention || isDM);

    // Only respond if:
    // 1. Bot was mentioned in guild
    // 2. Message is a DM
    // 3. Intent is not UNKNOWN
    if (!isDM && !botMention && intent.type === 'UNKNOWN') {
      return null;
    }

    return intent;
  }

  extractAgentName(content: string): string | null {
    // Try to extract agent name from natural language
    // e.g., "Hey Luna, how are you?" -> "Luna"

    // Remove bot mention
    const clean = content.replace(/<@!?\d+>/g, '').trim();

    // Look for pattern: "Hey NAME," or just "NAME,"
    const match = clean.match(/^(?:hey|hi|hello)?\s*([A-Z][a-z]+),/i);
    if (match) {
      return match[1];
    }

    return null;
  }
}
