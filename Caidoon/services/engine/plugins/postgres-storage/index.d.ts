import { IPlugin, IStorageProvider, PluginContext, PluginMetadata } from '@ai-encounters/core';
/**
 * PostgreSQL Storage Plugin
 * Provides persistent session storage using PostgreSQL
 *
 * NOTE: This is a template/skeleton implementation.
 * To use this plugin, you'll need to:
 * 1. Install pg package: npm install pg
 * 2. Set up a PostgreSQL database
 * 3. Run the schema migration (see README.md)
 * 4. Configure connection string in plugin.json
 */
export default class PostgresStoragePlugin implements IPlugin {
    private context?;
    private storage?;
    getMetadata(): PluginMetadata;
    initialize(context: PluginContext): Promise<void>;
    activate(): Promise<void>;
    deactivate(): Promise<void>;
    shutdown(): Promise<void>;
    healthCheck(): Promise<boolean>;
    /**
     * Get the storage provider instance
     * This allows other parts of the system to use this storage provider
     */
    getStorageProvider(): IStorageProvider | undefined;
    private maskConnectionString;
}
