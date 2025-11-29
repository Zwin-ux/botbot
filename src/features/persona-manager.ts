import { Persona } from '../core/types';

const DEFAULT_PERSONAS: Persona[] = [
    {
        id: 'companion',
        name: 'BotBot',
        description: 'A friendly, helpful, and empathetic personal companion.',
        systemPrompt: 'You are BotBot, a personal companion. Be warm, empathetic, and helpful. Remember context.',
        constraints: ['Avoid overly technical jargon unless asked', 'Do not be rude'],
        escalationRules: [
            'If user asks for code or technical help, switch to "engineer"',
            'If user wants to play a game, switch to "gamer"',
        ],
        tone: 'casual',
    },
    {
        id: 'engineer',
        name: 'BotBot (Engineer)',
        description: 'A precise, technical assistant focused on code and systems.',
        systemPrompt: 'You are BotBot in Engineering Mode. Be precise, concise, and focus on technical correctness.',
        constraints: ['No small talk', 'Use markdown for code', 'Be objective'],
        escalationRules: [
            'If user asks for emotional support or chat, switch to "companion"',
        ],
        tone: 'concise',
    },
    {
        id: 'gamer',
        name: 'BotBot (Gamer)',
        description: 'A chill, enthusiastic gaming buddy.',
        systemPrompt: 'You are BotBot in Gamer Mode. Use gamer slang, be enthusiastic, and talk about games.',
        constraints: ['No formal language', 'Use emojis freely'],
        escalationRules: [
            'If user gets serious or asks for help, switch to "companion"',
        ],
        tone: 'playful',
    },
];

export class PersonaManager {
    private personas: Map<string, Persona> = new Map();
    private currentPersonaId: string = 'companion';

    constructor() {
        DEFAULT_PERSONAS.forEach(p => this.personas.set(p.id, p));
    }

    getCurrentPersona(): Persona {
        return this.personas.get(this.currentPersonaId)!;
    }

    getPersona(id: string): Persona | undefined {
        return this.personas.get(id);
    }

    setPersona(id: string): boolean {
        if (this.personas.has(id)) {
            this.currentPersonaId = id;
            return true;
        }
        return false;
    }

    /**
     * Check if the content violates any constraints of the current persona.
     * Returns a warning message if violated, or null if okay.
     */
    checkBoundaries(content: string): string | null {
        const persona = this.getCurrentPersona();
        // Simple keyword checks for MVP
        if (persona.id === 'engineer' && (content.includes('lol') || content.includes('haha'))) {
            return "I prefer to keep things professional in Engineering Mode.";
        }
        return null;
    }

    /**
     * Check if we should switch persona based on content.
     * Returns the new persona ID if a switch is triggered, or null.
     */
    checkEscalation(content: string): string | null {
        const lower = content.toLowerCase();
        const current = this.currentPersonaId;

        if (current === 'companion') {
            if (lower.includes('code') || lower.includes('debug') || lower.includes('function')) {
                return 'engineer';
            }
            if (lower.includes('game') || lower.includes('play') || lower.includes('steam')) {
                return 'gamer';
            }
        } else if (current === 'engineer') {
            if (lower.includes('sad') || lower.includes('happy') || lower.includes('chat')) {
                return 'companion';
            }
        } else if (current === 'gamer') {
            if (lower.includes('help') || lower.includes('serious')) {
                return 'companion';
            }
        }

        return null;
    }
}
