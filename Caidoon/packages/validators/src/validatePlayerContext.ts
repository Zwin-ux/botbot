import { PlayerContext } from '@ai-encounters/core';
import { ValidationResult } from './types.js';

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validatePlayerContext(data: unknown): ValidationResult<PlayerContext> {
  const errors: string[] = [];
  
  if (!isObject(data)) {
    return {
      valid: false,
      errors: ['PlayerContext must be an object']
    };
  }
  
  if (!isString(data.playerId) || data.playerId.trim() === '') {
    errors.push('playerId must be a non-empty string');
  }
  
  if (data.level !== undefined) {
    if (!isNumber(data.level) || data.level < 0) {
      errors.push('level must be a non-negative number if provided');
    }
  }
  
  if (data.preferences !== undefined) {
    if (!isArray(data.preferences)) {
      errors.push('preferences must be an array if provided');
    } else {
      const allStrings = data.preferences.every(item => isString(item));
      if (!allStrings) {
        errors.push('preferences must be an array of strings');
      }
    }
  }
  
  if (data.history !== undefined) {
    if (!isArray(data.history)) {
      errors.push('history must be an array if provided');
    } else {
      const allStrings = data.history.every(item => isString(item));
      if (!allStrings) {
        errors.push('history must be an array of strings');
      }
    }
  }
  
  if (errors.length > 0) {
    return {
      valid: false,
      errors
    };
  }
  
  return {
    valid: true,
    data: data as unknown as PlayerContext
  };
}
