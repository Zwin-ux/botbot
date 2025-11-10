import { Session } from '@ai-encounters/core';

/**
 * Analytics data for a specific encounter
 */
export interface EncounterAnalytics {
  encounterId: string;
  totalPlays: number;
  completions: number;
  averageCompletionTime: number; // in seconds
  successRate: number; // 0 to 1
  objectiveStats: {
    [objectiveId: string]: {
      completionRate: number;
      averageTime: number;
    };
  };
  choiceDistribution?: {
    [choiceId: string]: number; // Count of times chosen
  };
  commonFailurePoints: string[];
  playerFeedback: PlayerFeedback[];
  lastUpdated: string;
}

/**
 * Analytics data for a specific player
 */
export interface PlayerAnalytics {
  playerId: string;
  totalSessions: number;
  completedSessions: number;
  totalPlayTime: number; // in seconds
  successRate: number; // 0 to 1
  averageSessionDuration: number; // in seconds
  encounterHistory: {
    encounterId: string;
    sessionId: string;
    completed: boolean;
    duration: number;
    timestamp: string;
  }[];
  lastPlayed: string;
}

/**
 * Global platform analytics
 */
export interface GlobalAnalytics {
  totalSessions: number;
  totalPlayers: number;
  totalEncounters: number;
  averageSessionDuration: number;
  globalSuccessRate: number;
  popularEncounters: {
    encounterId: string;
    plays: number;
    rating: number;
  }[];
  activePlayersLast24h: number;
  activePlayersLast7d: number;
  timestamp: string;
}

/**
 * Player feedback for an encounter
 */
export interface PlayerFeedback {
  playerId: string;
  sessionId: string;
  rating: number; // 1 to 5
  comment?: string;
  timestamp: string;
}

/**
 * Analytics event for tracking
 */
export interface AnalyticsEvent {
  type: 'session.started' | 'session.completed' | 'objective.completed' | 'feedback.submitted';
  sessionId: string;
  playerId: string;
  encounterId: string;
  timestamp: string;
  data: any;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'csv';

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  startDate?: string;
  endDate?: string;
  encounterId?: string;
  playerId?: string;
}
