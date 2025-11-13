import type { Request, Response } from "express";
import { Router } from "express";
import type { BotbotChannel } from "../../models/blueprint.js";
import { runBotbotTurn } from "../../runtime/index.js";

const agentsRouter = Router({ mergeParams: true });

type AgentMessageBody = {
  channel: BotbotChannel;
  userId: string;
  message: string;
};

agentsRouter.post(
  "/:blueprintId/message",
  async (req: Request, res: Response): Promise<void> => {
    const { blueprintId } = req.params;
    const body = req.body as AgentMessageBody | undefined;

    if (!body || !body.channel || !body.userId || !body.message) {
      res.status(400).json({ error: "channel, userId, and message are required" });
      return;
    }

    try {
      const result = await runBotbotTurn({
        blueprintId,
        channel: body.channel,
        userId: body.userId,
        message: body.message,
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default agentsRouter;
