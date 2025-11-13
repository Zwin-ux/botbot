import { MemoryPolicy } from "../models/blueprint.js";

export interface UserMemoryEvent {
  timestamp: string;
  message: string;
  response: string;
  dimensions: MemoryPolicy["rememberedDimensions"];
}

const store = new Map<string, UserMemoryEvent[]>();

function buildKey(blueprintId: string, userId: string): string {
  return `${blueprintId}:${userId}`;
}

export function getUserHistory(
  blueprintId: string,
  userId: string
): UserMemoryEvent[] {
  const key = buildKey(blueprintId, userId);
  return store.get(key) ?? [];
}

export function appendEvent(
  blueprintId: string,
  userId: string,
  event: UserMemoryEvent,
  policy: MemoryPolicy
): UserMemoryEvent[] {
  if (!policy.enabled) {
    return [];
  }
  const key = buildKey(blueprintId, userId);
  const history = store.get(key) ?? [];
  history.push(event);
  const trimmed = history.slice(-policy.maxEventsPerUser);
  store.set(key, trimmed);
  return trimmed;
}

export function resetMemory(): void {
  store.clear();
}
