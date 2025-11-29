import { PersonaManager } from './persona-manager';
import { ConversationManager } from '../memory/conversation-manager';
import { UserProfileManager } from './user-profile';

export class CompanionControl {
    constructor(
        private personaManager: PersonaManager,
        private conversationManager: ConversationManager,
        private profileManager: UserProfileManager
    ) { }

    async handleCommand(content: string, userId: string): Promise<string | null> {
        const args = content.split(' ');
        const command = args[0].toLowerCase();

        switch (command) {
            case '/persona':
                if (args[1]) {
                    const success = this.personaManager.setPersona(args[1]);
                    return success
                        ? `Switched to ${this.personaManager.getCurrentPersona().name}.`
                        : `Persona '${args[1]}' not found.`;
                }
                return `Current persona: ${this.personaManager.getCurrentPersona().name}`;

            case '/clear':
                this.conversationManager.clear();
                return "Memory cleared. Let's start fresh.";

            case '/whoami':
                const profile = await this.profileManager.getProfile(userId);
                return `You are ${profile.name}. Tone: ${profile.preferredTone}. Rhythm: ${profile.interactionRhythm}.`;

            case '/help':
                return "Commands: /persona [id], /clear, /whoami, /debug";

            default:
                return null;
        }
    }
}
