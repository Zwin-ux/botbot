/**
 * Natural Language Understanding Engine
 * Core interface and base implementation for enhanced text processing
 */

import {
  MessageInput,
  ParsedMessage,
  Intent,
  EmotionalTone,
  Reference,
  ConversationContext,
  NLUError,
  FallbackStrategy,
  NLUConfig
} from './types';
import { EnhancedIntentParser } from './intent-parser';

export interface INLUEngine {
  /**
   * Parse a message and extract intents, emotions, and references
   */
  parseMessage(input: MessageInput, context?: ConversationContext): Promise<ParsedMessage>;

  /**
   * Extract intents from text with confidence scoring
   */
  extractIntents(text: string, context?: ConversationContext): Promise<Intent[]>;

  /**
   * Resolve references (pronouns, demonstratives) using conversation history
   */
  resolveReferences(text: string, context: ConversationContext): Promise<Reference[]>;

  /**
   * Detect emotional tone and intensity
   */
  detectEmotionalTone(text: string, context?: ConversationContext): Promise<EmotionalTone>;

  /**
   * Analyze media attachments for context
   */
  analyzeMedia(attachments: MessageInput['attachments']): Promise<ParsedMessage['mediaAnalysis']>;

  /**
   * Handle parsing errors with fallback strategies
   */
  handleError(error: NLUError, fallbackLevel: number): Promise<ParsedMessage>;

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NLUConfig>): void;
}

export class NLUEngine implements INLUEngine {
  private config: NLUConfig;
  private fallbackStrategies: FallbackStrategy[];
  private intentParser: EnhancedIntentParser;

  constructor(config: NLUConfig) {
    this.config = config;
    this.fallbackStrategies = config.fallbackLevels;
    this.intentParser = new EnhancedIntentParser();
  }

  async parseMessage(input: MessageInput, context?: ConversationContext): Promise<ParsedMessage> {
    try {
      // Start with basic parsing
      const intents = await this.extractIntents(input.content, context);
      const emotionalTone = await this.detectEmotionalTone(input.content, context);
      const references = context ? await this.resolveReferences(input.content, context) : [];
      const mediaAnalysis = input.attachments ? await this.analyzeMedia(input.attachments) : undefined;

      // Determine message complexity
      const complexity = this.determineComplexity(intents, references, input.content);

      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(intents, emotionalTone, references);

      return {
        intents,
        emotionalTone,
        references,
        complexity,
        mediaAnalysis,
        confidence
      };
    } catch (error) {
      const nluError: NLUError = {
        type: 'parsing',
        message: error instanceof Error ? error.message : 'Unknown parsing error',
        severity: 'medium',
        fallbackUsed: false,
        context: { input, context },
        timestamp: new Date()
      };

      return this.handleError(nluError, 1);
    }
  }

  async extractIntents(text: string, context?: ConversationContext): Promise<Intent[]> {
    try {
      // Use enhanced intent parser
      const intents = await this.intentParser.parseIntents(text, context);

      // Filter by confidence threshold
      const filteredIntents = intents.filter(intent => 
        intent.confidence >= this.config.thresholds.intentConfidence
      );

      // Handle multi-intent scenarios
      if (this.config.enabledFeatures.multiIntentParsing) {
        return filteredIntents;
      }

      // Return highest confidence intent if multi-intent is disabled
      return filteredIntents.length > 0 ? [filteredIntents[0]] : [];
    } catch (error) {
      // Fallback to basic intent detection
      return this.getBasicFallbackIntent(text);
    }
  }

  async resolveReferences(text: string, context: ConversationContext): Promise<Reference[]> {
    if (!this.config.enabledFeatures.referenceResolution) {
      return [];
    }

    try {
      const references: Reference[] = [];
      
      // Pronoun patterns
      const pronounPatterns = [
        { regex: /\b(it|that|this)\b/gi, type: 'pronoun' as const },
        { regex: /\b(he|she|they|him|her|them)\b/gi, type: 'pronoun' as const },
        { regex: /\b(here|there)\b/gi, type: 'demonstrative' as const }
      ];

      for (const pattern of pronounPatterns) {
        const matches = Array.from(text.matchAll(pattern.regex));
        for (const match of matches) {
          const reference: Reference = {
            type: pattern.type,
            text: match[0],
            confidence: 0.7, // Base confidence, will be improved
            contextRequired: true
          };

          // Try to resolve using recent context
          const resolved = this.attemptReferenceResolution(reference, context);
          if (resolved) {
            reference.resolvedTo = resolved;
            reference.confidence = Math.min(reference.confidence + 0.2, 1.0);
          }

          references.push(reference);
        }
      }

      return references;
    } catch (error) {
      return []; // Graceful degradation
    }
  }

  async detectEmotionalTone(text: string, context?: ConversationContext): Promise<EmotionalTone> {
    if (!this.config.enabledFeatures.emotionalIntelligence) {
      return this.getNeutralEmotionalTone();
    }

    try {
      // Basic emotion detection patterns
      const emotionPatterns = {
        happy: /\b(happy|joy|excited|great|awesome|love|amazing|wonderful)\b/gi,
        sad: /\b(sad|depressed|down|upset|disappointed|hurt)\b/gi,
        angry: /\b(angry|mad|furious|annoyed|frustrated|hate)\b/gi,
        excited: /\b(excited|thrilled|pumped|eager|can't wait)\b/gi,
        frustrated: /\b(frustrated|annoyed|stuck|confused|why)\b/gi,
        anxious: /\b(worried|nervous|anxious|scared|afraid)\b/gi
      };

      const indicators: string[] = [];
      let primaryEmotion: EmotionalTone['primary'] = 'neutral';
      let maxScore = 0;

      for (const [emotion, pattern] of Object.entries(emotionPatterns)) {
        const matches = Array.from(text.matchAll(pattern));
        if (matches.length > 0) {
          const score = matches.length;
          indicators.push(...matches.map(m => m[0]));
          
          if (score > maxScore) {
            maxScore = score;
            primaryEmotion = emotion as EmotionalTone['primary'];
          }
        }
      }

      // Calculate intensity based on indicators and context
      const intensity = Math.min(maxScore * 0.3 + (indicators.length * 0.1), 1.0);
      const confidence = indicators.length > 0 ? Math.min(0.6 + (indicators.length * 0.1), 1.0) : 0.3;

      // Calculate valence and arousal
      const valence = this.calculateValence(primaryEmotion);
      const arousal = this.calculateArousal(primaryEmotion, intensity);

      return {
        primary: primaryEmotion,
        intensity,
        confidence,
        indicators,
        valence,
        arousal
      };
    } catch (error) {
      return this.getNeutralEmotionalTone();
    }
  }

  async analyzeMedia(attachments?: MessageInput['attachments']): Promise<ParsedMessage['mediaAnalysis']> {
    if (!attachments || attachments.length === 0) {
      return undefined;
    }

    try {
      const analyses = attachments.map(attachment => ({
        type: attachment.type,
        description: `${attachment.type} file: ${attachment.filename}`,
        relevantContext: [`User shared a ${attachment.type}`],
        suggestedResponse: `I can see you shared a ${attachment.type}. What would you like to know about it?`,
        confidence: 0.5 // Basic analysis, will be enhanced later
      }));

      return analyses;
    } catch (error) {
      return undefined;
    }
  }

  async handleError(error: NLUError, fallbackLevel: number): Promise<ParsedMessage> {
    error.fallbackUsed = true;
    
    const strategy = this.fallbackStrategies[Math.min(fallbackLevel - 1, this.fallbackStrategies.length - 1)];
    
    // Create minimal parsed message for fallback
    return {
      intents: [{
        type: 'CHAT',
        confidence: 0.5,
        parameters: {},
        requiresContext: false,
        priority: 1
      }],
      emotionalTone: this.getNeutralEmotionalTone(),
      references: [],
      complexity: 'simple',
      confidence: 0.3
    };
  }

  updateConfig(config: Partial<NLUConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Private helper methods
  private determineComplexity(intents: Intent[], references: Reference[], text: string): ParsedMessage['complexity'] {
    if (intents.length > 2 || references.length > 3 || text.length > 500) {
      return 'complex';
    }
    if (intents.length > 1 || references.length > 1 || text.split(/[.!?]/).length > 2) {
      return 'multi-part';
    }
    return 'simple';
  }

  private calculateOverallConfidence(intents: Intent[], emotionalTone: EmotionalTone, references: Reference[]): number {
    const intentConfidence = intents.length > 0 ? Math.max(...intents.map(i => i.confidence)) : 0.3;
    const emotionConfidence = emotionalTone.confidence;
    const referenceConfidence = references.length > 0 ? Math.max(...references.map(r => r.confidence)) : 1.0;

    return (intentConfidence + emotionConfidence + referenceConfidence) / 3;
  }

  /**
   * Check if message contains multiple intents
   */
  hasMultipleIntents(text: string): boolean {
    return this.intentParser.hasMultipleIntents(text);
  }

  /**
   * Parse single intent for backward compatibility
   */
  async parseSingleIntent(text: string, context?: ConversationContext): Promise<Intent | null> {
    return this.intentParser.parseSingleIntent(text, context);
  }

  /**
   * Get intent statistics for debugging
   */
  async getIntentStatistics(text: string, context?: ConversationContext): Promise<{
    totalIntents: number;
    hasMultiple: boolean;
    topIntent: Intent | null;
    allIntents: Intent[];
  }> {
    const intents = await this.extractIntents(text, context);
    
    return {
      totalIntents: intents.length,
      hasMultiple: intents.length > 1,
      topIntent: intents.length > 0 ? intents[0] : null,
      allIntents: intents
    };
  }

  private getBasicFallbackIntent(text: string): Intent[] {
    return [{
      type: 'CHAT',
      confidence: 0.4,
      parameters: { originalText: text },
      requiresContext: false,
      priority: 1
    }];
  }

  private attemptReferenceResolution(reference: Reference, context: ConversationContext): string | undefined {
    // Basic resolution using recent messages
    const recentMessages = context.recentMessages.slice(-3);
    
    for (const message of recentMessages.reverse()) {
      if (message.sender === 'user' && message.content.length > reference.text.length) {
        // Simple heuristic: return the most recent substantial user message
        return message.content.substring(0, 50) + '...';
      }
    }

    return undefined;
  }

  private getNeutralEmotionalTone(): EmotionalTone {
    return {
      primary: 'neutral',
      intensity: 0.1,
      confidence: 0.8,
      indicators: [],
      valence: 0,
      arousal: 0.2
    };
  }

  private calculateValence(emotion: EmotionalTone['primary']): number {
    const valenceMap: Record<EmotionalTone['primary'], number> = {
      happy: 0.8,
      excited: 0.7,
      neutral: 0,
      confused: -0.2,
      frustrated: -0.5,
      angry: -0.8,
      sad: -0.7,
      anxious: -0.4
    };
    return valenceMap[emotion] || 0;
  }

  private calculateArousal(emotion: EmotionalTone['primary'], intensity: number): number {
    const arousalMap: Record<EmotionalTone['primary'], number> = {
      excited: 0.9,
      angry: 0.8,
      happy: 0.6,
      frustrated: 0.7,
      anxious: 0.6,
      confused: 0.4,
      sad: 0.3,
      neutral: 0.2
    };
    return (arousalMap[emotion] || 0.2) * intensity;
  }
}