import { Session, PlayerContext } from '@ai-encounters/core';

/**
 * GMod-specific request/response formats
 */
export interface GModStartSessionRequest {
  steamId: string;
  playerName?: string;
  level?: number;
  preferences?: string[];
}

export interface GModSession {
  sessionId: string;
  playerId: string;
  encounter: {
    id: string;
    title: string;
    description: string;
    objectives: Array<{
      id: string;
      description: string;
      type: string;
      target?: string;
      quantity?: number;
      completed: boolean;
    }>;
    npcs: Array<{
      id: string;
      name: string;
      role: string;
      dialogue: Array<{
        trigger: string;
        text: string;
      }>;
    }>;
    rewards: Array<{
      type: string;
      amount: number;
      itemId?: string;
    }>;
    difficulty: string;
    estimatedDuration: number;
  };
  state: {
    currentObjectiveIndex: number;
    objectivesCompleted: string[];
    npcInteractions: Record<string, number>;
  };
  startedAt: string;
  completedAt?: string;
}

/**
 * Convert SteamID to playerId
 * GMod uses SteamID64 format (e.g., "76561198012345678")
 * We'll use a simple prefix to distinguish GMod players
 */
export function steamIdToPlayerId(steamId: string): string {
  return `gmod_${steamId}`;
}

/**
 * Convert GMod start session request to engine format
 */
export function gmodToEngineStartRequest(
  gmodRequest: GModStartSessionRequest
): { playerId: string; context?: PlayerContext } {
  const playerId = steamIdToPlayerId(gmodRequest.steamId);
  
  const context: PlayerContext = {
    playerId,
    level: gmodRequest.level,
    preferences: gmodRequest.preferences,
  };

  return {
    playerId,
    context,
  };
}

/**
 * Convert engine session response to GMod format
 * This is a pass-through since the formats are compatible,
 * but we keep it for future customization
 */
export function engineToGModSession(session: Session): GModSession {
  return {
    sessionId: session.sessionId,
    playerId: session.playerId,
    encounter: {
      id: session.encounter.id,
      title: session.encounter.title,
      description: session.encounter.description,
      objectives: session.encounter.objectives.map((obj: any) => ({
        id: obj.id,
        description: obj.description,
        type: obj.type,
        target: obj.target,
        quantity: obj.quantity,
        completed: obj.completed,
      })),
      npcs: session.encounter.npcs.map((npc: any) => ({
        id: npc.id,
        name: npc.name,
        role: npc.role,
        dialogue: npc.dialogue.map((d: any) => ({
          trigger: d.trigger,
          text: d.text,
        })),
      })),
      rewards: session.encounter.rewards.map((r: any) => ({
        type: r.type,
        amount: r.amount,
        itemId: r.itemId,
      })),
      difficulty: session.encounter.difficulty,
      estimatedDuration: session.encounter.estimatedDuration,
    },
    state: {
      currentObjectiveIndex: session.state.currentObjectiveIndex,
      objectivesCompleted: [...session.state.objectivesCompleted],
      npcInteractions: { ...session.state.npcInteractions },
    },
    startedAt: session.startedAt,
    completedAt: session.completedAt,
  };
}
