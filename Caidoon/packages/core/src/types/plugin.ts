// Re-export types and enums from interfaces for convenience
export type { PluginManifest, PluginDependency, PluginPermissions } from '../interfaces/IPlugin.js';
export { PluginState } from '../interfaces/IPlugin.js';

/**
 * Plugin configuration schema
 */
export interface PluginConfig {
  enabled: boolean;
  priority?: number; // Load order priority (higher = earlier)
  config?: Record<string, unknown>;
}

/**
 * Plugin registry entry
 */
export interface PluginRegistryEntry {
  name: string;
  version: string;
  path: string;
  manifest: any; // PluginManifest from IPlugin
  instance?: any; // IPlugin instance
  state: any; // PluginState from IPlugin
  loadedAt?: Date;
  error?: Error;
}

/**
 * Plugin load options
 */
export interface PluginLoadOptions {
  force?: boolean; // Force reload if already loaded
  skipDependencies?: boolean;
  validateOnly?: boolean; // Only validate, don't load
}

/**
 * Plugin event types
 */
export enum PluginEvent {
  BEFORE_LOAD = 'plugin:before-load',
  LOADED = 'plugin:loaded',
  BEFORE_INITIALIZE = 'plugin:before-initialize',
  INITIALIZED = 'plugin:initialized',
  BEFORE_ACTIVATE = 'plugin:before-activate',
  ACTIVATED = 'plugin:activated',
  BEFORE_DEACTIVATE = 'plugin:before-deactivate',
  DEACTIVATED = 'plugin:deactivated',
  BEFORE_SHUTDOWN = 'plugin:before-shutdown',
  SHUT_DOWN = 'plugin:shut-down',
  ERROR = 'plugin:error',
}
