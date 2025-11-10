import { loadConfig } from './config.js';
import { createServer, logger } from './server.js';

async function main() {
  try {
    // Load configuration
    const config = loadConfig();
    
    logger.info({
      llmModel: config.llmModel,
      temperature: config.llmTemperature,
      maxOutputTokens: config.llmMaxOutputTokens,
    }, 'Configuration loaded successfully');

    // Create and start server
    const app = createServer(config);
    
    app.listen(config.port, () => {
      logger.info({
        port: config.port,
        healthCheckUrl: `http://localhost:${config.port}/health`,
      }, 'LLM Proxy service started');
    });
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to start LLM Proxy service');
    process.exit(1);
  }
}

main();
