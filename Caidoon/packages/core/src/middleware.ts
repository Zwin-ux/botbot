import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { Logger } from './logger.js';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      startTime?: number;
    }
  }
}

/**
 * Middleware to generate and attach a unique request ID to each request
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.id = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

/**
 * Middleware to log incoming requests and responses
 */
export function requestLoggingMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    req.startTime = Date.now();

    // Log incoming request
    logger.info({
      requestId: req.id,
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
    }, 'Incoming request');

    // Capture response finish event
    res.on('finish', () => {
      const duration = req.startTime ? Date.now() - req.startTime : 0;
      
      const logData = {
        requestId: req.id,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      };

      if (res.statusCode >= 500) {
        logger.error(logData, 'Request failed');
      } else if (res.statusCode >= 400) {
        logger.warn(logData, 'Request error');
      } else {
        logger.info(logData, 'Request completed');
      }
    });

    next();
  };
}
