import { Router, Request, Response } from 'express';
import { SessionManager } from '../services/index.js';
import { validateSessionStartRequest, validatePlayerContext } from '@ai-encounters/validators';
import { PlayerContext } from '@ai-encounters/core';
import { logger } from '../server.js';

export function createSessionRoutes(sessionManager: SessionManager): Router {
  const router = Router();

  // POST /session/start - Start a new encounter session
  router.post('/start', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validation = validateSessionStartRequest(req.body);
      
      if (!validation.valid) {
        logger.warn({
          requestId: req.id,
          errors: validation.errors,
        }, 'Session start validation failed');
        
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: { errors: validation.errors },
            requestId: req.id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { playerId } = validation.data;
      
      // Validate player context if provided
      let playerContext: PlayerContext | undefined;
      if (req.body.playerContext) {
        const contextValidation = validatePlayerContext(req.body.playerContext);
        if (!contextValidation.valid) {
          logger.warn({
            requestId: req.id,
            errors: contextValidation.errors,
          }, 'Player context validation failed');
          
          return res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid player context',
              details: { errors: contextValidation.errors },
              requestId: req.id,
            },
            timestamp: new Date().toISOString(),
          });
        }
        playerContext = contextValidation.data;
      }

      logger.info({
        requestId: req.id,
        playerId,
      }, 'Creating new session');

      // Create session
      const session = await sessionManager.createSession(playerId, playerContext);

      logger.info({
        requestId: req.id,
        sessionId: session.sessionId,
        playerId,
      }, 'Session created successfully');

      return res.status(201).json(session);
    } catch (error) {
      logger.error({
        requestId: req.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Error starting session');
      
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to start session',
          requestId: req.id,
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /session/:id - Get session details
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      logger.debug({
        requestId: req.id,
        sessionId: id,
      }, 'Fetching session');

      const session = await sessionManager.getSession(id);

      if (!session) {
        logger.warn({
          requestId: req.id,
          sessionId: id,
        }, 'Session not found');
        
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Session not found: ${id}`,
            requestId: req.id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      return res.json(session);
    } catch (error) {
      logger.error({
        requestId: req.id,
        sessionId: req.params.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Error getting session');
      
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get session',
          requestId: req.id,
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // PATCH /session/:id/objective/:objectiveId - Update objective status
  router.patch('/:id/objective/:objectiveId', async (req: Request, res: Response) => {
    try {
      const { id, objectiveId } = req.params;

      logger.info({
        requestId: req.id,
        sessionId: id,
        objectiveId,
      }, 'Updating objective');

      const session = await sessionManager.updateObjective(id, objectiveId);

      logger.info({
        requestId: req.id,
        sessionId: id,
        objectiveId,
      }, 'Objective updated successfully');

      return res.json(session);
    } catch (error) {
      logger.error({
        requestId: req.id,
        sessionId: req.params.id,
        objectiveId: req.params.objectiveId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Error updating objective');
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: error.message,
              requestId: req.id,
            },
            timestamp: new Date().toISOString(),
          });
        }
        
        if (error.message.includes('already completed')) {
          return res.status(400).json({
            error: {
              code: 'INVALID_STATE',
              message: error.message,
              requestId: req.id,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update objective',
          requestId: req.id,
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /session/:id/complete - Complete a session
  router.post('/:id/complete', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      logger.info({
        requestId: req.id,
        sessionId: id,
      }, 'Completing session');

      const session = await sessionManager.completeSession(id);

      logger.info({
        requestId: req.id,
        sessionId: id,
      }, 'Session completed successfully');

      return res.json(session);
    } catch (error) {
      logger.error({
        requestId: req.id,
        sessionId: req.params.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Error completing session');
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: error.message,
              requestId: req.id,
            },
            timestamp: new Date().toISOString(),
          });
        }
        
        if (error.message.includes('already completed')) {
          return res.status(400).json({
            error: {
              code: 'INVALID_STATE',
              message: error.message,
              requestId: req.id,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to complete session',
          requestId: req.id,
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
