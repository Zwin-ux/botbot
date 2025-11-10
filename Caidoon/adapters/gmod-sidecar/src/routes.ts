import { Express, Request, Response } from 'express';
import { EncountersClient } from '@ai-encounters/sdk';
import { Config } from './config.js';
import {
  GModStartSessionRequest,
  gmodToEngineStartRequest,
  engineToGModSession,
} from './translators.js';

export function setupRoutes(app: Express, config: Config): void {
  // Initialize Encounters Client
  const client = new EncountersClient(config.engineUrl);

  /**
   * POST /gmod/session/start
   * Start a new encounter session for a GMod player
   */
  app.post('/gmod/session/start', async (req: Request, res: Response) => {
    try {
      const gmodRequest = req.body as GModStartSessionRequest;

      // Validate request
      if (!gmodRequest.steamId) {
        return res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'steamId is required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Translate GMod request to engine format
      const { playerId, context } = gmodToEngineStartRequest(gmodRequest);

      // Call engine to start session
      const session = await client.startSession(playerId, context);

      // Translate engine response to GMod format
      const gmodSession = engineToGModSession(session);

      res.json(gmodSession);
    } catch (error: any) {
      console.error('Error starting GMod session:', error);
      
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        error: {
          code: 'SESSION_START_FAILED',
          message: error.message || 'Failed to start session',
          details: error.details,
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /gmod/session/:id
   * Get session details for a GMod player
   */
  app.get('/gmod/session/:id', async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.id;

      if (!sessionId) {
        return res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'sessionId is required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get session from engine
      const session = await client.getSession(sessionId);

      // Translate engine response to GMod format
      const gmodSession = engineToGModSession(session);

      res.json(gmodSession);
    } catch (error: any) {
      console.error('Error getting GMod session:', error);
      
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        error: {
          code: 'SESSION_GET_FAILED',
          message: error.message || 'Failed to get session',
          details: error.details,
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * POST /gmod/session/:id/objective/:objectiveId
   * Update objective status for a GMod session
   */
  app.post(
    '/gmod/session/:id/objective/:objectiveId',
    async (req: Request, res: Response) => {
      try {
        const { id: sessionId, objectiveId } = req.params;

        if (!sessionId || !objectiveId) {
          return res.status(400).json({
            error: {
              code: 'INVALID_REQUEST',
              message: 'sessionId and objectiveId are required',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Update objective in engine
        const session = await client.updateObjective(sessionId, objectiveId);

        // Translate engine response to GMod format
        const gmodSession = engineToGModSession(session);

        res.json(gmodSession);
      } catch (error: any) {
        console.error('Error updating GMod objective:', error);
        
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
          error: {
            code: 'OBJECTIVE_UPDATE_FAILED',
            message: error.message || 'Failed to update objective',
            details: error.details,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
}
