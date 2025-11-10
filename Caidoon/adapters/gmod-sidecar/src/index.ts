import express from 'express';
import { loadConfig } from './config.js';
import { setupRoutes } from './routes.js';

const config = loadConfig();
const app = express();

// Middleware
app.use(express.json());

// Setup routes
setupRoutes(app, config);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(config.port, () => {
  console.log(`GMod Sidecar running on port ${config.port}`);
  console.log(`Connecting to Engine at ${config.engineUrl}`);
});
