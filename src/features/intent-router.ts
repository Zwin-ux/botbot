import { Intent, IntentType } from '../core/types';
import { EmbeddingAdapter } from '../llm/embeddings';

const INTENT_EXAMPLES: Record<IntentType, string[]> = {
    chat: [
        "Hello", "How are you?", "Tell me a joke", "Good morning", "What's up?",
        "I'm feeling happy today", "Just wanted to chat"
    ],
    task: [
        "Remind me to buy milk", "Add this to my todo list", "Schedule a meeting",
        "Create a ticket", "Note this down", "Set a timer"
    ],
    help: [
        "How do I use this?", "Help me", "What commands are available?",
        "Show me the manual", "I'm stuck"
    ],
    reflection: [
        "What do you think about AI?", "Analyze this sentiment", "Reflect on our conversation",
        "What is your opinion?", "Why did you say that?", "Let's think step by step"
    ],
    command: [
        "/persona", "/clear", "/whoami", "/help"
    ]
};

export class IntentRouter {
    private exampleEmbeddings: Map<IntentType, number[][]> = new Map();
    private initialized = false;

    constructor(private embeddingAdapter: EmbeddingAdapter) { }

    async init() {
        if (this.initialized) return;
        console.log('Initializing Semantic Intent Router...');

        for (const [type, examples] of Object.entries(INTENT_EXAMPLES)) {
            const embeddings = await Promise.all(
                examples.map(ex => this.embeddingAdapter.embed(ex))
            );
            this.exampleEmbeddings.set(type as IntentType, embeddings);
        }
        this.initialized = true;
    }

    async route(content: string): Promise<Intent> {
        if (!this.initialized) await this.init();

        // 1. Hard Rules (Commands)
        if (content.startsWith('/') || content.startsWith('!')) {
            return { type: 'command', confidence: 1.0 };
        }

        // 2. Semantic Classification
        const inputEmbedding = await this.embeddingAdapter.embed(content);
        let bestIntent: IntentType = 'chat';
        let maxScore = -1;

        for (const [type, examples] of this.exampleEmbeddings.entries()) {
            if (type === 'command') continue; // Skip commands for semantic search

            // Find max similarity among examples for this intent
            let maxIntentScore = -1;
            for (const exampleEmb of examples) {
                const score = this.cosineSimilarity(inputEmbedding, exampleEmb);
                if (score > maxIntentScore) maxIntentScore = score;
            }

            if (maxIntentScore > maxScore) {
                maxScore = maxIntentScore;
                bestIntent = type;
            }
        }

        return { type: bestIntent, confidence: maxScore };
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        let dot = 0;
        let magA = 0;
        let magB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }
        return dot / (Math.sqrt(magA) * Math.sqrt(magB));
    }
}
