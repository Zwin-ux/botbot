import { ConversationTurn, IntentType } from '../core/types';

const MAX_HISTORY_SIZE = 20;
const DECAY_THRESHOLD = 0.3;

export class ConversationManager {
    private history: ConversationTurn[] = [];

    addTurn(turn: ConversationTurn) {
        this.history.push(turn);
        this.prune();
    }

    getHistory(): ConversationTurn[] {
        return [...this.history];
    }

    clear() {
        this.history = [];
    }

    /**
     * Prune history based on a scoring system (Decay Logic).
     * Score = Recency * Importance
     */
    private prune() {
        if (this.history.length <= MAX_HISTORY_SIZE) return;

        const now = Date.now();
        const scored = this.history.map((turn, index) => {
            // Recency: 1.0 for newest, 0.0 for oldest (linear decay)
            // Actually, let's use a time-based decay or just index-based for simplicity in MVP
            const age = this.history.length - 1 - index;
            const recencyScore = Math.max(0, 1 - age * 0.05); // -0.05 per turn

            // Importance: Boost based on intent
            let importanceScore = 0.5; // Base importance
            if (turn.intent === 'task' || turn.intent === 'help') importanceScore = 0.8;
            if (turn.intent === 'reflection') importanceScore = 0.9;

            // Emotional weight (placeholder, would come from sentiment analysis)
            // if (turn.sentiment === 'high') importanceScore += 0.2;

            return {
                turn,
                score: recencyScore * 0.6 + importanceScore * 0.4, // Weighted average
            };
        });

        // Keep top N or those above threshold
        // For stability, we always keep the last 5 regardless of score
        const protectedCount = 5;
        const protectedTurns = scored.slice(-protectedCount).map(s => s.turn);

        const candidates = scored.slice(0, -protectedCount);
        const survivors = candidates
            .filter(s => s.score > DECAY_THRESHOLD)
            .map(s => s.turn);

        this.history = [...survivors, ...protectedTurns];

        // Hard limit safety net
        if (this.history.length > MAX_HISTORY_SIZE) {
            this.history = this.history.slice(-MAX_HISTORY_SIZE);
        }
    }
}
