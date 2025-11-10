import { Router, Request, Response } from 'express';
import {
  getAllTemplates,
  getTemplateById,
  generateFromTemplate,
  validateGenerationParams,
  TemplateGenerationParams,
} from '@ai-encounters/templates';
import { logger } from '../server.js';

export function createTemplateRoutes(): Router {
  const router = Router();

  // GET /templates - List all available templates
  router.get('/', async (req: Request, res: Response) => {
    try {
      logger.debug({
        requestId: req.id,
      }, 'Fetching all templates');

      const templates = getAllTemplates();

      logger.info({
        requestId: req.id,
        count: templates.length,
      }, 'Templates retrieved successfully');

      return res.json({
        templates,
        count: templates.length,
      });
    } catch (error) {
      logger.error({
        requestId: req.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Error fetching templates');

      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch templates',
          requestId: req.id,
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /templates/:id - Get a specific template
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      logger.debug({
        requestId: req.id,
        templateId: id,
      }, 'Fetching template');

      const template = getTemplateById(id);

      if (!template) {
        logger.warn({
          requestId: req.id,
          templateId: id,
        }, 'Template not found');

        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Template not found: ${id}`,
            requestId: req.id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      logger.info({
        requestId: req.id,
        templateId: id,
      }, 'Template retrieved successfully');

      return res.json(template);
    } catch (error) {
      logger.error({
        requestId: req.id,
        templateId: req.params.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Error fetching template');

      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch template',
          requestId: req.id,
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /templates/:id/generate - Generate an encounter from a template
  router.post('/:id/generate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { parameters, playerContext } = req.body;

      logger.info({
        requestId: req.id,
        templateId: id,
      }, 'Generating encounter from template');

      // Validate that the template exists
      const template = getTemplateById(id);
      if (!template) {
        logger.warn({
          requestId: req.id,
          templateId: id,
        }, 'Template not found');

        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Template not found: ${id}`,
            requestId: req.id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Validate request body
      if (!parameters || typeof parameters !== 'object') {
        logger.warn({
          requestId: req.id,
          templateId: id,
        }, 'Invalid parameters provided');

        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parameters object is required',
            requestId: req.id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Create generation params
      const generationParams: TemplateGenerationParams = {
        templateId: id,
        parameters,
        playerContext,
      };

      // Validate generation parameters
      const validation = validateGenerationParams(template, generationParams);
      if (!validation.valid) {
        logger.warn({
          requestId: req.id,
          templateId: id,
          errors: validation.errors,
          missingFields: validation.missingFields,
        }, 'Template generation validation failed');

        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Template generation validation failed',
            details: {
              errors: validation.errors,
              missingFields: validation.missingFields,
            },
            requestId: req.id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Generate the encounter
      const encounter = generateFromTemplate(generationParams);

      logger.info({
        requestId: req.id,
        templateId: id,
        encounterId: encounter.id,
      }, 'Encounter generated successfully from template');

      return res.status(201).json(encounter);
    } catch (error) {
      logger.error({
        requestId: req.id,
        templateId: req.params.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Error generating encounter from template');

      // Check if it's a validation error
      if (error instanceof Error && error.message.includes('validation failed')) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            requestId: req.id,
          },
          timestamp: new Date().toISOString(),
        });
      }

      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate encounter from template',
          requestId: req.id,
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
