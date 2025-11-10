import { createServer, startServer } from './server.js';

async function main() {
  try {
    const app = await createServer();
    startServer(app);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
