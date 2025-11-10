import { EncounterSpec } from './encounter';

export interface Session {
  sessionId: string;
  playerId: string;
  encounter: EncounterSpec;
  state: SessionState;
  startedAt: string;
  completedAt?: string;
}

export interface SessionState {
  currentObjectiveIndex: number;
  objectivesCompleted: string[];
  npcInteractions: Record<string, number>;
}
