import { promises as fs } from "fs";
import path from "path";
import {
  BotbotBlueprint,
  BotbotChannel,
  resolveEffectiveLeakProfile,
  resolveEffectivePersonality,
} from "../models/blueprint.js";

export type BlueprintInput = Omit<
  BotbotBlueprint,
  "createdAt" | "updatedAt"
> & {
  createdAt?: string;
  updatedAt?: string;
};

const blueprints = new Map<string, BotbotBlueprint>();
let persistenceFile: string | null = null;
let isLoadedFromDisk = false;

function nowISO(): string {
  return new Date().toISOString();
}

async function persist(): Promise<void> {
  if (!persistenceFile) {
    return;
  }
  const serialized = JSON.stringify(Array.from(blueprints.values()), null, 2);
  await fs.writeFile(persistenceFile, serialized, "utf-8");
}

async function ensureLoaded(): Promise<void> {
  if (isLoadedFromDisk || !persistenceFile) {
    return;
  }
  try {
    const raw = await fs.readFile(persistenceFile, "utf-8");
    const data: BotbotBlueprint[] = JSON.parse(raw);
    data.forEach((blueprint) => blueprints.set(blueprint.id, blueprint));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  isLoadedFromDisk = true;
}

export function configureBlueprintPersistence(filePath: string): void {
  persistenceFile = path.resolve(filePath);
  isLoadedFromDisk = false;
}

export async function createBlueprint(
  blueprint: BlueprintInput
): Promise<BotbotBlueprint> {
  await ensureLoaded();
  const timestamp = nowISO();
  const record: BotbotBlueprint = {
    ...blueprint,
    version: blueprint.version ?? 1,
    createdAt: blueprint.createdAt ?? timestamp,
    updatedAt: blueprint.updatedAt ?? timestamp,
  };
  blueprints.set(record.id, record);
  await persist();
  return record;
}

export async function updateBlueprint(
  id: string,
  updates: Partial<BotbotBlueprint>
): Promise<BotbotBlueprint | null> {
  await ensureLoaded();
  const existing = blueprints.get(id);
  if (!existing) {
    return null;
  }
  const updated: BotbotBlueprint = {
    ...existing,
    ...updates,
    version: updates.version ?? existing.version + 1,
    updatedAt: nowISO(),
  };
  blueprints.set(id, updated);
  await persist();
  return updated;
}

export async function getBlueprint(
  id: string
): Promise<BotbotBlueprint | null> {
  await ensureLoaded();
  return blueprints.get(id) ?? null;
}

export async function listBlueprints(): Promise<BotbotBlueprint[]> {
  await ensureLoaded();
  return Array.from(blueprints.values());
}

export function getEffectiveProfiles(
  blueprint: BotbotBlueprint,
  channel: BotbotChannel
): {
  personality: ReturnType<typeof resolveEffectivePersonality>;
  leakProfile: ReturnType<typeof resolveEffectiveLeakProfile>;
} {
  return {
    personality: resolveEffectivePersonality(blueprint, channel),
    leakProfile: resolveEffectiveLeakProfile(blueprint, channel),
  };
}
