import { Router, Request, Response } from 'express';
import { OpenAIClient, GenerateEncounterRequest, GenerateRewardRequest } from './openai.js';
import { validatePlayerContext } from '@ai-encounters/validators';
import { LLMProxyConfig } from './config.js';
import { createHmacMiddleware } from './hmac.js';
import { logger } from './server.js';

export function createRoutes(config: LLMProxyConfig): Router {
  const router = Router();
  const openaiClient = new OpenAIClient(config);
  const hmacMiddleware = createHmacMiddleware(config.hmacSecret);

  // POST /gen/encounter - Generate a new encounter
  router.post('/gen/encounter', hmacMiddleware, async (req: Request, res: Response) => {
    try {
      const { playerContext, difficulty, difficultyLevel, theme } = req.body;

      // Validate player context if provided
      if (playerContext) {
        const validation = validatePlayerContext(playerContext);
        if (!validation.valid) {
          logger.warn({
            requestId: req.id,
            errors: validation.errors,
          }, 'Invalid player context for encounter generation');
          
          return res.status(400).json({
            error: {
              code: 'INVALID_PLAYER_CONTEXT',
              message: 'Invalid player context',
              details: { errors: validation.errors },
              requestId: req.id,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Validate difficulty if provided
      if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
        logger.warn({
          requestId: req.id,
          difficulty,
        }, 'Invalid difficulty value');
        
        return res.status(400).json({
          error: {
            code: 'INVALID_DIFFICULTY',
            message: 'Difficulty must be one of: easy, medium, hard',
            requestId: req.id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Validate difficultyLevel if provided
      if (difficultyLevel !== undefined) {
        if (typeof difficultyLevel !== 'number' || difficultyLevel < 0.1 || difficultyLevel > 1.0) {
          logger.warn({
            requestId: req.id,
            difficultyLevel,
          }, 'Invalid difficultyLevel value');
          
          return res.status(400).json({
            error: {
              code: 'INVALID_DIFFICULTY_LEVEL',
              message: 'difficultyLevel must be a number between 0.1 and 1.0',
              requestId: req.id,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      const request: GenerateEncounterRequest = {
        playerContext,
        difficulty,
        difficultyLevel,
        theme,
      };

      logger.info({
        requestId: req.id,
        difficulty: difficulty || 'medium',
        difficultyLevel: difficultyLevel !== undefined ? difficultyLevel : 'none',
        theme: theme || 'none',
      }, 'Generating encounter');
      
      const encounter = await openaiClient.generateEncounter(request);
      
      logger.info({
        requestId: req.id,
        encounterId: encounter.id,
      }, 'Encounter generated successfully');
      
      res.json(encounter);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Determine status code based on error type
      let statusCode = 500;
      let errorCode = 'INTERNAL_ERROR';
      
      if (errorMessage.includes('OpenAI API error')) {
        statusCode = 502;
        errorCode = 'LLM_SERVICE_ERROR';
      } else if (errorMessage.includes('Circuit breaker is OPEN')) {
        statusCode = 503;
        errorCode = 'SERVICE_UNAVAILABLE';
      } else if (errorMessage.includes('validation')) {
        statusCode = 500;
        errorCode = 'VALIDATION_ERROR';
      }
      
      logger.error({
        requestId: req.id,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        errorCode,
        statusCode,
      }, 'Error generating encounter');
      
      res.status(statusCode).json({
        error: {
          code: errorCode,
          message: errorMessage,
          requestId: req.id,
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /gen/reward - Generate rewards for a completed encounter
  router.post('/gen/reward', hmacMiddleware, async (req: Request, res: Response) => {
    try {
      const { encounterId, difficulty, completionTime } = req.body;

      // Validate required fields
      if (!encounterId || typeof encounterId !== 'string') {
        logger.warn({
          requestId: req.id,
        }, 'Missing or invalid encounterId');
        
        return res.status(400).json({
          error: {
            code: 'MISSING_ENCOUNTER_ID',
            message: 'encounterId is required and must be a string',
            requestId: req.id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
        logger.warn({
          requestId: req.id,
          difficulty,
        }, 'Invalid difficulty for reward generation');
        
        return res.status(400).json({
          error: {
            code: 'INVALID_DIFFICULTY',
            message: 'difficulty is required and must be one of: easy, medium, hard',
            requestId: req.id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const request: GenerateRewardRequest = {
        encounterId,
        difficulty,
        completionTime,
      };

      logger.info({
        requestId: req.id,
        encounterId,
        difficulty,
      }, 'Generating reward');
      
      const rewards = await openaiClient.generateReward(request);
      
      logger.info({
        requestId: req.id,
        encounterId,
        rewardCount: rewards.length,
      }, 'Reward generated successfully');
      
      res.json({ rewards });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Determine status code based on error type
      let statusCode = 500;
      let errorCode = 'INTERNAL_ERROR';
      
      if (errorMessage.includes('OpenAI API error')) {
        statusCode = 502;
        errorCode = 'LLM_SERVICE_ERROR';
      } else if (errorMessage.includes('Circuit breaker is OPEN')) {
        statusCode = 503;
        errorCode = 'SERVICE_UNAVAILABLE';
      }
      
      logger.error({
        requestId: req.id,
        encounterId: req.body.encounterId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        errorCode,
        statusCode,
      }, 'Error generating reward');
      
      res.status(statusCode).json({
        error: {
          code: errorCode,
          message: errorMessage,
          requestId: req.id,
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
