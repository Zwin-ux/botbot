import type { BotbotChannel } from "../models/blueprint.js";
import { runBotbotTurn } from "../runtime/index.js";

export interface DiscordAdapterConfig {
  botToken: string;
  blueprintId: string;
}

export interface DiscordMessage {
  id: string;
  authorId: string;
  content: string;
  reply: (text: string) => Promise<void> | void;
}

const DISCORD_CHANNEL: BotbotChannel = "discord";

export function createDiscordMessageHandler(config: DiscordAdapterConfig) {
  return async function handleDiscordMessage(message: DiscordMessage): Promise<void> {
    if (!message.content.trim()) {
      return;
    }
    const result = await runBotbotTurn({
      blueprintId: config.blueprintId,
      channel: DISCORD_CHANNEL,
      userId: message.authorId,
      message: message.content,
    });

    // In production this is where we would call Discord's SDK to send a reply.
    await message.reply(result.text);
  };
}
