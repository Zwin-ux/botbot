import { Intent, IntentType } from '../core/types';

export class IntentRouter {
    /**
     * Classify the intent of a message.
     * Currently uses heuristic keyword matching.
     * Future upgrade: Use a small, fast LLM or embedding classifier.
     */
    async route(content: string): Promise<Intent> {
        const lower = content.toLowerCase();

        // 1. Command
        if (content.startsWith('/') || content.startsWith('!')) {
            return { type: 'command', confidence: 1.0 };
        }

        // 2. Help
        if (
            lower.includes('help') ||
            lower.includes('how do i') ||
            lower.includes('what can you do') ||
            lower.includes('manual')
        ) {
            return { type: 'help', confidence: 0.8 };
        }

        // 3. Task
        if (
            lower.includes('remind') ||
            lower.includes('schedule') ||
            lower.includes('todo') ||
            lower.includes('list') ||
            lower.includes('buy') ||
            lower.includes('calendar')
        ) {
            return { type: 'task', confidence: 0.8 };
        }

        // 4. Reflection
        if (
            lower.includes('think about') ||
            lower.includes('reflect') ||
            lower.includes('opinion') ||
            lower.includes('why do you') ||
            lower.includes('what do you think')
        ) {
            return { type: 'reflection', confidence: 0.7 };
        }

        // 5. Default: Chat
        return { type: 'chat', confidence: 0.5 };
    }
}
