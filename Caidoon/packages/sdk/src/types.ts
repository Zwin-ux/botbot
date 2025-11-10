import { Session, PlayerContext } from '@ai-encounters/core';

export interface ClientOptions {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface StartSessionRequest {
  playerId: string;
  context?: PlayerContext;
}

export interface UpdateObjectiveRequest {
  sessionId: string;
  objectiveId: string;
}

export interface SDKError extends Error {
  statusCode?: number;
  details?: unknown;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}
