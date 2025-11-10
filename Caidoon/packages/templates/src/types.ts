import { EncounterSpec } from '@ai-encounters/core';

/**
 * Template category types
 */
export type TemplateCategory = 'combat' | 'puzzle' | 'social' | 'exploration' | 'stealth';

/**
 * Template difficulty levels
 */
export type TemplateDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Encounter template interface
 * Defines a reusable template structure for creating encounters
 */
export interface EncounterTemplate {
  /** Unique identifier for the template */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Template category */
  category: TemplateCategory;
  
  /** Description of what this template provides */
  description: string;
  
  /** Suggested difficulty level */
  difficulty: TemplateDifficulty;
  
  /** Estimated duration in minutes */
  estimatedDuration: number;
  
  /** Partial encounter structure with placeholders */
  structure: Partial<EncounterSpec>;
  
  /** List of field names that can be customized (e.g., 'enemy_type', 'enemy_count') */
  customizableFields: string[];
  
  /** List of field names that must be provided */
  requiredFields: string[];
  
  /** Tags for filtering and search */
  tags: string[];
}

/**
 * Parameters for generating an encounter from a template
 */
export interface TemplateGenerationParams {
  /** The template ID to use */
  templateId: string;
  
  /** Custom values for template placeholders */
  parameters: Record<string, any>;
  
  /** Optional player context for personalization */
  playerContext?: {
    level?: number;
    preferences?: string[];
    [key: string]: any;
  };
}

/**
 * Result of template validation
 */
export interface TemplateValidationResult {
  /** Whether the template is valid */
  valid: boolean;
  
  /** List of validation errors */
  errors: string[];
  
  /** List of missing required fields */
  missingFields: string[];
}
