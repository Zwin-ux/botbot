import { ValidationResult } from './types.js';

export interface SessionStartRequest {
  playerId: string;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateSessionStartRequest(data: unknown): ValidationResult<SessionStartRequest> {
  const errors: string[] = [];
  
  if (!isObject(data)) {
    return {
      valid: false,
      errors: ['SessionStartRequest must be an object']
    };
  }
  
  if (!isString(data.playerId) || data.playerId.trim() === '') {
    errors.push('playerId must be a non-empty string');
  }
  
  if (errors.length > 0) {
    return {
      valid: false,
      errors
    };
  }
  
  return {
    valid: true,
    data: {
      playerId: data.playerId as string
    }
  };
}
