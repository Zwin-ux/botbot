import { UserProfileManager } from '../src/features/user-profile.ts';
import { IntentRouter } from '../src/features/intent-router.ts';
import { PersonaManager } from '../src/features/persona-manager.ts';
import { ConversationManager } from '../src/memory/conversation-manager.ts';
import { CompanionLLM } from '../src/llm/companion-llm.ts';
import { DebugLogger } from '../src/llm/debug.ts';
import { JsonlVectorStore } from '../src/memory/vector-store.ts';
import { MockEmbeddings } from '../src/llm/embeddings.ts';

async function main() {
    console.log('--- Starting Intelligence Verification ---');

    // 1. Setup
    const profileManager = new UserProfileManager();
    const embeddingAdapter = new MockEmbeddings();
    const intentRouter = new IntentRouter(embeddingAdapter);
    await intentRouter.init(); // Initialize semantic router

    const personaManager = new PersonaManager();
    const conversationManager = new ConversationManager();
    const debugLogger = new DebugLogger();
    debugLogger.toggle();

    const vectorStore = new JsonlVectorStore(embeddingAdapter);

    const llm = new CompanionLLM(
        profileManager,
        intentRouter,
        personaManager,
        conversationManager,
        vectorStore,
        debugLogger
    );

    const userId = 'user-123';

    // 2. Test Semantic Intent
    console.log('\n[Test] Semantic Intent: "What is the meaning of life?"');
    const response = await llm.generateResponse(userId, 'What is the meaning of life?', 'discord');
    console.log(`[Bot]: ${response.text}`);

    // 3. Test Reflection Loop
    console.log('\n[Test] Reflection: "Reflect on this moment."');
    const reflectResponse = await llm.generateResponse(userId, 'Reflect on this moment.', 'discord');
    console.log(`[Bot]: ${reflectResponse.text}`);

    if (reflectResponse.text.includes('Thinking:') || reflectResponse.text.includes('Reflect')) {
        console.log('SUCCESS: Reflection logic triggered.');
    } else {
        console.log('WARNING: Reflection logic might not have triggered.');
    }

    console.log('\n--- Verification Complete ---');
}

main().catch(console.error);
