import express, { Express } from 'express';
import {
  EventEmitter,
  HookManager,
  HealthCheckResponse,
  DependencyHealth,
  determineOverallStatus,
  measureLatency,
  createLogger,
  requestIdMiddleware,
  requestLoggingMiddleware,
  Logger,
} from '@ai-encounters/core';
import { DifficultyManager } from '@ai-encounters/difficulty-engine';
import { AnalyticsManager, AnalyticsStorage } from '@ai-encounters/analytics';
import { config } from './config.js';
import { FileStorage, PlayerDataStorage } from './storage/index.js';
import { LLMProxyClient } from './llm/index.js';
import { SessionManager, PluginManager } from './services/index.js';
import { createSessionRoutes, createTemplateRoutes, createAnalyticsRoutes } from './routes/index.js';
import path from 'path';

// Create logger instance
export const logger: Logger = createLogger({ serviceName: 'encounters-engine' });

export async function createServer(): Promise<Express> {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(requestIdMiddleware);
  app.use(requestLoggingMiddleware(logger));

  // Initialize event emitter and hook manager
  const events = new EventEmitter();
  const hooks = new HookManager();

  logger.info('Initialized event emitter and hook manager');

  // Initialize plugin system
  const pluginsDir = path.join(process.cwd(), 'plugins');
  const pluginDataDir = path.join(config.dataDir, 'plugins');
  const pluginManager = new PluginManager(pluginsDir, pluginDataDir, events, hooks);

  try {
    await pluginManager.initialize();
    logger.info('Plugin system initialized');
  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : String(error) }, 'Plugin system initialization failed, continuing without plugins');
  }

  // Initialize storage
  const storage = new FileStorage();
  await storage.initialize();

  // Initialize player data storage for difficulty system
  const playerDataStorage = new PlayerDataStorage();
  await playerDataStorage.initialize();

  // Initialize LLM client
  const llmClient = new LLMProxyClient();
  await llmClient.initialize();

  // Initialize difficulty manager
  const difficultyManager = new DifficultyManager();
  logger.info('Initialized difficulty manager');

  // Initialize analytics
  const analyticsStorage = new AnalyticsStorage(config.dataDir);
  await analyticsStorage.initialize();
  const analyticsManager = new AnalyticsManager(analyticsStorage);
  logger.info('Initialized analytics manager');

  // Initialize session manager with events, hooks, and difficulty system
  const sessionManager = new SessionManager(
    storage,
    llmClient,
    events,
    hooks,
    difficultyManager,
    playerDataStorage
  );

  logger.info('Initialized session manager with event/hook system and difficulty adjustment');

  // Set up analytics event listeners
  events.on('session:started', async (data: any) => {
    try {
      await analyticsManager.recordSessionStart(data.session);
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to record session start');
    }
  });

  events.on('session:completed', async (data: any) => {
    try {
      await analyticsManager.recordSessionComplete(data.session);
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to record session completion');
    }
  });

  logger.info('Analytics event listeners registered');

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const dependencies: Record<string, DependencyHealth> = {};

    // Check storage health with latency measurement
    try {
      const { result: storageHealthy, latency: storageLatency } =
        await measureLatency(() => storage.healthCheck());

      dependencies.storage = {
        status: storageHealthy ? 'ok' : 'error',
        latency: storageLatency,
      };

      if (!storageHealthy) {
        dependencies.storage.error = 'Storage health check failed';
        logger.warn({ requestId: req.id }, 'Storage health check failed');
      }
    } catch (error) {
      dependencies.storage = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Storage check failed',
      };
      logger.error({ requestId: req.id, error: error instanceof Error ? error.message : String(error) }, 'Storage health check error');
    }

    // Check LLM proxy health with latency measurement
    try {
      const { result: llmHealth, latency: llmLatency } = await measureLatency(
        () => llmClient.healthCheck()
      );

      dependencies['llm-proxy'] = {
        status: llmHealth.available ? 'ok' : 'error',
        latency: llmLatency,
      };

      if (!llmHealth.available) {
        dependencies['llm-proxy'].error = 'LLM proxy not available';
        logger.warn({ requestId: req.id }, 'LLM proxy not available');
      }
    } catch (error) {
      dependencies['llm-proxy'] = {
        status: 'error',
        error:
          error instanceof Error ? error.message : 'LLM proxy check failed',
      };
      logger.error({ requestId: req.id, error: error instanceof Error ? error.message : String(error) }, 'LLM proxy health check error');
    }

    // Determine overall status
    const overallStatus = determineOverallStatus(dependencies);

    const response: HealthCheckResponse = {
      status: overallStatus,
      service: 'encounters-engine',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      dependencies,
    };

    // Return 503 if degraded or error
    const statusCode = overallStatus === 'ok' ? 200 : 503;
    res.status(statusCode).json(response);
  });

  // Session routes
  app.use('/session', createSessionRoutes(sessionManager));

  // Template routes
  app.use('/templates', createTemplateRoutes());

  // Analytics routes
  app.use('/analytics', createAnalyticsRoutes(analyticsManager));

  return app;
}

export function startServer(app: Express): void {
  app.listen(config.port, () => {
    logger.info({
      port: config.port,
      llmProxyUrl: config.llmProxyUrl,
      dataDir: config.dataDir,
    }, 'Encounters Engine started');
  });
}
