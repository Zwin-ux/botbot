import { EncounterSpec, Objective, NPC, DialogueLine, Reward } from '@ai-encounters/core';
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

function validateDialogueLine(line: unknown, index: number): string[] {
  const errors: string[] = [];
  
  if (!isObject(line)) {
    errors.push(`dialogue[${index}] must be an object`);
    return errors;
  }
  
  if (!isString(line.trigger) || line.trigger.trim() === '') {
    errors.push(`dialogue[${index}].trigger must be a non-empty string`);
  }
  
  if (!isString(line.text) || line.text.trim() === '') {
    errors.push(`dialogue[${index}].text must be a non-empty string`);
  }
  
  return errors;
}

function validateNPC(npc: unknown, index: number): string[] {
  const errors: string[] = [];
  
  if (!isObject(npc)) {
    errors.push(`npcs[${index}] must be an object`);
    return errors;
  }
  
  if (!isString(npc.id) || npc.id.trim() === '') {
    errors.push(`npcs[${index}].id must be a non-empty string`);
  }
  
  if (!isString(npc.name) || npc.name.trim() === '') {
    errors.push(`npcs[${index}].name must be a non-empty string`);
  }
  
  if (!isString(npc.role) || npc.role.trim() === '') {
    errors.push(`npcs[${index}].role must be a non-empty string`);
  }
  
  if (!isArray(npc.dialogue)) {
    errors.push(`npcs[${index}].dialogue must be an array`);
  } else {
    npc.dialogue.forEach((line, lineIndex) => {
      errors.push(...validateDialogueLine(line, lineIndex).map(e => `npcs[${index}].${e}`));
    });
  }
  
  return errors;
}

function validateObjective(objective: unknown, index: number): string[] {
  const errors: string[] = [];
  
  if (!isObject(objective)) {
    errors.push(`objectives[${index}] must be an object`);
    return errors;
  }
  
  if (!isString(objective.id) || objective.id.trim() === '') {
    errors.push(`objectives[${index}].id must be a non-empty string`);
  }
  
  if (!isString(objective.description) || objective.description.trim() === '') {
    errors.push(`objectives[${index}].description must be a non-empty string`);
  }
  
  const validTypes = ['collect', 'eliminate', 'interact', 'reach'];
  if (!isString(objective.type) || !validTypes.includes(objective.type)) {
    errors.push(`objectives[${index}].type must be one of: ${validTypes.join(', ')}`);
  }
  
  if (objective.target !== undefined && !isString(objective.target)) {
    errors.push(`objectives[${index}].target must be a string if provided`);
  }
  
  if (objective.quantity !== undefined && !isNumber(objective.quantity)) {
    errors.push(`objectives[${index}].quantity must be a number if provided`);
  }
  
  if (typeof objective.completed !== 'boolean') {
    errors.push(`objectives[${index}].completed must be a boolean`);
  }
  
  return errors;
}

function validateReward(reward: unknown, index: number): string[] {
  const errors: string[] = [];
  
  if (!isObject(reward)) {
    errors.push(`rewards[${index}] must be an object`);
    return errors;
  }
  
  const validTypes = ['currency', 'item', 'experience'];
  if (!isString(reward.type) || !validTypes.includes(reward.type)) {
    errors.push(`rewards[${index}].type must be one of: ${validTypes.join(', ')}`);
  }
  
  if (!isNumber(reward.amount) || reward.amount < 0) {
    errors.push(`rewards[${index}].amount must be a non-negative number`);
  }
  
  if (reward.itemId !== undefined && !isString(reward.itemId)) {
    errors.push(`rewards[${index}].itemId must be a string if provided`);
  }
  
  return errors;
}

export function validateEncounterSpec(data: unknown): ValidationResult<EncounterSpec> {
  const errors: string[] = [];
  
  if (!isObject(data)) {
    return {
      valid: false,
      errors: ['EncounterSpec must be an object']
    };
  }
  
  if (!isString(data.id) || data.id.trim() === '') {
    errors.push('id must be a non-empty string');
  }
  
  if (!isString(data.title) || data.title.trim() === '') {
    errors.push('title must be a non-empty string');
  }
  
  if (!isString(data.description) || data.description.trim() === '') {
    errors.push('description must be a non-empty string');
  }
  
  const validDifficulties = ['easy', 'medium', 'hard'];
  if (!isString(data.difficulty) || !validDifficulties.includes(data.difficulty)) {
    errors.push(`difficulty must be one of: ${validDifficulties.join(', ')}`);
  }
  
  if (!isNumber(data.estimatedDuration) || data.estimatedDuration <= 0) {
    errors.push('estimatedDuration must be a positive number');
  }
  
  if (!isArray(data.objectives)) {
    errors.push('objectives must be an array');
  } else {
    if (data.objectives.length === 0) {
      errors.push('objectives must contain at least one objective');
    }
    data.objectives.forEach((objective, index) => {
      errors.push(...validateObjective(objective, index));
    });
  }
  
  if (!isArray(data.npcs)) {
    errors.push('npcs must be an array');
  } else {
    data.npcs.forEach((npc, index) => {
      errors.push(...validateNPC(npc, index));
    });
  }
  
  if (!isArray(data.rewards)) {
    errors.push('rewards must be an array');
  } else {
    data.rewards.forEach((reward, index) => {
      errors.push(...validateReward(reward, index));
    });
  }
  
  if (errors.length > 0) {
    return {
      valid: false,
      errors
    };
  }
  
  return {
    valid: true,
    data: data as unknown as EncounterSpec
  };
}
