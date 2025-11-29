import { UserProfileManager } from '../src/features/user-profile';
import { IntentRouter } from '../src/features/intent-router';
import { PersonaManager } from '../src/features/persona-manager';
import { ConversationManager } from '../src/memory/conversation-manager';
import { CompanionLLM } from '../src/llm/companion-llm';
import { DebugLogger } from '../src/llm/debug';
import { SMSPlatform } from '../src/platforms/sms';
import { CompanionControl } from '../src/features/companion-control';

async function main() {
    console.log('--- Starting Core Verification ---');

    // 1. Setup
    const profileManager = new UserProfileManager();
    const intentRouter = new IntentRouter();
    const personaManager = new PersonaManager();
    const conversationManager = new ConversationManager();
    const debugLogger = new DebugLogger();
    debugLogger.toggle(); // Enable debug logging

    const llm = new CompanionLLM(
        profileManager,
        intentRouter,
        personaManager,
        conversationManager,
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
