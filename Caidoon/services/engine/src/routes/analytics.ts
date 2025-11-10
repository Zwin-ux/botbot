import { Router, Request, Response } from 'express';
import { AnalyticsManager, AnalyticsExporter, PlayerFeedback } from '@ai-encounters/analytics';
import { logger } from '../server.js';

export function createAnalyticsRoutes(analyticsManager: AnalyticsManager): Router {
  const router = Router();
  const exporter = new AnalyticsExporter();

  /**
   * GET /analytics/encounter/:id
   * Get analytics for a specific encounter
   */
  router.get('/encounter/:id', async (req: Request, res: Response) => {
    try {
      const encounterId = req.params.id;
      const analytics = await analyticsManager.getEncounterAnalytics(encounterId);

      if (!analytics) {
        return res.status(404).json({
          error: 'Encounter analytics not found',
          encounterId,
        });
      }

      logger.info({ requestId: req.id, encounterId }, 'Retrieved encounter analytics');
      res.json(analytics);
    } catch (error) {
      logger.error(
        {
          requestId: req.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to retrieve encounter analytics'
      );
      res.status(500).json({
        error: 'Failed to retrieve encounter analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /analytics/player/:playerId
   * Get analytics for a specific player
   */
  router.get('/player/:playerId', async (req: Request, res: Response) => {
    try {
      const playerId = req.params.playerId;
      const analytics = await analyticsManager.getPlayerAnalytics(playerId);

      if (!analytics) {
        return res.status(404).json({
          error: 'Player analytics not found',
          playerId,
        });
      }

      logger.info({ requestId: req.id, playerId }, 'Retrieved player analytics');
      res.json(analytics);
    } catch (error) {
      logger.error(
        {
          requestId: req.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to retrieve player analytics'
      );
      res.status(500).json({
        error: 'Failed to retrieve player analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /analytics/global
   * Get global platform analytics
   */
  router.get('/global', async (req: Request, res: Response) => {
    try {
      const analytics = await analyticsManager.getGlobalAnalytics();

      logger.info({ requestId: req.id }, 'Retrieved global analytics');
      res.json(analytics);
    } catch (error) {
      logger.error(
        {
          requestId: req.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to retrieve global analytics'
      );
      res.status(500).json({
        error: 'Failed to retrieve global analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /analytics/feedback
   * Submit player feedback for a session
   */
  router.post('/feedback', async (req: Request, res: Response) => {
    try {
      const { sessionId, playerId, rating, comment } = req.body;

      // Validate required fields
      if (!sessionId || !playerId || !rating) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['sessionId', 'playerId', 'rating'],
        });
      }

      // Validate rating range
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({
          error: 'Invalid rating',
          message: 'Rating must be a number between 1 and 5',
        });
      }

      const feedback: PlayerFeedback = {
        sessionId,
        playerId,
        rating,
        comment,
        timestamp: new Date().toISOString(),
      };

      await analyticsManager.recordFeedback(feedback);

      logger.info(
        {
          requestId: req.id,
          sessionId,
          playerId,
          rating,
        },
        'Recorded player feedback'
      );

      res.status(201).json({
        message: 'Feedback recorded successfully',
        feedback,
      });
    } catch (error) {
      logger.error(
        {
          requestId: req.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to record feedback'
      );
      res.status(500).json({
        error: 'Failed to record feedback',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /analytics/export
   * Export analytics data in CSV or JSON format
   */
  router.get('/export', async (req: Request, res: Response) => {
    try {
      const format = (req.query.format as string) || 'json';
      const type = (req.query.type as string) || 'encounters';

      if (format !== 'json' && format !== 'csv') {
        return res.status(400).json({
          error: 'Invalid format',
          message: 'Format must be either "json" or "csv"',
        });
      }

      if (type === 'encounters') {
        // Get all encounter analytics from storage
        const allEncounters = await (analyticsManager as any).storage.getAllEncounterAnalytics();

        const exportData = exporter.exportEncounterAnalytics(allEncounters, format as any);
        
        const contentType = format === 'json' ? 'application/json' : 'text/csv';
        const filename = `encounter-analytics-${Date.now()}.${format}`;
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(exportData);
      } else if (type === 'players') {
        // Get all player analytics from storage
        const allPlayers = await (analyticsManager as any).storage.getAllPlayerAnalytics();

        const exportData = exporter.exportPlayerAnalytics(allPlayers, format as any);
        
        const contentType = format === 'json' ? 'application/json' : 'text/csv';
        const filename = `player-analytics-${Date.now()}.${format}`;
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(exportData);
      } else {
        return res.status(400).json({
          error: 'Invalid type',
          message: 'Type must be either "encounters" or "players"',
        });
      }

      logger.info(
        {
          requestId: req.id,
          format,
          type,
        },
        'Exported analytics data'
      );
    } catch (error) {
      logger.error(
        {
          requestId: req.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to export analytics'
      );
      res.status(500).json({
        error: 'Failed to export analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
