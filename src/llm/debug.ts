import { DebugFrame } from '../core/types';

export class DebugLogger {
    private enabled = false;

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    log(frame: DebugFrame) {
        if (!this.enabled) return;

        console.log('--- DEBUG FRAME ---');
        console.log(`Timestamp: ${new Date(frame.timestamp).toISOString()}`);
        console.log(`Platform: ${frame.platform}`);
        console.log(`Persona: ${frame.personaId}`);
        console.log(`Intent: ${frame.intent.type} (${frame.intent.confidence})`);
        console.log(`Reasoning: ${frame.reasoning}`);
        console.log('-------------------');
    }
}
