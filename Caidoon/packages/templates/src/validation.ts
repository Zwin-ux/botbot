import { EncounterTemplate, TemplateValidationResult, TemplateGenerationParams } from './types.js';

/**
 * Validates that a template has all required fields and proper structure
 */
export function validateTemplate(template: EncounterTemplate): TemplateValidationResult {
  const errors: string[] = [];
  
  // Check required template fields
  if (!template.id || typeof template.id !== 'string') {
    errors.push('Template must have a valid id');
  }
  
  if (!template.name || typeof template.name !== 'string') {
    errors.push('Template must have a valid name');
  }
  
  if (!template.category || !['combat', 'puzzle', 'social', 'exploration', 'stealth'].includes(template.category)) {
    errors.push('Template must have a valid category');
  }
  
  if (!template.difficulty || !['easy', 'medium', 'hard'].includes(template.difficulty)) {
    errors.push('Template must have a valid difficulty');
  }
  
  if (typeof template.estimatedDuration !== 'number' || template.estimatedDuration <= 0) {
    errors.push('Template must have a valid estimatedDuration (positive number)');
  }
  
  if (!template.structure || typeof template.structure !== 'object') {
    errors.push('Template must have a structure object');
  }
  
  if (!Array.isArray(template.customizableFields)) {
    errors.push('Template must have customizableFields array');
  }
  
  if (!Array.isArray(template.requiredFields)) {
    errors.push('Template must have requiredFields array');
  }
  
  if (!Array.isArray(template.tags)) {
    errors.push('Template must have tags array');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    missingFields: []
  };
}

/**
 * Validates that generation parameters provide all required fields
 */
export function validateGenerationParams(
  template: EncounterTemplate,
  params: TemplateGenerationParams
): TemplateValidationResult {
  const errors: string[] = [];
  const missingFields: string[] = [];
  
  // Check that all required fields are provided
  for (const field of template.requiredFields) {
    if (!(field in params.parameters)) {
      missingFields.push(field);
      errors.push(`Required field '${field}' is missing`);
    }
  }
  
  // Check that provided parameters are valid
  for (const [key, value] of Object.entries(params.parameters)) {
    if (value === undefined || value === null) {
      errors.push(`Parameter '${key}' has invalid value`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    missingFields
  };
}

/**
 * Extracts placeholder names from a string (e.g., "{{enemy_type}}" -> "enemy_type")
 */
export function extractPlaceholders(text: string): string[] {
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const placeholders: string[] = [];
  let match;
  
  while ((match = placeholderRegex.exec(text)) !== null) {
    placeholders.push(match[1]);
  }
  
  return placeholders;
}

/**
 * Validates that all placeholders in the template structure have corresponding parameters
 */
export function validatePlaceholders(
  template: EncounterTemplate,
  parameters: Record<string, any>
): TemplateValidationResult {
  const errors: string[] = [];
  const missingFields: string[] = [];
  
  // Recursively find all placeholders in the structure
  const findPlaceholders = (obj: any): string[] => {
    const placeholders: string[] = [];
    
    if (typeof obj === 'string') {
      placeholders.push(...extractPlaceholders(obj));
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        placeholders.push(...findPlaceholders(item));
      }
    } else if (obj && typeof obj === 'object') {
      for (const value of Object.values(obj)) {
        placeholders.push(...findPlaceholders(value));
      }
    }
    
    return placeholders;
  };
  
  const allPlaceholders = [...new Set(findPlaceholders(template.structure))];
  
  // Check that all placeholders have values
  for (const placeholder of allPlaceholders) {
    if (!(placeholder in parameters)) {
      missingFields.push(placeholder);
      errors.push(`Placeholder '${placeholder}' has no corresponding parameter`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    missingFields
  };
}
