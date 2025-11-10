import { IPlugin, PluginManifest, PluginState } from '@ai-encounters/core';
import { PluginRegistry } from './PluginRegistry.js';
import { PluginContext, Logger } from './PluginContext.js';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Plugin Loader Options
 */
export interface PluginLoaderOptions {
  pluginsDir: string;
  dataDir: string;
  autoLoad?: boolean;
  hotReload?: boolean;
}

/**
 * Plugin discovery result
 */
export interface DiscoveredPlugin {
  name: string;
  path: string;
  manifest: PluginManifest;
}

/**
 * Plugin Loader
 * Discovers, loads, and manages plugin lifecycle
 */
export class PluginLoader {
  private options: PluginLoaderOptions;
  private registry: PluginRegistry;
  private contextFactory: (pluginName: string, config: Record<string, unknown>, dataDir: string) => PluginContext;
  private logger: Logger;

  constructor(
    options: PluginLoaderOptions,
    registry: PluginRegistry,
    contextFactory: (pluginName: string, config: Record<string, unknown>, dataDir: string) => PluginContext,
    logger: Logger
  ) {
    this.options = options;
    this.registry = registry;
    this.contextFactory = contextFactory;
    this.logger = logger;
  }

  /**
   * Discover all plugins in the plugins directory
   * @returns Array of discovered plugins
   */
  async discover(): Promise<DiscoveredPlugin[]> {
    const pluginsDir = this.options.pluginsDir;
    const discovered: DiscoveredPlugin[] = [];

    try {
      // Check if plugins directory exists
      await fs.access(pluginsDir);
    } catch (error) {
      this.logger.warn(`Plugins directory not found: ${pluginsDir}`);
      return discovered;
    }

    try {
      const entries = await fs.readdir(pluginsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const pluginPath = path.join(pluginsDir, entry.name);
        const manifestPath = path.join(pluginPath, 'plugin.json');

        try {
          // Check if plugin.json exists
          await fs.access(manifestPath);

          // Read and parse manifest
          const manifestContent = await fs.readFile(manifestPath, 'utf-8');
          const manifest: PluginManifest = JSON.parse(manifestContent);

          // Validate manifest
          if (!manifest.name || !manifest.version || !manifest.main) {
            this.logger.warn(`Invalid plugin manifest in ${entry.name}: missing required fields`);
            continue;
          }

          discovered.push({
            name: manifest.name,
            path: pluginPath,
            manifest,
          });

          this.logger.info(`Discovered plugin: ${manifest.name}@${manifest.version}`);
        } catch (error) {
          const err = error as Error;
          this.logger.warn(`Failed to load plugin from ${entry.name}: ${err.message}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to discover plugins:', error as Error);
    }

    return discovered;
  }

  /**
   * Load a plugin by name
   * @param name Plugin name
   * @param force Force reload if already loaded
   * @returns Plugin instance
   */
  async load(name: string, force = false): Promise<IPlugin> {
    const entry = this.registry.get(name);

    if (!entry) {
      throw new Error(`Plugin '${name}' not found in registry. Run discover() first.`);
    }

    if (entry.instance && !force) {
      return entry.instance;
    }

    if (entry.state === PluginState.ACTIVE && !force) {
      return entry.instance!;
    }

    try {
      this.logger.info(`Loading plugin: ${name}`);
      this.registry.setState(name, PluginState.LOADING);

      // Construct path to main entry point
      const mainPath = path.join(entry.path, entry.manifest.main);

      // Convert to file URL for ES module import
      const fileUrl = pathToFileURL(mainPath).href;

      // Dynamically import the plugin module
      const pluginModule = await import(fileUrl);

      // Get the default export or named export
      const PluginClass = pluginModule.default || pluginModule[name];

      if (!PluginClass) {
        throw new Error(`Plugin '${name}' does not export a default class or named export`);
      }

      // Instantiate the plugin
      const instance: IPlugin = new PluginClass();

      // Register instance in registry
      this.registry.setInstance(name, instance);

      this.logger.info(`Loaded plugin: ${name}`);

      return instance;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to load plugin '${name}':`, err);
      this.registry.setError(name, err);
      throw err;
    }
  }

  /**
   * Initialize a loaded plugin
   * @param name Plugin name
   */
  async initialize(name: string): Promise<void> {
    const entry = this.registry.get(name);

    if (!entry) {
      throw new Error(`Plugin '${name}' not found`);
    }

    if (!entry.instance) {
      throw new Error(`Plugin '${name}' not loaded. Call load() first.`);
    }

    if (entry.state === PluginState.ACTIVE) {
      this.logger.warn(`Plugin '${name}' is already active`);
      return;
    }

    // Validate dependencies
    const depCheck = this.registry.validateDependencies(name);
    if (!depCheck.valid) {
      throw new Error(
        `Plugin '${name}' has unsatisfied dependencies: ${depCheck.missing.join(', ')}`
      );
    }

    try {
      this.logger.info(`Initializing plugin: ${name}`);
      this.registry.setState(name, PluginState.INITIALIZING);

      // Create plugin data directory
      const pluginDataDir = path.join(this.options.dataDir, name);
      await fs.mkdir(pluginDataDir, { recursive: true });

      // Get plugin config
      const config = entry.manifest.config || {};

      // Create plugin context
      const context = this.contextFactory(name, config, pluginDataDir);
      this.registry.setContext(name, context);

      // Initialize the plugin
      await entry.instance.initialize(context);

      this.logger.info(`Initialized plugin: ${name}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to initialize plugin '${name}':`, err);
      this.registry.setError(name, err);
      throw err;
    }
  }

  /**
   * Activate a plugin
   * @param name Plugin name
   */
  async activate(name: string): Promise<void> {
    const entry = this.registry.get(name);

    if (!entry) {
      throw new Error(`Plugin '${name}' not found`);
    }

    if (!entry.instance) {
      throw new Error(`Plugin '${name}' not loaded`);
    }

    if (entry.state === PluginState.ACTIVE) {
      this.logger.warn(`Plugin '${name}' is already active`);
      return;
    }

    try {
      this.logger.info(`Activating plugin: ${name}`);

      await entry.instance.activate();

      this.registry.setState(name, PluginState.ACTIVE);

      this.logger.info(`Activated plugin: ${name}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to activate plugin '${name}':`, err);
      this.registry.setError(name, err);
      throw err;
    }
  }

  /**
   * Deactivate a plugin
   * @param name Plugin name
   */
  async deactivate(name: string): Promise<void> {
    const entry = this.registry.get(name);

    if (!entry) {
      throw new Error(`Plugin '${name}' not found`);
    }

    if (!entry.instance) {
      return; // Nothing to deactivate
    }

    if (entry.state !== PluginState.ACTIVE) {
      this.logger.warn(`Plugin '${name}' is not active`);
      return;
    }

    try {
      this.logger.info(`Deactivating plugin: ${name}`);

      await entry.instance.deactivate();

      this.registry.setState(name, PluginState.LOADED);

      this.logger.info(`Deactivated plugin: ${name}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to deactivate plugin '${name}':`, err);
      throw err;
    }
  }

  /**
   * Shutdown a plugin
   * @param name Plugin name
   */
  async shutdown(name: string): Promise<void> {
    const entry = this.registry.get(name);

    if (!entry) {
      return;
    }

    if (!entry.instance) {
      return;
    }

    try {
      this.logger.info(`Shutting down plugin: ${name}`);
      this.registry.setState(name, PluginState.SHUTTING_DOWN);

      await entry.instance.shutdown();

      this.registry.setState(name, PluginState.SHUT_DOWN);

      this.logger.info(`Shutdown plugin: ${name}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to shutdown plugin '${name}':`, err);
      throw err;
    }
  }

  /**
   * Load and activate all discovered plugins
   * @param options Load options
   */
  async loadAll(options?: { skipErrors?: boolean }): Promise<void> {
    const discovered = await this.discover();

    // Register all discovered plugins
    for (const plugin of discovered) {
      if (!this.registry.has(plugin.name)) {
        this.registry.register(plugin.name, plugin.manifest, plugin.path);
      }
    }

    // Topological sort for dependency order
    const loadOrder = this.resolveLoadOrder(discovered);

    // Load, initialize, and activate in order
    for (const name of loadOrder) {
      try {
        await this.load(name);
        await this.initialize(name);
        await this.activate(name);
      } catch (error) {
        if (!options?.skipErrors) {
          throw error;
        }
        this.logger.error(`Failed to load plugin '${name}', continuing...`, error as Error);
      }
    }
  }

  /**
   * Shutdown all active plugins
   */
  async shutdownAll(): Promise<void> {
    const activePlugins = this.registry.getActivePlugins();

    // Shutdown in reverse order
    for (const entry of activePlugins.reverse()) {
      try {
        await this.deactivate(entry.name);
        await this.shutdown(entry.name);
      } catch (error) {
        this.logger.error(`Failed to shutdown plugin '${entry.name}':`, error as Error);
      }
    }
  }

  /**
   * Resolve plugin load order based on dependencies
   * Uses topological sort
   * @param plugins Discovered plugins
   * @returns Array of plugin names in load order
   */
  private resolveLoadOrder(plugins: DiscoveredPlugin[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Build dependency graph
    for (const plugin of plugins) {
      graph.set(plugin.name, []);
      inDegree.set(plugin.name, 0);
    }

    for (const plugin of plugins) {
      const deps = plugin.manifest.dependencies || [];
      for (const dep of deps) {
        if (dep.optional) continue;
        if (!graph.has(dep.name)) continue; // Dependency not found, skip

        graph.get(dep.name)!.push(plugin.name);
        inDegree.set(plugin.name, (inDegree.get(plugin.name) || 0) + 1);
      }
    }

    // Topological sort using Kahn's algorithm
    const queue: string[] = [];
    const result: string[] = [];

    // Find all nodes with no dependencies
    for (const [name, degree] of inDegree) {
      if (degree === 0) {
        queue.push(name);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      for (const dependent of graph.get(current) || []) {
        const newDegree = (inDegree.get(dependent) || 0) - 1;
        inDegree.set(dependent, newDegree);

        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }

    // Check for circular dependencies
    if (result.length !== plugins.length) {
      const missing = plugins.map(p => p.name).filter(n => !result.includes(n));
      this.logger.warn(`Circular dependency detected. Plugins not loaded: ${missing.join(', ')}`);
    }

    return result;
  }
}
