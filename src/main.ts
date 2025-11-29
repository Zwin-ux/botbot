import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { UserProfileManager } from './features/user-profile';
import { IntentRouter } from './features/intent-router';
import { PersonaManager } from './features/persona-manager';
import { ConversationManager } from './memory/conversation-manager';
import { JsonlVectorStore } from './memory/vector-store';
import { OpenAIEmbeddings, MockEmbeddings } from './llm/embeddings';
import { CompanionLLM } from './llm/companion-llm';
import { DebugLogger } from './llm/debug';
import { CompanionDiscordHandler } from './platforms/discord';

async function main() {
    console.log('--- Starting BotBot (Companion Core) ---');

    // 1. Initialize Discord Client
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages,
        ],
        partials: [Partials.Channel, Partials.Message],
    });

    // 2. Initialize Core Components
    const profileManager = new UserProfileManager();

    // Embeddings: Use OpenAI if key exists, else Mock
    const embeddingAdapter = process.env.OPENAI_API_KEY
        ? new OpenAIEmbeddings()
        : new MockEmbeddings();

    const intentRouter = new IntentRouter(embeddingAdapter);
    const personaManager = new PersonaManager();
    const conversationManager = new ConversationManager();
    const debugLogger = new DebugLogger();

    const vectorStore = new JsonlVectorStore(embeddingAdapter);

    // 3. Initialize LLM Service
    const llm = new CompanionLLM(
        profileManager,
        intentRouter,
        personaManager,
        conversationManager,
        vectorStore,
        debugLogger
    );

    // 4. Initialize Platform Handlers
    const discordHandler = new CompanionDiscordHandler(client, llm);

    // 5. Setup Event Listeners
    client.once('ready', () => {
        console.log(`Logged in as ${client.user?.tag}!`);
        console.log(`Persona: ${personaManager.getCurrentPersona().name}`);
        client.user?.setActivity('Listening...', { type: 3 }); // Listening
    });

    client.on('messageCreate', async (message) => {
        await discordHandler.handleMessage(message);
    });

    // 6. Login
    if (!process.env.DISCORD_TOKEN) {
        console.error('Error: DISCORD_TOKEN not found in .env');
        process.exit(1);
    }

    await client.login(process.env.DISCORD_TOKEN);
}

main().catch(console.error);
