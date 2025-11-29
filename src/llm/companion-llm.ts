import { UserProfileManager } from '../features/user-profile';
import { IntentRouter } from '../features/intent-router';
import { PersonaManager } from '../features/persona-manager';
import { ConversationManager } from '../memory/conversation-manager';
import { DebugLogger } from './debug';
import { CoreResponse, PlatformId } from '../core/types';

export class CompanionLLM {
    constructor(
        private profileManager: UserProfileManager,
        private intentRouter: IntentRouter,
        private personaManager: PersonaManager,
        private conversationManager: ConversationManager,
        private debugLogger: DebugLogger
    ) { }

    async generateResponse(
        userId: string,
        content: string,
        platformId: PlatformId
    ): Promise<CoreResponse> {
        const timestamp = Date.now();

        // 1. Identity & Intent
        const profile = await this.profileManager.getProfile(userId);
        const intent = await this.intentRouter.route(content);

        // 2. Persona & Boundaries
        // Check if we need to switch persona based on content
        const escalation = this.personaManager.checkEscalation(content);
        if (escalation) {
            this.personaManager.setPersona(escalation);
        }
        const persona = this.personaManager.getCurrentPersona();

        // Check boundaries
        const boundaryWarning = this.personaManager.checkBoundaries(content);
        if (boundaryWarning) {
            return {
                text: boundaryWarning,
                events: [],
            };
        }

        // 3. Memory & Context
        const history = this.conversationManager.getHistory();

        // 4. Construct Prompt (The "Companion" Prompt)
        const systemPrompt = `
${persona.systemPrompt}

## User Profile
Name: ${profile.name}
Preferred Tone: ${profile.preferredTone}
Rhythm: ${profile.interactionRhythm}
Do Not Mention: ${profile.doNotMention.join(', ')}

## Current Context
Intent: ${intent.type} (Confidence: ${intent.confidence})
Platform: ${platformId}

## Constraints
${persona.constraints.map(c => `- ${c}`).join('\n')}

## Instructions
Respond to the user's message based on your persona and the user's profile.
If the intent is 'task', be more structured.
If the intent is 'chat', be more conversational.
    `.trim();

        // Mock LLM Call (Replace with real API call)
        const responseText = `[${persona.name}]: I hear you, ${profile.name}. (Intent: ${intent.type})`;

        // 5. Update Memory
        this.conversationManager.addTurn({
            role: 'user',
            content,
            timestamp,
            intent: intent.type,
        });
        this.conversationManager.addTurn({
            role: 'assistant',
            content: responseText,
            timestamp: Date.now(),
        });

        // 6. Traceability
        this.debugLogger.log({
            timestamp,
            personaId: persona.id,
            intent,
            memoryUsed: history.map(h => h.timestamp.toString()), // Simplified IDs
            platform: platformId,
            reasoning: `Matched intent ${intent.type}, used persona ${persona.id}`,
        });

        return {
            text: responseText,
            events: [
                { type: 'intent_detected', payload: { intent } },
                ...(escalation ? [{ type: 'persona_switched', payload: { from: 'previous', to: escalation } } as const] : []),
            ],
        };
    }
}
