import {
  IPlugin,
  PluginManifest,
  PluginState,
  PluginEvent,
  EventEmitter
} from '@ai-encounters/core';
import { PluginContext } from './PluginContext.js';

/**
 * Registry entry for a loaded plugin
 */
export interface RegistryEntry {
  name: string;
  version: string;
  path: string;
  manifest: PluginManifest;
  instance: IPlugin | null;
  context: PluginContext | null;
  state: PluginState;
  loadedAt?: Date;
  error?: Error;
}

/**
 * Plugin Registry
 * Central registry for all plugins in the system
 * Manages plugin lifecycle and provides access to loaded plugins
 */
export class PluginRegistry {
  private plugins: Map<string, RegistryEntry> = new Map();
  private events: EventEmitter;

  constructor(events: EventEmitter) {
    this.events = events;
  }

  /**
   * Register a plugin in the registry
   * @param name Plugin name
   * @param manifest Plugin manifest
   * @param path Plugin path
   */
  register(name: string, manifest: PluginManifest, path: string): void {
    if (this.plugins.has(name)) {
      throw new Error(`Plugin '${name}' is already registered`);
    }

    this.plugins.set(name, {
      name,
      version: manifest.version,
      path,
      manifest,
      instance: null,
      context: null,
      state: PluginState.UNLOADED,
    });

    this.events.emit(PluginEvent.BEFORE_LOAD, { name, manifest });
  }

  /**
   * Unregister a plugin from the registry
   * @param name Plugin name
   */
  unregister(name: string): void {
    const entry = this.plugins.get(name);
    if (!entry) return;

    if (entry.state === PluginState.ACTIVE) {
      throw new Error(`Cannot unregister active plugin '${name}'. Deactivate it first.`);
    }

    this.plugins.delete(name);
  }

  /**
   * Set plugin instance
   * @param name Plugin name
   * @param instance Plugin instance
   */
  setInstance(name: string, instance: IPlugin): void {
    const entry = this.plugins.get(name);
    if (!entry) {
      throw new Error(`Plugin '${name}' not found in registry`);
    }

    entry.instance = instance;
    entry.state = PluginState.LOADED;
    entry.loadedAt = new Date();

    this.events.emit(PluginEvent.LOADED, { name, instance });
  }

  /**
   * Set plugin context
   * @param name Plugin name
   * @param context Plugin context
   */
  setContext(name: string, context: PluginContext): void {
    const entry = this.plugins.get(name);
    if (!entry) {
      throw new Error(`Plugin '${name}' not found in registry`);
    }

    entry.context = context;
  }

  /**
   * Update plugin state
   * @param name Plugin name
   * @param state New state
   */
  setState(name: string, state: PluginState): void {
    const entry = this.plugins.get(name);
    if (!entry) {
      throw new Error(`Plugin '${name}' not found in registry`);
    }

    const oldState = entry.state;
    entry.state = state;

    // Emit state change events
    switch (state) {
      case PluginState.INITIALIZING:
        this.events.emit(PluginEvent.BEFORE_INITIALIZE, { name, instance: entry.instance });
        break;
      case PluginState.ACTIVE:
        this.events.emit(PluginEvent.ACTIVATED, { name, instance: entry.instance });
        break;
      case PluginState.SHUTTING_DOWN:
        this.events.emit(PluginEvent.BEFORE_SHUTDOWN, { name, instance: entry.instance });
        break;
      case PluginState.SHUT_DOWN:
        this.events.emit(PluginEvent.SHUT_DOWN, { name });
        break;
      case PluginState.ERROR:
        this.events.emit(PluginEvent.ERROR, { name, error: entry.error });
        break;
    }
  }

  /**
   * Set plugin error
   * @param name Plugin name
   * @param error Error
   */
  setError(name: string, error: Error): void {
    const entry = this.plugins.get(name);
    if (!entry) {
      throw new Error(`Plugin '${name}' not found in registry`);
    }

    entry.error = error;
    entry.state = PluginState.ERROR;

    this.events.emit(PluginEvent.ERROR, { name, error });
  }

  /**
   * Get plugin entry
   * @param name Plugin name
   * @returns Plugin entry or undefined
   */
  get(name: string): RegistryEntry | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get plugin instance
   * @param name Plugin name
   * @returns Plugin instance or null
   */
  getInstance<T extends IPlugin = IPlugin>(name: string): T | null {
    const entry = this.plugins.get(name);
    return entry?.instance as T | null;
  }

  /**
   * Check if plugin is registered
   * @param name Plugin name
   * @returns True if plugin is registered
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Get all registered plugin names
   * @returns Array of plugin names
   */
  getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get all plugins with a specific state
   * @param state Plugin state
   * @returns Array of plugin entries
   */
  getByState(state: PluginState): RegistryEntry[] {
    return Array.from(this.plugins.values()).filter(entry => entry.state === state);
  }

  /**
   * Get all active plugins
   * @returns Array of active plugin entries
   */
  getActivePlugins(): RegistryEntry[] {
    return this.getByState(PluginState.ACTIVE);
  }

  /**
   * Get all plugins with errors
   * @returns Array of plugin entries with errors
   */
  getErrorPlugins(): RegistryEntry[] {
    return this.getByState(PluginState.ERROR);
  }

  /**
   * Get plugin count
   * @returns Number of registered plugins
   */
  count(): number {
    return this.plugins.size;
  }

  /**
   * Clear all plugins from registry
   * Warning: This does not deactivate or shutdown plugins
   */
  clear(): void {
    this.plugins.clear();
  }

  /**
   * Get registry statistics
   * @returns Registry stats
   */
  getStats(): {
    total: number;
    active: number;
    error: number;
    byState: Record<string, number>;
  } {
    const stats = {
      total: this.plugins.size,
      active: 0,
      error: 0,
      byState: {} as Record<string, number>,
    };

    for (const entry of this.plugins.values()) {
      if (entry.state === PluginState.ACTIVE) stats.active++;
      if (entry.state === PluginState.ERROR) stats.error++;

      const stateKey = entry.state.toString();
      stats.byState[stateKey] = (stats.byState[stateKey] || 0) + 1;
    }

    return stats;
  }

  /**
   * Validate plugin dependencies
   * @param name Plugin name
   * @returns True if all dependencies are satisfied
   */
  validateDependencies(name: string): { valid: boolean; missing: string[] } {
    const entry = this.plugins.get(name);
    if (!entry) {
      return { valid: false, missing: [`Plugin '${name}' not found`] };
    }

    const missing: string[] = [];
    const dependencies = entry.manifest.dependencies || [];

    for (const dep of dependencies) {
      if (dep.optional) continue;

      const depEntry = this.plugins.get(dep.name);
      if (!depEntry) {
        missing.push(`${dep.name}@${dep.version}`);
      } else if (depEntry.state === PluginState.ERROR) {
        missing.push(`${dep.name} (in error state)`);
      }
    }

    return { valid: missing.length === 0, missing };
  }
}
