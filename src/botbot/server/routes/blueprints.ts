import type { Request, Response } from "express";
import { Router } from "express";
import type { BotbotBlueprint } from "../../models/blueprint.js";
import {
  BlueprintInput,
  createBlueprint,
  getBlueprint,
  listBlueprints,
  updateBlueprint,
} from "../../store/blueprintStore.js";

const blueprintRouter = Router();

blueprintRouter.post("/", async (req: Request, res: Response) => {
  const payload = req.body as BlueprintInput | undefined;
  if (!payload || typeof payload.id !== "string") {
    res.status(400).json({ error: "Blueprint payload with id is required" });
    return;
  }

  const existing = await getBlueprint(payload.id);
  let result: BotbotBlueprint;
  if (existing) {
    result =
      (await updateBlueprint(payload.id, payload as Partial<BotbotBlueprint>)) ??
      existing;
  } else {
    result = await createBlueprint(payload);
  }
  res.status(existing ? 200 : 201).json(result);
});

blueprintRouter.get("/", async (_req: Request, res: Response) => {
  const blueprints = await listBlueprints();
  res.json(blueprints);
});

blueprintRouter.get("/:id", async (req: Request, res: Response) => {
  const blueprint = await getBlueprint(req.params.id);
  if (!blueprint) {
    res.status(404).json({ error: "Blueprint not found" });
    return;
  }
  res.json(blueprint);
});

export default blueprintRouter;
