import fs from 'fs/promises';
import path from 'path';
import { EncounterAnalytics, PlayerAnalytics, GlobalAnalytics, PlayerFeedback } from './types.js';

/**
 * File-based storage for analytics data
 * Follows the same pattern as FileStorage in the engine
 */
export class AnalyticsStorage {
  private readonly dataDir: string;
  private cache: Map<string, any> = new Map();

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(path.join(this.dataDir, 'analytics', 'encounters'), { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'analytics', 'players'), { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'analytics', 'feedback'), { recursive: true });
      console.log(`Analytics storage initialized at ${this.dataDir}/analytics`);
    } catch (error) {
      console.error('Failed to initialize analytics storage:', error);
      throw error;
    }
  }

  // Encounter Analytics
  async writeEncounterAnalytics(analytics: EncounterAnalytics): Promise<void> {
    const filePath = path.join(this.dataDir, 'analytics', 'encounters', `${analytics.encounterId}.json`);
    await fs.writeFile(filePath, JSON.stringify(analytics, null, 2), 'utf-8');
    this.cache.set(`encounter:${analytics.encounterId}`, analytics);
  }

  async readEncounterAnalytics(encounterId: string): Promise<EncounterAnalytics | null> {
    // Check cache first
    const cached = this.cache.get(`encounter:${encounterId}`);
    if (cached) {
      return cached;
    }

    const filePath = path.join(this.dataDir, 'analytics', 'encounters', `${encounterId}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const analytics = JSON.parse(data) as EncounterAnalytics;
      this.cache.set(`encounter:${encounterId}`, analytics);
      return analytics;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async getAllEncounterAnalytics(): Promise<EncounterAnalytics[]> {
    const encountersDir = path.join(this.dataDir, 'analytics', 'encounters');
    try {
      const files = await fs.readdir(encountersDir);
      const analytics: EncounterAnalytics[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const encounterId = file.replace('.json', '');
        const data = await this.readEncounterAnalytics(encounterId);
        if (data) {
          analytics.push(data);
        }
      }

      return analytics;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  // Player Analytics
  async writePlayerAnalytics(analytics: PlayerAnalytics): Promise<void> {
    const filePath = path.join(this.dataDir, 'analytics', 'players', `${analytics.playerId}.json`);
    await fs.writeFile(filePath, JSON.stringify(analytics, null, 2), 'utf-8');
    this.cache.set(`player:${analytics.playerId}`, analytics);
  }

  async readPlayerAnalytics(playerId: string): Promise<PlayerAnalytics | null> {
    // Check cache first
    const cached = this.cache.get(`player:${playerId}`);
    if (cached) {
      return cached;
    }

    const filePath = path.join(this.dataDir, 'analytics', 'players', `${playerId}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const analytics = JSON.parse(data) as PlayerAnalytics;
      this.cache.set(`player:${playerId}`, analytics);
      return analytics;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async getAllPlayerAnalytics(): Promise<PlayerAnalytics[]> {
    const playersDir = path.join(this.dataDir, 'analytics', 'players');
    try {
      const files = await fs.readdir(playersDir);
      const analytics: PlayerAnalytics[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const playerId = file.replace('.json', '');
        const data = await this.readPlayerAnalytics(playerId);
        if (data) {
          analytics.push(data);
        }
      }

      return analytics;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  // Global Analytics
  async writeGlobalAnalytics(analytics: GlobalAnalytics): Promise<void> {
    const filePath = path.join(this.dataDir, 'analytics', 'global.json');
    await fs.writeFile(filePath, JSON.stringify(analytics, null, 2), 'utf-8');
    this.cache.set('global', analytics);
  }

  async readGlobalAnalytics(): Promise<GlobalAnalytics | null> {
    // Check cache first
    const cached = this.cache.get('global');
    if (cached) {
      return cached;
    }

    const filePath = path.join(this.dataDir, 'analytics', 'global.json');
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const analytics = JSON.parse(data) as GlobalAnalytics;
      this.cache.set('global', analytics);
      return analytics;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  // Feedback
  async writeFeedback(feedback: PlayerFeedback): Promise<void> {
    const filePath = path.join(this.dataDir, 'analytics', 'feedback', `${feedback.sessionId}.json`);
    await fs.writeFile(filePath, JSON.stringify(feedback, null, 2), 'utf-8');
  }

  async readFeedback(sessionId: string): Promise<PlayerFeedback | null> {
    const filePath = path.join(this.dataDir, 'analytics', 'feedback', `${sessionId}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as PlayerFeedback;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async getAllFeedback(): Promise<PlayerFeedback[]> {
    const feedbackDir = path.join(this.dataDir, 'analytics', 'feedback');
    try {
      const files = await fs.readdir(feedbackDir);
      const feedback: PlayerFeedback[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const sessionId = file.replace('.json', '');
        const data = await this.readFeedback(sessionId);
        if (data) {
          feedback.push(data);
        }
      }

      return feedback;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await fs.access(this.dataDir);
      const testPath = path.join(this.dataDir, 'analytics', '.health-check');
      await fs.writeFile(testPath, 'ok', 'utf-8');
      await fs.unlink(testPath);
      return true;
    } catch (error) {
      console.error('AnalyticsStorage health check failed:', error);
      return false;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
