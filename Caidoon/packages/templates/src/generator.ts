import { EncounterSpec } from '@ai-encounters/core';
import { EncounterTemplate, TemplateGenerationParams } from './types.js';
import { validateGenerationParams, validatePlaceholders } from './validation.js';
import { getTemplateById } from './library.js';

/**
 * Replaces placeholders in a string with actual values
 * Example: "Defeat {{enemy_count}} {{enemy_type}}" with {enemy_count: 5, enemy_type: "bandits"}
 * becomes "Defeat 5 bandits"
 */
function replacePlaceholders(text: string, parameters: Record<string, any>): string {
  let result = text;
  
  for (const [key, value] of Object.entries(parameters)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
  }
  
  return result;
}

/**
 * Recursively processes an object, replacing all placeholder strings
 */
function processObject(obj: any, parameters: Record<string, any>): any {
  if (typeof obj === 'string') {
    return replacePlaceholders(obj, parameters);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => processObject(item, parameters));
  }
  
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = processObject(value, parameters);
    }
    return result;
  }
  
  return obj;
}

/**
 * Generates a complete EncounterSpec from a template and parameters
 */
export function generateFromTemplate(params: TemplateGenerationParams): EncounterSpec {
  const template = getTemplateById(params.templateId);
  
  if (!template) {
    throw new Error(`Template '${params.templateId}' not found`);
  }
  
  // Validate that all required parameters are provided
  const validation = validateGenerationParams(template, params);
  if (!validation.valid) {
    throw new Error(`Template generation validation failed: ${validation.errors.join(', ')}`);
  }
  
  // Validate that all placeholders have values
  const placeholderValidation = validatePlaceholders(template, params.parameters);
  if (!placeholderValidation.valid) {
    throw new Error(`Missing placeholder values: ${placeholderValidation.missingFields.join(', ')}`);
  }
  
  // Deep clone the template structure
  const structure = JSON.parse(JSON.stringify(template.structure));
  
  // Replace all placeholders with actual values
  const processed = processObject(structure, params.parameters);
  
  // Ensure we have a complete EncounterSpec
  const encounter: EncounterSpec = {
    id: processed.id || `encounter_${Date.now()}`,
    title: processed.title || template.name,
    description: processed.description || template.description,
    objectives: processed.objectives || [],
    npcs: processed.npcs || [],
    rewards: processed.rewards || [],
    difficulty: processed.difficulty || template.difficulty,
    estimatedDuration: processed.estimatedDuration || template.estimatedDuration
  };
  
  return encounter;
}

/**
 * Customizes a template by merging custom values with template defaults
 * This allows partial customization while keeping template defaults
 */
export function customizeTemplate(
  templateId: string,
  customValues: Partial<EncounterSpec>
): Partial<EncounterSpec> {
  const template = getTemplateById(templateId);
  
  if (!template) {
    throw new Error(`Template '${templateId}' not found`);
  }
  
  // Merge custom values with template structure
  return {
    ...template.structure,
    ...customValues
  };
}

/**
 * Gets the default parameter values for a template (useful for UI)
 */
export function getTemplateDefaults(templateId: string): Record<string, any> {
  const template = getTemplateById(templateId);
  
  if (!template) {
    throw new Error(`Template '${templateId}' not found`);
  }
  
  // Return empty defaults for all customizable fields
  const defaults: Record<string, any> = {};
  
  for (const field of template.customizableFields) {
    defaults[field] = '';
  }
  
  return defaults;
}

/**
 * Validates that a generated encounter is complete and valid
 */
export function validateGeneratedEncounter(encounter: EncounterSpec): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!encounter.id) {
    errors.push('Encounter must have an id');
  }
  
  if (!encounter.title) {
    errors.push('Encounter must have a title');
  }
  
  if (!encounter.description) {
    errors.push('Encounter must have a description');
  }
  
  if (!Array.isArray(encounter.objectives) || encounter.objectives.length === 0) {
    errors.push('Encounter must have at least one objective');
  }
  
  if (!Array.isArray(encounter.npcs)) {
    errors.push('Encounter must have an npcs array');
  }
  
  if (!Array.isArray(encounter.rewards)) {
    errors.push('Encounter must have a rewards array');
  }
  
  // Check for any remaining placeholders
  const encounterStr = JSON.stringify(encounter);
  const placeholderMatch = encounterStr.match(/\{\{(\w+)\}\}/);
  if (placeholderMatch) {
    errors.push(`Unreplaced placeholder found: ${placeholderMatch[0]}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
