import {
  PlayerPerformance,
  EncounterResult,
  DifficultyAdjustment,
  DifficultyConfig,
} from './types.js';

/**
 * Default configuration for difficulty calculation
 */
const DEFAULT_CONFIG: DifficultyConfig = {
  minDifficulty: 0.1,
  maxDifficulty: 1.0,
  historyWindow: 5,
  strugglingThreshold: 0.3,
  excellingThreshold: 0.8,
  strugglingAdjustment: -0.15,
  excellingAdjustment: 0.15,
  speedAdjustment: 0.1,
};

/**
 * Manages dynamic difficulty adjustment based on player performance
 */
export class DifficultyManager {
  private playerHistory: Map<string, PlayerPerformance>;
  private config: DifficultyConfig;

  constructor(config: Partial<DifficultyConfig> = {}) {
    this.playerHistory = new Map();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate adjusted difficulty for a player
   */
  calculateDifficulty(playerId: string, baseDifficulty: number = 0.5): DifficultyAdjustment {
    const performance = this.getPlayerPerformance(playerId);
    
    // If no history, use base difficulty
    if (performance.results.length === 0) {
      return {
        previousDifficulty: baseDifficulty,
        newDifficulty: baseDifficulty,
        adjustment: 0,
        reason: 'No performance history available',
        metrics: {
          successRate: 0,
          avgCompletionTime: 0,
          recentPerformance: 'balanced',
        },
      };
    }

    const recentResults = this.getRecentResults(performance);
    const successRate = this.calculateSuccessRate(recentResults);
    const avgCompletionTime = this.calculateAverageCompletionTime(recentResults);
    const expectedTime = this.calculateExpectedTime(recentResults);

    let adjustment = 0;
    const reasons: string[] = [];

    // Adjust based on success rate
    if (successRate < this.config.strugglingThreshold) {
      adjustment += this.config.strugglingAdjustment;
      reasons.push(`low success rate (${(successRate * 100).toFixed(0)}%)`);
    } else if (successRate > this.config.excellingThreshold) {
      adjustment += this.config.excellingAdjustment;
      reasons.push(`high success rate (${(successRate * 100).toFixed(0)}%)`);
    }

    // Adjust based on completion speed
    if (expectedTime > 0 && avgCompletionTime < expectedTime * 0.7) {
      adjustment += this.config.speedAdjustment;
      reasons.push('completing encounters quickly');
    }

    // Apply bounds
    const previousDifficulty = performance.currentDifficulty;
    const newDifficulty = this.applyBounds(previousDifficulty + adjustment);

    // Determine performance category
    let recentPerformance: 'struggling' | 'balanced' | 'excelling';
    if (successRate < this.config.strugglingThreshold) {
      recentPerformance = 'struggling';
    } else if (successRate > this.config.excellingThreshold) {
      recentPerformance = 'excelling';
    } else {
      recentPerformance = 'balanced';
    }

    return {
      previousDifficulty,
      newDifficulty,
      adjustment: newDifficulty - previousDifficulty,
      reason: reasons.length > 0 
        ? `Adjusted due to ${reasons.join(' and ')}` 
        : 'Performance is balanced',
      metrics: {
        successRate,
        avgCompletionTime,
        recentPerformance,
      },
    };
  }

  /**
   * Record a completed encounter for a player
   */
  recordPerformance(playerId: string, result: EncounterResult): void {
    const performance = this.getPlayerPerformance(playerId);
    performance.results.push(result);
    
    // Update current difficulty based on the adjustment
    const adjustment = this.calculateDifficulty(playerId, performance.currentDifficulty);
    performance.currentDifficulty = adjustment.newDifficulty;
    performance.lastAdjustment = new Date();
    
    this.playerHistory.set(playerId, performance);
  }

  /**
   * Get player performance history
   */
  getPlayerPerformance(playerId: string): PlayerPerformance {
    if (!this.playerHistory.has(playerId)) {
      this.playerHistory.set(playerId, {
        playerId,
        results: [],
        currentDifficulty: 0.5, // Start at medium difficulty
      });
    }
    
    return this.playerHistory.get(playerId)!;
  }

  /**
   * Get recent results within the history window
   */
  private getRecentResults(performance: PlayerPerformance): EncounterResult[] {
    return performance.results.slice(-this.config.historyWindow);
  }

  /**
   * Calculate success rate from results
   */
  private calculateSuccessRate(results: EncounterResult[]): number {
    if (results.length === 0) return 0;
    
    const successCount = results.filter(r => r.success).length;
    return successCount / results.length;
  }

  /**
   * Calculate average completion time
   */
  private calculateAverageCompletionTime(results: EncounterResult[]): number {
    if (results.length === 0) return 0;
    
    const totalTime = results.reduce((sum, r) => sum + r.completionTime, 0);
    return totalTime / results.length;
  }

  /**
   * Calculate expected completion time based on difficulty
   */
  private calculateExpectedTime(results: EncounterResult[]): number {
    if (results.length === 0) return 0;
    
    // Use the average of base difficulties to estimate expected time
    const avgDifficulty = results.reduce((sum, r) => sum + r.baseDifficulty, 0) / results.length;
    
    // Assume base time of 10 minutes, scaled by difficulty
    const baseTime = 600; // 10 minutes in seconds
    return baseTime * (0.5 + avgDifficulty * 0.5);
  }

  /**
   * Apply difficulty bounds
   */
  private applyBounds(difficulty: number): number {
    return Math.max(
      this.config.minDifficulty,
      Math.min(this.config.maxDifficulty, difficulty)
    );
  }

  /**
   * Clear performance history for a player
   */
  clearHistory(playerId: string): void {
    this.playerHistory.delete(playerId);
  }

  /**
   * Export player performance data
   */
  exportPerformance(playerId: string): PlayerPerformance | null {
    return this.playerHistory.get(playerId) || null;
  }

  /**
   * Import player performance data
   */
  importPerformance(performance: PlayerPerformance): void {
    this.playerHistory.set(performance.playerId, performance);
  }
}
