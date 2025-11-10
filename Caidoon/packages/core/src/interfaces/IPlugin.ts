import type { HookHandler } from '../hooks/HookManager.js';

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  tags?: string[];
  dependencies?: PluginDependency[];
}

/**
 * Plugin dependency specification
 */
export interface PluginDependency {
  name: string;
  version: string; // Semver version range
  optional?: boolean;
}

/**
 * Plugin lifecycle state
 */
export enum PluginState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  ERROR = 'error',
  SHUTTING_DOWN = 'shutting_down',
  SHUT_DOWN = 'shut_down',
}

/**
 * Plugin context provided to plugins
 * Gives plugins access to core engine APIs
 */
export interface PluginContext {
  /**
   * Plugin configuration from config files
   */
  config: Record<string, unknown>;

  /**
   * Logger instance for the plugin
   */
  logger: PluginLogger;

  /**
   * Event emitter for subscribing to events
   */
  events: PluginEventEmitter;

  /**
   * Hook registration for modifying behavior
   */
  hooks: PluginHookRegistry;

  /**
   * Access to other loaded plugins
   */
  getPlugin<T extends IPlugin = IPlugin>(name: string): T | null;

  /**
   * Data directory for plugin storage
   */
  dataDir: string;
}

/**
 * Plugin logger interface
 */
export interface PluginLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

/**
 * Plugin event emitter interface
 */
export interface PluginEventEmitter {
  on(event: string, handler: (...args: any[]) => void | Promise<void>): void;
  once(event: string, handler: (...args: any[]) => void | Promise<void>): void;
  off(event: string, handler: (...args: any[]) => void | Promise<void>): void;
  emit(event: string, ...args: any[]): Promise<void>;
}

/**
 * Plugin hook registry interface
 */
export interface PluginHookRegistry {
  register(hook: string, handler: HookHandler): void;
  unregister(hook: string, handler: HookHandler): void;
}

// HookHandler is imported above and used in PluginHookRegistry

/**
 * Base plugin interface that all plugins must implement
 */
export interface IPlugin {
  /**
   * Plugin metadata
   */
  getMetadata(): PluginMetadata;

  /**
   * Initialize the plugin
   * Called after all plugins are loaded but before activation
   * @param context Plugin execution context
   */
  initialize(context: PluginContext): Promise<void>;

  /**
   * Activate the plugin
   * Called after initialization, plugin becomes active
   */
  activate(): Promise<void>;

  /**
   * Deactivate the plugin
   * Called before shutdown, plugin should clean up resources
   */
  deactivate(): Promise<void>;

  /**
   * Shutdown the plugin
   * Final cleanup before plugin is unloaded
   */
  shutdown(): Promise<void>;

  /**
   * Health check for the plugin
   * Returns true if plugin is functioning correctly
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Plugin manifest file structure (plugin.json)
 */
export interface PluginManifest extends PluginMetadata {
  main: string; // Entry point file
  engines?: {
    node?: string;
    'ai-encounters'?: string;
  };
  config?: Record<string, unknown>; // Default configuration
  permissions?: PluginPermissions;
}

/**
 * Plugin permissions
 */
export interface PluginPermissions {
  storage?: boolean; // Can access storage
  network?: boolean; // Can make network requests
  fileSystem?: boolean; // Can access file system
  env?: boolean; // Can access environment variables
  hooks?: string[]; // Allowed hooks to register
  events?: string[]; // Allowed events to listen to
}
