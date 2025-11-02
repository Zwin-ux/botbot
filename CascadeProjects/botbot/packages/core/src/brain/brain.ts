import type { InternalEvent } from '../events';
import type { Engine, Intent, SpecificIntent } from './types';

/**
 * Brain coordinates all engines and resolves conflicts between intents
 *
 * Flow:
 * 1. Receives InternalEvent
 * 2. Passes to all registered engines in parallel
 * 3. Collects intents from each engine
 * 4. Resolves conflicts (e.g., moderation blocks conversation)
 * 5. Returns prioritized list of intents for execution
 */
export class Brain {
  private engines: Map<string, Engine>;

  constructor() {
    this.engines = new Map();
  }

  /**
   * Register an engine
   */
  registerEngine(engine: Engine): void {
    if (this.engines.has(engine.name)) {
      throw new Error(`Engine ${engine.name} is already registered`);
    }
    this.engines.set(engine.name, engine);
  }

  /**
   * Unregister an engine
   */
  unregisterEngine(name: string): void {
    this.engines.delete(name);
  }

  /**
   * Process an event through all engines
   *
   * @param event - The internal event to process
   * @returns Prioritized list of intents to execute
   */
  async process(event: InternalEvent): Promise<SpecificIntent[]> {
    // Run all engines in parallel
    const engineResults = await Promise.allSettled(
      Array.from(this.engines.values()).map((engine) => this.runEngine(engine, event))
    );

    // Collect all intents from successful engine runs
    const allIntents: Intent[] = [];

    for (const result of engineResults) {
      if (result.status === 'fulfilled') {
        allIntents.push(...result.value);
      } else {
        // Log error but don't fail the whole pipeline
        console.error(`Engine failed:`, result.reason);
      }
    }

    // Resolve conflicts and prioritize
    const resolvedIntents = this.resolveConflicts(allIntents);

    // Sort by priority (highest first)
    resolvedIntents.sort((a, b) => b.priority - a.priority);

    return resolvedIntents as SpecificIntent[];
  }

  /**
   * Run a single engine with timeout and error handling
   */
  private async runEngine(engine: Engine, event: InternalEvent): Promise<Intent[]> {
    const timeout = 5000; // 5 second timeout per engine

    return Promise.race([
      engine.decide(event),
      new Promise<Intent[]>((_, reject) =>
        setTimeout(() => reject(new Error(`Engine ${engine.name} timed out`)), timeout)
      ),
    ]);
  }

  /**
   * Resolve conflicts between intents
   *
   * Priority rules:
   * 1. Moderation actions (delete, ban) block conversation replies
   * 2. High-severity warnings block low-priority engagement
   * 3. Multiple replies to same channel are deduplicated
   */
  private resolveConflicts(intents: Intent[]): Intent[] {
    const resolved: Intent[] = [];

    // Check if moderation is deleting/banning
    const hasDelete = intents.some((i) => i.type === 'delete');
    const hasBan = intents.some((i) => i.type === 'ban');
    const hasTimeout = intents.some((i) => i.type === 'timeout');

    // If moderation is taking action, block conversation replies
    if (hasDelete || hasBan || hasTimeout) {
      // Keep all moderation intents
      resolved.push(...intents.filter((i) => i.source === 'moderation'));

      // Keep insight/logging intents
      resolved.push(
        ...intents.filter((i) => i.type === 'logMetric' || i.type === 'logModeration')
      );

      // Block conversation replies to avoid awkward timing
      // (Don't want bot to joke right after deleting a toxic message)

      // Keep engagement and other non-reply intents
      resolved.push(
        ...intents.filter(
          (i) =>
            i.source === 'engagement' &&
            i.type !== 'reply' &&
            i.source !== 'moderation' &&
            i.type !== 'logMetric' &&
            i.type !== 'logModeration'
        )
      );

      return resolved;
    }

    // No moderation conflicts, keep all intents but deduplicate

    // Deduplicate replies to same channel
    const replies = intents.filter((i) => i.type === 'reply');
    const repliesByChannel = new Map<string, Intent>();

    for (const reply of replies) {
      const channelId = (reply as any).channelId;
      const existing = repliesByChannel.get(channelId);

      if (!existing || reply.priority > existing.priority) {
        repliesByChannel.set(channelId, reply);
      }
    }

    // Add deduplicated replies
    resolved.push(...Array.from(repliesByChannel.values()));

    // Add all non-reply intents
    resolved.push(...intents.filter((i) => i.type !== 'reply'));

    return resolved;
  }

  /**
   * Get registered engine names
   */
  getEngineNames(): string[] {
    return Array.from(this.engines.keys());
  }

  /**
   * Check if engine is registered
   */
  hasEngine(name: string): boolean {
    return this.engines.has(name);
  }
}
