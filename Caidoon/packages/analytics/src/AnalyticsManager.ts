import { Session } from '@ai-encounters/core';
import { AnalyticsStorage } from './AnalyticsStorage.js';
import {
  EncounterAnalytics,
  PlayerAnalytics,
  GlobalAnalytics,
  PlayerFeedback,
  AnalyticsEvent,
} from './types.js';

/**
 * Manages analytics collection and aggregation
 */
export class AnalyticsManager {
  private storage: AnalyticsStorage;

  constructor(storage: AnalyticsStorage) {
    this.storage = storage;
  }

  /**
   * Record a session start event
   */
  async recordSessionStart(session: Session): Promise<void> {
    // Update player analytics
    await this.updatePlayerAnalytics(session, false);
  }

  /**
   * Record a session completion event
   */
  async recordSessionComplete(session: Session): Promise<void> {
    if (!session.completedAt) {
      throw new Error('Session must have completedAt timestamp');
    }

    // Update encounter analytics
    await this.updateEncounterAnalytics(session);

    // Update player analytics
    await this.updatePlayerAnalytics(session, true);

    // Update global analytics
    await this.updateGlobalAnalytics();
  }

  /**
   * Record player feedback
   */
  async recordFeedback(feedback: PlayerFeedback): Promise<void> {
    // Validate rating
    if (feedback.rating < 1 || feedback.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Store feedback
    await this.storage.writeFeedback(feedback);

    // Update encounter analytics with new feedback
    const encounterId = await this.getEncounterIdFromSession(feedback.sessionId);
    if (encounterId) {
      const analytics = await this.storage.readEncounterAnalytics(encounterId);
      if (analytics) {
        analytics.playerFeedback.push(feedback);
        analytics.lastUpdated = new Date().toISOString();
        await this.storage.writeEncounterAnalytics(analytics);
      }
    }
  }

  /**
   * Get analytics for a specific encounter
   */
  async getEncounterAnalytics(encounterId: string): Promise<EncounterAnalytics | null> {
    return await this.storage.readEncounterAnalytics(encounterId);
  }

  /**
   * Get analytics for a specific player
   */
  async getPlayerAnalytics(playerId: string): Promise<PlayerAnalytics | null> {
    return await this.storage.readPlayerAnalytics(playerId);
  }

  /**
   * Get global platform analytics
   */
  async getGlobalAnalytics(): Promise<GlobalAnalytics> {
    let analytics = await this.storage.readGlobalAnalytics();
    
    if (!analytics) {
      // Initialize global analytics if it doesn't exist
      analytics = await this.calculateGlobalAnalytics();
      await this.storage.writeGlobalAnalytics(analytics);
    }

    return analytics;
  }

  /**
   * Update encounter analytics based on completed session
   */
  private async updateEncounterAnalytics(session: Session): Promise<void> {
    const encounterId = session.encounter.id;
    let analytics = await this.storage.readEncounterAnalytics(encounterId);

    if (!analytics) {
      // Initialize new analytics
      analytics = {
        encounterId,
        totalPlays: 0,
        completions: 0,
        averageCompletionTime: 0,
        successRate: 0,
        objectiveStats: {},
        commonFailurePoints: [],
        playerFeedback: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    // Calculate session duration
    const duration = this.calculateSessionDuration(session);
    const completed = !!session.completedAt;

    // Update totals
    analytics.totalPlays += 1;
    if (completed) {
      analytics.completions += 1;
    }

    // Update success rate
    analytics.successRate = analytics.completions / analytics.totalPlays;

    // Update average completion time (only for completed sessions)
    if (completed && duration > 0) {
      const totalCompletionTime = analytics.averageCompletionTime * (analytics.completions - 1);
      analytics.averageCompletionTime = (totalCompletionTime + duration) / analytics.completions;
    }

    // Update objective stats
    for (const objective of session.encounter.objectives) {
      const objectiveId = objective.id;
      const wasCompleted = session.state.objectivesCompleted.includes(objectiveId);

      if (!analytics.objectiveStats[objectiveId]) {
        analytics.objectiveStats[objectiveId] = {
          completionRate: 0,
          averageTime: 0,
        };
      }

      const objStats = analytics.objectiveStats[objectiveId];
      const previousCompletions = objStats.completionRate * (analytics.totalPlays - 1);
      const newCompletions = previousCompletions + (wasCompleted ? 1 : 0);
      objStats.completionRate = newCompletions / analytics.totalPlays;

      // Track failure points
      if (!wasCompleted && !analytics.commonFailurePoints.includes(objectiveId)) {
        analytics.commonFailurePoints.push(objectiveId);
      }
    }

    analytics.lastUpdated = new Date().toISOString();
    await this.storage.writeEncounterAnalytics(analytics);
  }

  /**
   * Update player analytics based on session
   */
  private async updatePlayerAnalytics(session: Session, completed: boolean): Promise<void> {
    const playerId = session.playerId;
    let analytics = await this.storage.readPlayerAnalytics(playerId);

    if (!analytics) {
      // Initialize new analytics
      analytics = {
        playerId,
        totalSessions: 0,
        completedSessions: 0,
        totalPlayTime: 0,
        successRate: 0,
        averageSessionDuration: 0,
        encounterHistory: [],
        lastPlayed: new Date().toISOString(),
      };
    }

    // Update totals
    analytics.totalSessions += 1;
    if (completed) {
      analytics.completedSessions += 1;
    }

    // Calculate duration
    const duration = this.calculateSessionDuration(session);
    analytics.totalPlayTime += duration;

    // Update success rate
    analytics.successRate = analytics.completedSessions / analytics.totalSessions;

    // Update average session duration
    analytics.averageSessionDuration = analytics.totalPlayTime / analytics.totalSessions;

    // Add to history
    analytics.encounterHistory.push({
      encounterId: session.encounter.id,
      sessionId: session.sessionId,
      completed,
      duration,
      timestamp: session.startedAt,
    });

    // Keep only last 100 encounters in history
    if (analytics.encounterHistory.length > 100) {
      analytics.encounterHistory = analytics.encounterHistory.slice(-100);
    }

    analytics.lastPlayed = new Date().toISOString();
    await this.storage.writePlayerAnalytics(analytics);
  }

  /**
   * Update global analytics
   */
  private async updateGlobalAnalytics(): Promise<void> {
    const analytics = await this.calculateGlobalAnalytics();
    await this.storage.writeGlobalAnalytics(analytics);
  }

  /**
   * Calculate global analytics from all data
   */
  private async calculateGlobalAnalytics(): Promise<GlobalAnalytics> {
    const allEncounters = await this.storage.getAllEncounterAnalytics();
    const allPlayers = await this.storage.getAllPlayerAnalytics();

    let totalSessions = 0;
    let totalDuration = 0;
    let totalCompletions = 0;

    // Aggregate encounter data
    for (const encounter of allEncounters) {
      totalSessions += encounter.totalPlays;
      totalCompletions += encounter.completions;
      totalDuration += encounter.averageCompletionTime * encounter.completions;
    }

    // Calculate popular encounters
    const popularEncounters = allEncounters
      .map((e) => ({
        encounterId: e.encounterId,
        plays: e.totalPlays,
        rating: this.calculateAverageRating(e.playerFeedback),
      }))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 10);

    // Calculate active players
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const last7d = now - 7 * 24 * 60 * 60 * 1000;

    const activePlayersLast24h = allPlayers.filter(
      (p) => new Date(p.lastPlayed).getTime() > last24h
    ).length;

    const activePlayersLast7d = allPlayers.filter(
      (p) => new Date(p.lastPlayed).getTime() > last7d
    ).length;

    return {
      totalSessions,
      totalPlayers: allPlayers.length,
      totalEncounters: allEncounters.length,
      averageSessionDuration: totalSessions > 0 ? totalDuration / totalCompletions : 0,
      globalSuccessRate: totalSessions > 0 ? totalCompletions / totalSessions : 0,
      popularEncounters,
      activePlayersLast24h,
      activePlayersLast7d,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate session duration in seconds
   */
  private calculateSessionDuration(session: Session): number {
    if (!session.completedAt) {
      return 0;
    }

    const start = new Date(session.startedAt).getTime();
    const end = new Date(session.completedAt).getTime();
    return Math.floor((end - start) / 1000);
  }

  /**
   * Calculate average rating from feedback
   */
  private calculateAverageRating(feedback: PlayerFeedback[]): number {
    if (feedback.length === 0) {
      return 0;
    }

    const sum = feedback.reduce((acc, f) => acc + f.rating, 0);
    return sum / feedback.length;
  }

  /**
   * Get encounter ID from session ID (helper method)
   */
  private async getEncounterIdFromSession(sessionId: string): Promise<string | null> {
    // This would need access to session storage
    // For now, we'll return null and handle this in the route layer
    return null;
  }
}
