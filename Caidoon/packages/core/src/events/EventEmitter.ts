/**
 * Type-safe event emitter for AI Encounters Engine
 * Supports async event handlers and error handling
 */

export type EventHandler<T = any> = (data: T) => void | Promise<void>;

export interface EventSubscription {
  event: string;
  handler: EventHandler;
  once: boolean;
}

export class EventEmitter {
  private handlers: Map<string, EventSubscription[]> = new Map();
  private maxListeners = 100;

  /**
   * Register an event handler
   * @param event Event name
   * @param handler Event handler function
   */
  on<T = any>(event: string, handler: EventHandler<T>): void {
    this.addEventListener(event, handler, false);
  }

  /**
   * Register a one-time event handler
   * Handler is removed after first invocation
   * @param event Event name
   * @param handler Event handler function
   */
  once<T = any>(event: string, handler: EventHandler<T>): void {
    this.addEventListener(event, handler, true);
  }

  /**
   * Remove an event handler
   * @param event Event name
   * @param handler Event handler function to remove
   */
  off<T = any>(event: string, handler: EventHandler<T>): void {
    const subscriptions = this.handlers.get(event);
    if (!subscriptions) return;

    const index = subscriptions.findIndex(sub => sub.handler === handler);
    if (index !== -1) {
      subscriptions.splice(index, 1);
    }

    if (subscriptions.length === 0) {
      this.handlers.delete(event);
    }
  }

  /**
   * Remove all handlers for an event, or all handlers if no event specified
   * @param event Optional event name
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Emit an event to all registered handlers
   * Handlers are called in registration order
   * Async handlers are awaited
   * @param event Event name
   * @param data Event data
   */
  async emit<T = any>(event: string, data?: T): Promise<void> {
    const subscriptions = this.handlers.get(event);
    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    // Create a copy to avoid issues if handlers modify subscriptions
    const handlersToCall = [...subscriptions];
    const oneTimeHandlers: EventSubscription[] = [];

    for (const subscription of handlersToCall) {
      try {
        const result = subscription.handler(data);
        if (result instanceof Promise) {
          await result;
        }

        if (subscription.once) {
          oneTimeHandlers.push(subscription);
        }
      } catch (error) {
        console.error(`Error in event handler for '${event}':`, error);
        // Continue executing other handlers even if one fails
      }
    }

    // Remove one-time handlers
    for (const subscription of oneTimeHandlers) {
      this.off(event, subscription.handler);
    }
  }

  /**
   * Get number of listeners for an event
   * @param event Event name
   * @returns Number of listeners
   */
  listenerCount(event: string): number {
    const subscriptions = this.handlers.get(event);
    return subscriptions ? subscriptions.length : 0;
  }

  /**
   * Get all event names with listeners
   * @returns Array of event names
   */
  eventNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Set maximum number of listeners per event
   * @param max Maximum listeners
   */
  setMaxListeners(max: number): void {
    this.maxListeners = max;
  }

  /**
   * Get maximum number of listeners
   * @returns Maximum listeners
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }

  private addEventListener(event: string, handler: EventHandler, once: boolean): void {
    let subscriptions = this.handlers.get(event);

    if (!subscriptions) {
      subscriptions = [];
      this.handlers.set(event, subscriptions);
    }

    if (subscriptions.length >= this.maxListeners) {
      console.warn(
        `Warning: Possible EventEmitter memory leak detected. ` +
        `${subscriptions.length} listeners added for event '${event}'. ` +
        `Use setMaxListeners() to increase limit.`
      );
    }

    subscriptions.push({ event, handler, once });
  }
}
