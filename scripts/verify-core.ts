import { UserProfileManager } from '../src/features/user-profile';
import { IntentRouter } from '../src/features/intent-router';
import { PersonaManager } from '../src/features/persona-manager';
import { ConversationManager } from '../src/memory/conversation-manager';
import { CompanionLLM } from '../src/llm/companion-llm';
import { DebugLogger } from '../src/llm/debug';
import { SMSPlatform } from '../src/platforms/sms';
import { CompanionControl } from '../src/features/companion-control';
import { JsonlVectorStore } from '../src/memory/vector-store';
import { MockEmbeddings } from '../src/llm/embeddings';

async function main() {
    console.log('--- Starting Core Verification ---');

    // 1. Setup
    const profileManager = new UserProfileManager();
    const intentRouter = new IntentRouter();
    const personaManager = new PersonaManager();
    const conversationManager = new ConversationManager();
    const debugLogger = new DebugLogger();
    debugLogger.toggle(); // Enable debug logging

    const vectorStore = new JsonlVectorStore(new MockEmbeddings());

    const llm = new CompanionLLM(
        profileManager,
        intentRouter,
        personaManager,
        conversationManager,
        vectorStore,
        debugLogger
    );

    const control = new CompanionControl(personaManager, conversationManager, profileManager);
    const sms = new SMSPlatform(conversationManager);

    const userId = 'user-123';

    // 2. Simulate Discord Chat
    console.log('\n[Discord] User: "Hey, can you help me debug this code?"');
    let response = await llm.generateResponse(userId, 'Hey, can you help me debug this code?', 'discord');
    console.log(`[Bot]: ${response.text}`);

    // Verify Persona Switch (should switch to Engineer)
    console.log(`Current Persona: ${personaManager.getCurrentPersona().id} (Expected: engineer)`);

    // 2.5 Test RAG (Inject a memory and search)
    console.log('\n[System] Injecting memory: "User loves pizza."');
    await vectorStore.upsert({
        id: 'test-mem-1',
        text: 'User loves pizza.',
        metadata: { userId, intent: 'fact' }
    });

    console.log('[Discord] User: "What is my favorite food?"');
    // In a real LLM, this would use the context. For mock, we check logs/debug.
    const ragResponse = await llm.generateResponse(userId, 'What is my favorite food?', 'discord');
    console.log(`[Bot]: ${ragResponse.text}`);

    // 3. Simulate SMS (Continuity)
    console.log('\n[SMS] User: "Thanks, I gotta go."');
    // Simulate receiving SMS
    const smsMsg = await sms.receiveMessage(userId, 'Thanks, I gotta go.');
    // Generate response with continuity check
    const smsResponse = await sms.generateResponse(smsMsg, 'No problem. Talk later.');
    console.log(`[Bot SMS]: ${smsResponse}`);

    // 4. Verify Control Command
    console.log('\n[Command] User: "/whoami"');
    const cmdResponse = await control.handleCommand('/whoami', userId);
    console.log(`[System]: ${cmdResponse}`);

    console.log('\n--- Verification Complete ---');
}

main().catch(console.error);
