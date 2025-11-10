import {
  IPlugin,
  EventEmitter,
  HookManager,
  PluginLogger,
  PluginEventEmitter,
  PluginHookRegistry,
  HookHandler
} from '@ai-encounters/core';
import { PluginRegistry } from './PluginRegistry.js';

/**
 * Plugin Context Implementation
 * Provides plugins with access to core engine APIs and services
 */
export class PluginContext {
  public readonly pluginName: string;
  private pluginConfig: Record<string, unknown>;
  private pluginDataDir: string;
  private eventEmitter: EventEmitter;
  private hookManager: HookManager;
  private registry: PluginRegistry;
  public logger: PluginLogger;

  constructor(
    pluginName: string,
    config: Record<string, unknown>,
    dataDir: string,
    events: EventEmitter,
    hooks: HookManager,
    registry: PluginRegistry,
    private baseLogger: Logger
  ) {
    this.pluginName = pluginName;
    this.pluginConfig = config;
    this.pluginDataDir = dataDir;
    this.eventEmitter = events;
    this.hookManager = hooks;
    this.registry = registry;

    // Create plugin-scoped logger
    this.logger = {
      debug: (message: string, meta?: Record<string, unknown>) => {
        this.baseLogger.debug(`[${this.pluginName}] ${message}`, meta);
      },
      info: (message: string, meta?: Record<string, unknown>) => {
        this.baseLogger.info(`[${this.pluginName}] ${message}`, meta);
      },
      warn: (message: string, meta?: Record<string, unknown>) => {
        this.baseLogger.warn(`[${this.pluginName}] ${message}`, meta);
      },
      error: (message: string, error?: Error, meta?: Record<string, unknown>) => {
        this.baseLogger.error(`[${this.pluginName}] ${message}`, error, meta);
      },
    };
  }

  /**
   * Get plugin configuration
   */
  get config(): Record<string, unknown> {
    return this.pluginConfig;
  }

  /**
   * Get plugin data directory
   */
  get dataDir(): string {
    return this.pluginDataDir;
  }


  /**
   * Get event emitter interface for plugins
   */
  get events(): PluginEventEmitter {
    return {
      on: (event: string, handler: (...args: any[]) => void | Promise<void>) => {
        this.eventEmitter.on(event, handler);
      },
      once: (event: string, handler: (...args: any[]) => void | Promise<void>) => {
        this.eventEmitter.once(event, handler);
      },
      off: (event: string, handler: (...args: any[]) => void | Promise<void>) => {
        this.eventEmitter.off(event, handler);
      },
      emit: async (event: string, ...args: any[]) => {
        await this.eventEmitter.emit(event, ...args);
      },
    };
  }

  /**
   * Get hook registry interface for plugins
   */
  get hooks(): PluginHookRegistry {
    return {
      register: <T = any, R = T>(hook: string, handler: HookHandler<T, R>) => {
        this.hookManager.register(hook, handler, { pluginName: this.pluginName });
      },
      unregister: <T = any, R = T>(hook: string, handler: HookHandler<T, R>) => {
        this.hookManager.unregister(hook, handler);
      },
    };
  }

  /**
   * Get another plugin instance
   * @param name Plugin name
   * @returns Plugin instance or null
   */
  getPlugin<T extends IPlugin = IPlugin>(name: string): T | null {
    return this.registry.getInstance<T>(name);
  }
}

/**
 * Simple logger interface
 * This will be replaced with a proper logger (Winston) later
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

/**
 * Console logger implementation
 * Temporary until Winston is integrated
 */
export class ConsoleLogger implements Logger {
  debug(message: string, meta?: Record<string, unknown>): void {
    console.debug(message, meta || '');
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.info(message, meta || '');
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(message, meta || '');
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    console.error(message, error, meta || '');
  }
}
