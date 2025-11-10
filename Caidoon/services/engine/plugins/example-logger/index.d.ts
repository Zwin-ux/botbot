import { IPlugin, PluginContext, PluginMetadata } from '@ai-encounters/core';
/**
 * Example Logger Plugin
 * Demonstrates how to build a plugin that listens to events
 */
export default class ExampleLoggerPlugin implements IPlugin {
    private context?;
    private logFile?;
    getMetadata(): PluginMetadata;
    initialize(context: PluginContext): Promise<void>;
    activate(): Promise<void>;
    deactivate(): Promise<void>;
    shutdown(): Promise<void>;
    healthCheck(): Promise<boolean>;
    /**
     * Log an event to console and optionally to file
     */
    private logEvent;
}
