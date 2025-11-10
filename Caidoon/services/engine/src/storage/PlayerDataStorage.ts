import { PlayerPerformance } from '@ai-encounters/difficulty-engine';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { logger } from '../server.js';

/**
 * Storage for player performance data used by difficulty system
 */
export class PlayerDataStorage {
  private readonly dataDir: string;
  private cache: Map<string, PlayerPerformance> = new Map();

  constructor(dataDir?: string) {
    this.dataDir = dataDir || config.dataDir;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(path.join(this.dataDir, 'players'), { recursive: true });
      logger.info({ dataDir: this.dataDir }, 'Player data directory initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize player data directory');
      throw error;
    }
  }

  async savePlayerPerformance(performance: PlayerPerformance): Promise<void> {
    // Update cache
    this.cache.set(performance.playerId, performance);

    // Write to file
    const filePath = this.getPlayerFilePath(performance.playerId);
    try {
      await fs.writeFile(filePath, JSON.stringify(performance, null, 2), 'utf-8');
      logger.debug({ playerId: performance.playerId }, 'Player performance saved');
    } catch (error) {
      logger.error({ playerId: performance.playerId, error }, 'Failed to save player performance');
      throw error;
    }
  }

  async loadPlayerPerformance(playerId: string): Promise<PlayerPerformance | null> {
    // Check cache first
    const cached = this.cache.get(playerId);
    if (cached) {
      return cached;
    }

    // Try to read from file
    const filePath = this.getPlayerFilePath(playerId);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const performance = JSON.parse(data) as PlayerPerformance;
      
      // Add to cache
      this.cache.set(playerId, performance);
      
      return performance;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // Player data doesn't exist yet
      }
      logger.error({ playerId, error }, 'Failed to load player performance');
      throw error;
    }
  }

  private getPlayerFilePath(playerId: string): string {
    return path.join(this.dataDir, 'players', `${playerId}.json`);
  }

  async shutdown(): Promise<void> {
    this.cache.clear();
    logger.info('PlayerDataStorage shutdown complete');
  }
}
