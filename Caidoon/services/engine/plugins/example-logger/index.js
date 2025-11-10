import { SessionEvent } from '@ai-encounters/core';
import * as fs from 'fs/promises';
import * as path from 'path';
/**
 * Example Logger Plugin
 * Demonstrates how to build a plugin that listens to events
 */
export default class ExampleLoggerPlugin {
    context;
    logFile;
    getMetadata() {
        return {
            name: 'example-logger',
            version: '1.0.0',
            description: 'Example plugin that logs all session lifecycle events',
            author: 'AI Encounters',
        };
    }
    async initialize(context) {
        this.context = context;
        // Get config
        const logToFile = context.config.logToFile;
        if (logToFile) {
            this.logFile = path.join(context.dataDir, 'events.log');
            context.logger.info('Logs will be written to: ' + this.logFile);
        }
        context.logger.info('Example Logger Plugin initialized');
    }
    async activate() {
        if (!this.context) {
            throw new Error('Plugin not initialized');
        }
        // Subscribe to all session events
        this.context.events.on(SessionEvent.BEFORE_CREATE, async (data) => {
            await this.logEvent('Session creation started', data);
        });
        this.context.events.on(SessionEvent.CREATED, async (data) => {
            await this.logEvent('Session created', {
                sessionId: data.session.sessionId,
                playerId: data.session.playerId,
                durationMs: data.durationMs,
            });
        });
        this.context.events.on(SessionEvent.LOADED, async (data) => {
            await this.logEvent('Session loaded', {
                sessionId: data.session.sessionId,
                fromCache: data.fromCache,
            });
        });
        this.context.events.on(SessionEvent.OBJECTIVE_UPDATED, async (data) => {
            await this.logEvent('Objective updated', {
                sessionId: data.sessionId,
                objectiveId: data.objectiveId,
            });
        });
        this.context.events.on(SessionEvent.COMPLETED, async (data) => {
            await this.logEvent('Session completed', {
                sessionId: data.session.sessionId,
                totalDurationMs: data.totalDurationMs,
                objectivesCompleted: data.session.state.objectivesCompleted.length,
            });
        });
        this.context.events.on(SessionEvent.BEFORE_ENCOUNTER_GENERATE, async (data) => {
            await this.logEvent('Encounter generation started', {
                playerId: data.playerId,
                difficulty: data.difficulty,
            });
        });
        this.context.events.on(SessionEvent.ENCOUNTER_GENERATED, async (data) => {
            await this.logEvent('Encounter generated', {
                playerId: data.playerId,
                generationTimeMs: data.generationTimeMs,
                objectiveCount: data.encounter.objectives.length,
            });
        });
        this.context.logger.info('Example Logger Plugin activated - listening to all events');
    }
    async deactivate() {
        if (this.context) {
            // Note: In a real plugin, you'd want to store event handlers and unsubscribe them here
            this.context.logger.info('Example Logger Plugin deactivated');
        }
    }
    async shutdown() {
        if (this.context) {
            this.context.logger.info('Example Logger Plugin shutdown');
        }
    }
    async healthCheck() {
        return true;
    }
    /**
     * Log an event to console and optionally to file
     */
    async logEvent(eventName, data) {
        if (!this.context)
            return;
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            event: eventName,
            data,
        };
        // Log to console via plugin logger
        this.context.logger.info(`[Event] ${eventName}`, data);
        // Log to file if enabled
        if (this.logFile) {
            try {
                const logLine = JSON.stringify(logEntry) + '\n';
                await fs.appendFile(this.logFile, logLine, 'utf-8');
            }
            catch (error) {
                this.context.logger.error('Failed to write to log file', error);
            }
        }
    }
}
