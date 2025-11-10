/**
 * Hook Manager for before/after hooks in the AI Encounters Engine
 * Allows plugins to intercept and modify data at key lifecycle points
 */

export type HookHandler<T = any, R = T> = (data: T) => Promise<R> | R;

export interface HookSubscription<T = any, R = T> {
  hook: string;
  handler: HookHandler<T, R>;
  priority: number; // Higher priority runs first
  pluginName?: string;
}

export class HookManager {
  private hooks: Map<string, HookSubscription[]> = new Map();

  /**
   * Register a hook handler
   * @param hook Hook name
   * @param handler Hook handler function
   * @param options Optional configuration
   */
  register<T = any, R = T>(
    hook: string,
    handler: HookHandler<T, R>,
    options?: {
      priority?: number;
      pluginName?: string;
    }
  ): void {
    let subscriptions = this.hooks.get(hook);

    if (!subscriptions) {
      subscriptions = [];
      this.hooks.set(hook, subscriptions);
    }

    subscriptions.push({
      hook,
      handler,
      priority: options?.priority ?? 0,
      pluginName: options?.pluginName,
    });

    // Sort by priority (highest first)
    subscriptions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Unregister a hook handler
   * @param hook Hook name
   * @param handler Hook handler function
   */
  unregister<T = any, R = T>(hook: string, handler: HookHandler<T, R>): void {
    const subscriptions = this.hooks.get(hook);
    if (!subscriptions) return;

    const index = subscriptions.findIndex(sub => sub.handler === handler);
    if (index !== -1) {
      subscriptions.splice(index, 1);
    }

    if (subscriptions.length === 0) {
      this.hooks.delete(hook);
    }
  }

  /**
   * Unregister all hooks for a plugin
   * @param pluginName Plugin name
   */
  unregisterPlugin(pluginName: string): void {
    for (const [hook, subscriptions] of this.hooks.entries()) {
      const filtered = subscriptions.filter(sub => sub.pluginName !== pluginName);
      if (filtered.length === 0) {
        this.hooks.delete(hook);
      } else {
        this.hooks.set(hook, filtered);
      }
    }
  }

  /**
   * Trigger a hook and get transformed data
   * Handlers are called in priority order (highest to lowest)
   * Each handler receives the output of the previous handler
   *
   * @param hook Hook name
   * @param data Initial data
   * @returns Transformed data after all handlers
   */
  async trigger<T = any>(hook: string, data: T): Promise<T> {
    const subscriptions = this.hooks.get(hook);
    if (!subscriptions || subscriptions.length === 0) {
      return data;
    }

    let result: any = data;

    for (const subscription of subscriptions) {
      try {
        const handlerResult = subscription.handler(result);
        result = handlerResult instanceof Promise ? await handlerResult : handlerResult;
      } catch (error) {
        console.error(
          `Error in hook handler for '${hook}'` +
          (subscription.pluginName ? ` (plugin: ${subscription.pluginName})` : ''),
          error
        );
        // Continue with current result if handler fails
      }
    }

    return result;
  }

  /**
   * Trigger a hook without waiting for completion (fire and forget)
   * Useful for notification hooks that don't modify data
   *
   * @param hook Hook name
   * @param data Data to pass to handlers
   */
  triggerAsync<T = any>(hook: string, data: T): void {
    this.trigger(hook, data).catch(error => {
      console.error(`Error in async hook trigger for '${hook}':`, error);
    });
  }

  /**
   * Check if a hook has any handlers
   * @param hook Hook name
   * @returns True if hook has handlers
   */
  hasHandlers(hook: string): boolean {
    const subscriptions = this.hooks.get(hook);
    return !!subscriptions && subscriptions.length > 0;
  }

  /**
   * Get number of handlers for a hook
   * @param hook Hook name
   * @returns Number of handlers
   */
  handlerCount(hook: string): number {
    const subscriptions = this.hooks.get(hook);
    return subscriptions ? subscriptions.length : 0;
  }

  /**
   * Get all registered hook names
   * @returns Array of hook names
   */
  hookNames(): string[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear();
  }
}

/**
 * Standard hook names used throughout the engine
 */
export enum StandardHooks {
  // Session hooks
  BEFORE_CREATE_SESSION = 'before-create-session',
  AFTER_CREATE_SESSION = 'after-create-session',
  BEFORE_LOAD_SESSION = 'before-load-session',
  AFTER_LOAD_SESSION = 'after-load-session',
  BEFORE_UPDATE_OBJECTIVE = 'before-update-objective',
  AFTER_UPDATE_OBJECTIVE = 'after-update-objective',
  BEFORE_COMPLETE_SESSION = 'before-complete-session',
  AFTER_COMPLETE_SESSION = 'after-complete-session',
  BEFORE_DELETE_SESSION = 'before-delete-session',
  AFTER_DELETE_SESSION = 'after-delete-session',

  // Encounter generation hooks
  BEFORE_GENERATE_ENCOUNTER = 'before-generate-encounter',
  AFTER_GENERATE_ENCOUNTER = 'after-generate-encounter',
  TRANSFORM_ENCOUNTER = 'transform-encounter',

  // Storage hooks
  BEFORE_STORAGE_WRITE = 'before-storage-write',
  AFTER_STORAGE_WRITE = 'after-storage-write',
  BEFORE_STORAGE_READ = 'before-storage-read',
  AFTER_STORAGE_READ = 'after-storage-read',

  // Request/Response hooks
  BEFORE_REQUEST = 'before-request',
  AFTER_RESPONSE = 'after-response',
  ON_ERROR = 'on-error',

  // Validation hooks
  VALIDATE_SESSION_START = 'validate-session-start',
  VALIDATE_PLAYER_CONTEXT = 'validate-player-context',
  VALIDATE_ENCOUNTER = 'validate-encounter',
}
