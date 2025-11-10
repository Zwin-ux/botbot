import { EncounterAnalytics, PlayerAnalytics, ExportFormat } from './types.js';

/**
 * Export analytics data to different formats
 */
export class AnalyticsExporter {
  /**
   * Export encounter analytics to specified format
   */
  exportEncounterAnalytics(analytics: EncounterAnalytics[], format: ExportFormat): string {
    if (format === 'json') {
      return JSON.stringify(analytics, null, 2);
    } else if (format === 'csv') {
      return this.encounterAnalyticsToCSV(analytics);
    }
    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Export player analytics to specified format
   */
  exportPlayerAnalytics(analytics: PlayerAnalytics[], format: ExportFormat): string {
    if (format === 'json') {
      return JSON.stringify(analytics, null, 2);
    } else if (format === 'csv') {
      return this.playerAnalyticsToCSV(analytics);
    }
    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Convert encounter analytics to CSV format
   */
  private encounterAnalyticsToCSV(analytics: EncounterAnalytics[]): string {
    const headers = [
      'Encounter ID',
      'Total Plays',
      'Completions',
      'Success Rate',
      'Avg Completion Time (s)',
      'Feedback Count',
      'Avg Rating',
      'Last Updated',
    ];

    const rows = analytics.map((a) => {
      const avgRating = a.playerFeedback.length > 0
        ? (a.playerFeedback.reduce((sum, f) => sum + f.rating, 0) / a.playerFeedback.length).toFixed(2)
        : 'N/A';

      return [
        a.encounterId,
        a.totalPlays.toString(),
        a.completions.toString(),
        (a.successRate * 100).toFixed(2) + '%',
        a.averageCompletionTime.toFixed(2),
        a.playerFeedback.length.toString(),
        avgRating,
        a.lastUpdated,
      ];
    });

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Convert player analytics to CSV format
   */
  private playerAnalyticsToCSV(analytics: PlayerAnalytics[]): string {
    const headers = [
      'Player ID',
      'Total Sessions',
      'Completed Sessions',
      'Success Rate',
      'Total Play Time (s)',
      'Avg Session Duration (s)',
      'Last Played',
    ];

    const rows = analytics.map((a) => [
      a.playerId,
      a.totalSessions.toString(),
      a.completedSessions.toString(),
      (a.successRate * 100).toFixed(2) + '%',
      a.totalPlayTime.toString(),
      a.averageSessionDuration.toFixed(2),
      a.lastPlayed,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
