import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { validateEnv } from '@botbot/shared';
import { AgentRuntime, EventCollector, Brain, ConversationEngine, ActionExecutor } from '@botbot/core';
import { MessageHandler } from './handlers/message-handler';
import { IntentParser } from './handlers/intent-parser';

// Feature flag: Enable event-driven pipeline
const USE_EVENT_PIPELINE = process.env.USE_EVENT_PIPELINE === 'true';

async function main() {
  // Validate environment
  const env = validateEnv();

  console.log('Starting BotBot Discord client...');
  console.log(`Event pipeline: ${USE_EVENT_PIPELINE ? 'ENABLED' : 'DISABLED (legacy mode)'}`);

  // Initialize Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  // Initialize agent runtime
  const runtime = new AgentRuntime({
    openaiApiKey: env.OPENAI_API_KEY,
    redisUrl: env.REDIS_URL,
    blocklist: [],
  });

  // Initialize handlers (legacy mode)
  const intentParser = new IntentParser(client);
  const messageHandler = new MessageHandler(runtime, intentParser);

  // Initialize event-driven pipeline (new mode)
  const eventCollector = new EventCollector(client);
  const brain = new Brain();
  const actionExecutor = new ActionExecutor(client);

  // Register engines
  const conversationEngine = new ConversationEngine(runtime);
  brain.registerEngine(conversationEngine);
  // Future: Register ModerationEngine, EngagementEngine, InsightEngine here

  // Ready event
  client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);
    console.log(`Serving ${client.guilds.cache.size} guilds`);
  });

  // Message event
  client.on('messageCreate', async (message) => {
    try {
      if (USE_EVENT_PIPELINE) {
        // New event-driven pipeline
        const event = eventCollector.fromMessageCreate(message);
        const intents = await brain.process(event);
        await actionExecutor.executeBatch(intents);
      } else {
        // Legacy message handler (backward compatible)
        await messageHandler.handle(message);
      }
    } catch (error) {
      console.error('Message handling error:', error);

      // Send error message to user
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred.';

      await message.reply({
        content: `Sorry, something went wrong: ${errorMessage}`,
      });
    }
  });

  // Error handling
  client.on('error', (error) => {
    console.error('Discord client error:', error);
  });

  process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
  });

  // Login
  await client.login(env.DISCORD_TOKEN);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
