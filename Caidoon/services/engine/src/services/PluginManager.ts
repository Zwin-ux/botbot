import { EventEmitter, HookManager } from '@ai-encounters/core';
import { PluginRegistry, PluginLoader, PluginContext, ConsoleLogger } from '../plugins/index.js';
import path from 'path';

/**
 * Plugin Manager
 * High-level service for managing the plugin system
 */
export class PluginManager {
  private registry: PluginRegistry;
  private loader: PluginLoader;
  private events: EventEmitter;
  private hooks: HookManager;
  private logger = new ConsoleLogger();

  constructor(
    pluginsDir: string,
    dataDir: string,
    events: EventEmitter,
    hooks: HookManager
  ) {
    this.events = events;
    this.hooks = hooks;

    // Initialize registry
    this.registry = new PluginRegistry(events);

    // Create context factory
    const contextFactory = (
      pluginName: string,
      config: Record<string, unknown>,
      pluginDataDir: string
    ): PluginContext => {
      return new PluginContext(
        pluginName,
        config,
        pluginDataDir,
        this.events,
        this.hooks,
        this.registry,
        this.logger
      );
    };

    // Initialize loader
    this.loader = new PluginLoader(
      {
        pluginsDir,
        dataDir,
        autoLoad: true,
        hotReload: false,
      },
      this.registry,
      contextFactory,
      this.logger
    );
  }

  /**
   * Initialize the plugin system
   * Discovers and loads all plugins
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing plugin system...');

    try {
      // Discover and load all plugins
      await this.loader.loadAll({ skipErrors: true });

      const stats = this.registry.getStats();
      this.logger.info(`Plugin system initialized: ${stats.active}/${stats.total} plugins active`);
    } catch (error) {
      this.logger.error('Failed to initialize plugin system:', error as Error);
      throw error;
    }
  }

  /**
   * Load a specific plugin by name
   */
  async loadPlugin(name: string): Promise<void> {
    await this.loader.load(name);
    await this.loader.initialize(name);
    await this.loader.activate(name);
  }

  /**
   * Unload a specific plugin by name
   */
  async unloadPlugin(name: string): Promise<void> {
    await this.loader.deactivate(name);
    await this.loader.shutdown(name);
  }

  /**
   * Get plugin statistics
   */
  getStats() {
    return this.registry.getStats();
  }

  /**
   * Get all active plugins
   */
  getPlugins() {
    return this.registry.getActivePlugins();
  }

  /**
   * Get a specific plugin by name
   */
  getPlugin(name: string) {
    return this.registry.get(name);
  }

  /**
   * Shutdown all plugins
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down plugin system...');
    await this.loader.shutdownAll();
    this.logger.info('Plugin system shutdown complete');
  }
}
