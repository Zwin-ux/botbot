import express, { type Express } from "express";
import agentsRouter from "./routes/agents.js";
import blueprintRouter from "./routes/blueprints.js";

export function createServer(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/blueprints", blueprintRouter);
  app.use("/api/agents", agentsRouter);
  return app;
}

export function startServer(port: number): Express {
  const app = createServer();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`BotBot API listening on port ${port}`);
  });
  return app;
}
