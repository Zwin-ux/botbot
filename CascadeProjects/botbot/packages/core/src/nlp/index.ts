/**
 * Natural Language Processing Module
 * Enhanced texting capabilities for BotBot
 */

// Core types
export * from './types';

// NLU Engine
export { INLUEngine, NLUEngine } from './nlu-engine';

// Intent Parser
export { EnhancedIntentParser } from './intent-parser';

// Default configuration
export const DEFAULT_NLU_CONFIG = {
  enabledFeatures: {
    multiIntentParsing: true,
    referenceResolution: true,
    emotionalIntelligence: true,
    richFormatting: true,
    proactiveCommunication: false, // Start disabled for safety
    crossPlatformSync: true
  },
  thresholds: {
    intentConfidence: 0.6,
    emotionConfidence: 0.5,
    referenceConfidence: 0.7
  },
  limits: {
    maxContextMessages: 20,
    maxTopicHistory: 10,
    maxChunkSize: 2000,
    maxDeliveryDelay: 5000
  },
  fallbackLevels: [
    {
      level: 1,
      description: 'Disable advanced features, keep basic NLU',
      components: ['proactiveCommunication', 'crossPlatformSync'],
      gracefulDegradation: true
    },
    {
      level: 2,
      description: 'Disable emotional intelligence and reference resolution',
      components: ['emotionalIntelligence', 'referenceResolution'],
      gracefulDegradation: true
    },
    {
      level: 3,
      description: 'Disable multi-intent parsing',
      components: ['multiIntentParsing'],
      gracefulDegradation: true
    },
    {
      level: 4,
      description: 'Basic intent parsing only',
      components: ['richFormatting'],
      gracefulDegradation: true
    },
    {
      level: 5,
      description: 'Emergency fallback - minimal processing',
      components: [],
      gracefulDegradation: false
    }
  ]
};