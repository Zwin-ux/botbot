import type { BotbotChannel } from "../models/blueprint.js";
import { runBotbotTurn } from "../runtime/index.js";

export interface SmsAdapterConfig {
  blueprintId: string;
  fromNumber: string;
}

export interface SmsMessage {
  from: string;
  to: string;
  body: string;
  respond: (text: string) => Promise<void> | void;
}

const SMS_CHANNEL: BotbotChannel = "sms";

export function createSmsHandler(config: SmsAdapterConfig) {
  return async function handleSms(message: SmsMessage): Promise<void> {
    if (!message.body.trim()) {
      return;
    }

    const result = await runBotbotTurn({
      blueprintId: config.blueprintId,
      channel: SMS_CHANNEL,
      userId: message.from,
      message: message.body,
    });

    // Integration with providers like Twilio would be implemented here.
    await message.respond(result.text);
  };
}
