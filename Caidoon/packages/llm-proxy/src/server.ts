import express, { Express, Request, Response, NextFunction } from 'express';
import { LLMProxyConfig } from './config.js';
import { createRoutes } from './routes.js';
import { 
  HealthCheckResponse, 
  createLogger, 
  requestIdMiddleware, 
  requestLoggingMiddleware,
  Logger 
} from '@ai-encounters/core';

// Create logger instance
export const logger: Logger = createLogger({ serviceName: 'llm-proxy' });

export function createServer(config: LLMProxyConfig): Express {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(requestIdMiddleware);
  app.use(requestLoggingMiddleware(logger));

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    const response: HealthCheckResponse = {
      status: 'ok',
      service: 'llm-proxy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
    res.json(response);
  });

  // API routes
  const routes = createRoutes(config);
  app.use('/', routes);

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error({
      requestId: req.id,
      error: err.message,
      stack: err.stack,
    }, 'Unhandled error');
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred',
        requestId: req.id,
      },
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
