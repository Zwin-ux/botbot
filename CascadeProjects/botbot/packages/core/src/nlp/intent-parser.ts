/**
 * Enhanced Intent Parser
 * Multi-intent parsing with confidence scoring and context awareness
 */

import { Intent, ConversationContext, MessageInput } from './types';

export interface IntentPattern {
  type: string;
  patterns: RegExp[];
  priority: number;
  requiresContext: boolean;
  contextTypes?: string[];
  parameters?: IntentParameterExtractor[];
  confidence: {
    base: number;
    contextBonus?: number;
    lengthPenalty?: number;
  };
}

export interface IntentParameterExtractor {
  name: string;
  pattern: RegExp;
  required: boolean;
  transform?: (value: string) => any;
}

export class EnhancedIntentParser {
  private patterns: IntentPattern[];
  private slangDictionary: Map<string, string>;
  private contextualModifiers: Map<string, number>;

  constructor() {
    this.patterns = this.initializePatterns();
    this.slangDictionary = this.initializeSlangDictionary();
    this.contextualModifiers = this.initializeContextualModifiers();
  }

  /**
   * Parse intents from text with multi-intent support
   */
  async parseIntents(text: string, context?: ConversationContext): Promise<Intent[]> {
    // Normalize text
    const normalizedText = this.normalizeText(text);
    
    // Find all potential intents
    const candidateIntents: Intent[] = [];

    for (const pattern of this.patterns) {
      const matches = this.findPatternMatches(normalizedText, pattern);
      
      for (const match of matches) {
        const intent = await this.createIntentFromMatch(match, pattern, normalizedText, context);
        if (intent) {
          candidateIntents.push(intent);
        }
      }
    }

    // Handle multi-intent scenarios
    return this.resolveMultipleIntents(candidateIntents, normalizedText, context);
  }

  /**
   * Parse a single intent (for backward compatibility)
   */
  async parseSingleIntent(text: string, context?: ConversationContext): Promise<Intent | null> {
    const intents = await this.parseIntents(text, context);
    return intents.length > 0 ? intents[0] : null;
  }

  /**
   * Check if text contains multiple intents
   */
  hasMultipleIntents(text: string): boolean {
    const normalizedText = this.normalizeText(text);
    
    // Look for conjunction patterns
    const conjunctionPatterns = [
      /\band\s+(?:also\s+)?/gi,
      /\bbut\s+(?:also\s+)?/gi,
      /\bthen\s+/gi,
      /\bafter\s+that\s+/gi,
      /\balso\s+/gi,
      /\bplus\s+/gi
    ];

    for (const pattern of conjunctionPatterns) {
      if (pattern.test(normalizedText)) {
        return true;
      }
    }

    // Check for multiple sentence structures
    const sentences = normalizedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 1) {
      return true;
    }

    return false;
  }

  /**
   * Extract parameters from matched text
   */
  private extractParameters(match: RegExpMatchArray, pattern: IntentPattern): Record<string, any> {
    const params: Record<string, any> = {
      matchedText: match[0],
      fullMatch: match.input
    };

    if (pattern.parameters) {
      for (const paramExtractor of pattern.parameters) {
        const paramMatch = match.input?.match(paramExtractor.pattern);
        if (paramMatch) {
          let value = paramMatch[1] || paramMatch[0];
          
          if (paramExtractor.transform) {
            value = paramExtractor.transform(value);
          }
          
          params[paramExtractor.name] = value;
        } else if (paramExtractor.required) {
          // If required parameter is missing, lower confidence
          params._missingRequired = true;
        }
      }
    }

    return params;
  }

  /**
   * Calculate intent confidence based on various factors
   */
  private calculateConfidence(
    match: RegExpMatchArray,
    pattern: IntentPattern,
    fullText: string,
    context?: ConversationContext
  ): number {
    let confidence = pattern.confidence.base;

    // Length penalty - longer matches in shorter text are more confident
    if (pattern.confidence.lengthPenalty) {
      const matchRatio = match[0].length / fullText.length;
      confidence += matchRatio * pattern.confidence.lengthPenalty;
    }

    // Context bonus
    if (context && pattern.confidence.contextBonus) {
      if (this.hasRelevantContext(pattern, context)) {
        confidence += pattern.confidence.contextBonus;
      }
    }

    // Slang recognition bonus
    if (this.containsRecognizedSlang(match[0])) {
      confidence += 0.1;
    }

    // Specificity bonus - more specific patterns get higher confidence
    const specificity = this.calculatePatternSpecificity(pattern, match[0]);
    confidence += specificity * 0.2;

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Resolve multiple intents by prioritizing and filtering
   */
  private resolveMultipleIntents(
    candidates: Intent[],
    text: string,
    context?: ConversationContext
  ): Intent[] {
    if (candidates.length === 0) {
      return [];
    }

    // Sort by priority and confidence
    candidates.sort((a, b) => {
      const scoreA = a.priority * a.confidence;
      const scoreB = b.priority * b.confidence;
      return scoreB - scoreA;
    });

    // Filter out low-confidence intents
    const minConfidence = 0.3;
    const filtered = candidates.filter(intent => intent.confidence >= minConfidence);

    // Handle multi-intent scenarios
    if (this.hasMultipleIntents(text)) {
      // Allow up to 3 high-confidence intents
      return filtered.slice(0, 3);
    }

    // Single intent - return the highest confidence
    return filtered.slice(0, 1);
  }

  /**
   * Normalize text for better parsing
   */
  private normalizeText(text: string): string {
    let normalized = text.toLowerCase().trim();

    // Remove bot mentions
    normalized = normalized.replace(/<@!?\d+>/g, '');

    // Expand contractions
    const contractions: Record<string, string> = {
      "won't": "will not",
      "can't": "cannot",
      "n't": " not",
      "'re": " are",
      "'ve": " have",
      "'ll": " will",
      "'d": " would",
      "'m": " am"
    };

    for (const [contraction, expansion] of Object.entries(contractions)) {
      normalized = normalized.replace(new RegExp(contraction, 'gi'), expansion);
    }

    // Replace slang with standard terms
    for (const [slang, standard] of this.slangDictionary.entries()) {
      const slangRegex = new RegExp(`\\b${slang}\\b`, 'gi');
      normalized = normalized.replace(slangRegex, standard);
    }

    return normalized.trim();
  }

  /**
   * Find pattern matches in text
   */
  private findPatternMatches(text: string, pattern: IntentPattern): RegExpMatchArray[] {
    const matches: RegExpMatchArray[] = [];

    for (const regex of pattern.patterns) {
      const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
      let match;
      
      while ((match = globalRegex.exec(text)) !== null) {
        matches.push(match);
        
        // Prevent infinite loop on zero-length matches
        if (match.index === globalRegex.lastIndex) {
          globalRegex.lastIndex++;
        }
      }
    }

    return matches;
  }

  /**
   * Create intent from pattern match
   */
  private async createIntentFromMatch(
    match: RegExpMatchArray,
    pattern: IntentPattern,
    fullText: string,
    context?: ConversationContext
  ): Promise<Intent | null> {
    // Check context requirements
    if (pattern.requiresContext && !context) {
      return null;
    }

    if (pattern.contextTypes && context) {
      const hasRequiredContext = pattern.contextTypes.some(type => 
        this.hasContextType(context, type)
      );
      if (!hasRequiredContext) {
        return null;
      }
    }

    const parameters = this.extractParameters(match, pattern);
    const confidence = this.calculateConfidence(match, pattern, fullText, context);

    // Skip if confidence is too low
    if (confidence < 0.2) {
      return null;
    }

    // Reduce confidence if required parameters are missing
    if (parameters._missingRequired) {
      delete parameters._missingRequired;
      return {
        type: pattern.type,
        confidence: Math.max(confidence - 0.3, 0.1),
        parameters,
        requiresContext: pattern.requiresContext,
        priority: pattern.priority
      };
    }

    return {
      type: pattern.type,
      confidence,
      parameters,
      requiresContext: pattern.requiresContext,
      priority: pattern.priority
    };
  }

  /**
   * Check if context has relevant information for pattern
   */
  private hasRelevantContext(pattern: IntentPattern, context: ConversationContext): boolean {
    if (!pattern.contextTypes) {
      return context.recentMessages.length > 0;
    }

    return pattern.contextTypes.some(type => this.hasContextType(context, type));
  }

  /**
   * Check if context has specific type of information
   */
  private hasContextType(context: ConversationContext, type: string): boolean {
    switch (type) {
      case 'recent_messages':
        return context.recentMessages.length > 0;
      case 'topic_history':
        return context.topicHistory.length > 0;
      case 'active_references':
        return context.activeReferences.length > 0;
      case 'user_preferences':
        return !!context.userPreferences;
      default:
        return false;
    }
  }

  /**
   * Check if text contains recognized slang
   */
  private containsRecognizedSlang(text: string): boolean {
    for (const slang of this.slangDictionary.keys()) {
      if (new RegExp(`\\b${slang}\\b`, 'i').test(text)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate pattern specificity
   */
  private calculatePatternSpecificity(pattern: IntentPattern, matchedText: string): number {
    // More specific patterns have more required words
    const requiredWords = pattern.patterns[0].source.split('\\b').length - 1;
    const matchedWords = matchedText.split(/\s+/).length;
    
    return Math.min(requiredWords / Math.max(matchedWords, 1), 1);
  }

  /**
   * Initialize intent patterns
   */
  private initializePatterns(): IntentPattern[] {
    return [
      // ADOPT patterns
      {
        type: 'ADOPT',
        patterns: [
          /\b(?:adopt|get|create|make|spawn)\s+(?:a\s+|an\s+)?(?:new\s+)?(?:agent|bot|companion|buddy|friend)\b/i,
          /\bi\s+(?:want|need|would like)\s+(?:a\s+|an\s+)?(?:new\s+)?(?:agent|bot|companion)\b/i,
          /\badopt\s+(.+?)\s+(?:named|called)\s+(\w+)/i
        ],
        priority: 3,
        requiresContext: false,
        parameters: [
          {
            name: 'persona',
            pattern: /(?:adopt|create)\s+(?:a\s+)?(.+?)\s+(?:named|called)/i,
            required: false
          },
          {
            name: 'name',
            pattern: /(?:named|called)\s+(\w+)/i,
            required: false
          }
        ],
        confidence: {
          base: 0.85,
          lengthPenalty: 0.1
        }
      },

      // CHAT patterns (enhanced)
      {
        type: 'CHAT',
        patterns: [
          /\b(?:hello|hi|hey|sup|what's up|how are you|good morning|good afternoon|good evening)\b/i,
          /\b(?:tell me about|what do you think|your opinion|how do you feel)\b/i,
          /\b(?:let's talk|chat|conversation|discuss)\b/i
        ],
        priority: 1,
        requiresContext: false,
        confidence: {
          base: 0.7,
          contextBonus: 0.1
        }
      },

      // REMEMBER patterns (enhanced)
      {
        type: 'REMEMBER',
        patterns: [
          /\b(?:remember|save|store|note|keep in mind|don't forget)\s+(?:that\s+)?(.+)/i,
          /\bi\s+(?:like|love|hate|prefer|enjoy|dislike)\s+(.+)/i,
          /\bmy\s+(?:name is|birthday is|favorite|preference)\s+(.+)/i
        ],
        priority: 2,
        requiresContext: false,
        parameters: [
          {
            name: 'content',
            pattern: /(?:remember|save|store|note|keep in mind|don't forget)\s+(?:that\s+)?(.+)/i,
            required: true
          },
          {
            name: 'type',
            pattern: /\b(like|love|hate|prefer|enjoy|dislike|name|birthday|favorite)\b/i,
            required: false,
            transform: (value: string) => {
              const typeMap: Record<string, string> = {
                'like': 'preference',
                'love': 'preference',
                'hate': 'preference',
                'prefer': 'preference',
                'enjoy': 'preference',
                'dislike': 'preference',
                'name': 'identity',
                'birthday': 'personal',
                'favorite': 'preference'
              };
              return typeMap[value.toLowerCase()] || 'general';
            }
          }
        ],
        confidence: {
          base: 0.8,
          lengthPenalty: 0.15
        }
      },

      // RECALL patterns (enhanced)
      {
        type: 'RECALL',
        patterns: [
          /\b(?:what do you (?:know|remember)|tell me what you know|recall|what did i tell you)\b/i,
          /\bdo you remember\s+(.+)/i,
          /\bwhat's my\s+(.+)/i
        ],
        priority: 2,
        requiresContext: true,
        contextTypes: ['recent_messages', 'topic_history'],
        parameters: [
          {
            name: 'query',
            pattern: /(?:remember|recall|know about)\s+(.+)/i,
            required: false
          }
        ],
        confidence: {
          base: 0.8,
          contextBonus: 0.15
        }
      },

      // MOOD patterns (enhanced)
      {
        type: 'MOOD',
        patterns: [
          /\b(?:set|change|make)\s+(?:your\s+)?mood\s+(?:to\s+)?(\w+)/i,
          /\bbe\s+(?:more\s+)?(\w+)/i,
          /\bhow are you feeling|what's your mood|mood check\b/i
        ],
        priority: 2,
        requiresContext: false,
        parameters: [
          {
            name: 'mood',
            pattern: /(?:mood\s+(?:to\s+)?|be\s+(?:more\s+)?)(\w+)/i,
            required: false
          }
        ],
        confidence: {
          base: 0.75,
          lengthPenalty: 0.1
        }
      },

      // HELP patterns (enhanced)
      {
        type: 'HELP',
        patterns: [
          /\b(?:help|commands|what can you do|how do i|instructions|guide)\b/i,
          /\bi\s+(?:need help|don't know|am confused|don't understand)\b/i,
          /\b(?:explain|show me|teach me)\s+(?:how to|about)\b/i
        ],
        priority: 2,
        requiresContext: false,
        confidence: {
          base: 0.9,
          lengthPenalty: 0.05
        }
      },

      // GARDEN patterns
      {
        type: 'GARDEN',
        patterns: [
          /\b(?:show|open|visit|go to)\s+(?:the\s+)?(?:garden|web|website|interface)\b/i,
          /\bweb\s+(?:interface|version|app)\b/i
        ],
        priority: 2,
        requiresContext: false,
        confidence: {
          base: 0.85
        }
      },

      // QUESTION patterns (new)
      {
        type: 'QUESTION',
        patterns: [
          /\b(?:what|why|how|when|where|who|which)\b.*\?/i,
          /\bcan you\s+(.+)\?/i,
          /\bis it\s+(.+)\?/i
        ],
        priority: 1,
        requiresContext: false,
        parameters: [
          {
            name: 'questionType',
            pattern: /\b(what|why|how|when|where|who|which|can|is)\b/i,
            required: false
          }
        ],
        confidence: {
          base: 0.6,
          contextBonus: 0.2
        }
      },

      // COMPLIMENT patterns (new)
      {
        type: 'COMPLIMENT',
        patterns: [
          /\b(?:you're|you are)\s+(?:so\s+)?(?:good|great|awesome|amazing|helpful|smart|cool|nice)\b/i,
          /\b(?:good job|well done|nice work|thank you|thanks)\b/i,
          /\bi\s+(?:like|love)\s+(?:you|talking to you|this)\b/i
        ],
        priority: 1,
        requiresContext: false,
        confidence: {
          base: 0.8
        }
      }
    ];
  }

  /**
   * Initialize slang dictionary
   */
  private initializeSlangDictionary(): Map<string, string> {
    return new Map([
      // Common internet slang
      ['ur', 'your'],
      ['u', 'you'],
      ['r', 'are'],
      ['n', 'and'],
      ['w/', 'with'],
      ['w/o', 'without'],
      ['b4', 'before'],
      ['2', 'to'],
      ['4', 'for'],
      ['thx', 'thanks'],
      ['ty', 'thank you'],
      ['np', 'no problem'],
      ['yw', 'you are welcome'],
      ['omg', 'oh my god'],
      ['lol', 'laugh out loud'],
      ['lmao', 'laughing my ass off'],
      ['rofl', 'rolling on floor laughing'],
      ['btw', 'by the way'],
      ['fyi', 'for your information'],
      ['imo', 'in my opinion'],
      ['imho', 'in my humble opinion'],
      ['tbh', 'to be honest'],
      ['ngl', 'not gonna lie'],
      ['rn', 'right now'],
      ['atm', 'at the moment'],
      ['asap', 'as soon as possible'],
      ['brb', 'be right back'],
      ['gtg', 'got to go'],
      ['ttyl', 'talk to you later'],
      ['irl', 'in real life'],
      ['afk', 'away from keyboard'],
      ['dm', 'direct message'],
      ['pm', 'private message'],
      
      // Gaming slang
      ['gg', 'good game'],
      ['wp', 'well played'],
      ['gl', 'good luck'],
      ['hf', 'have fun'],
      ['glhf', 'good luck have fun'],
      ['ez', 'easy'],
      ['op', 'overpowered'],
      ['nerf', 'weaken'],
      ['buff', 'strengthen'],
      ['noob', 'newbie'],
      ['pro', 'professional'],
      
      // Emotional expressions
      ['meh', 'okay'],
      ['yay', 'hooray'],
      ['nah', 'no'],
      ['yep', 'yes'],
      ['yup', 'yes'],
      ['nope', 'no'],
      ['kk', 'okay'],
      ['k', 'okay'],
      ['ofc', 'of course'],
      ['duh', 'obviously'],
      ['ikr', 'i know right'],
      ['smh', 'shaking my head'],
      ['fml', 'forget my life'],
      ['yolo', 'you only live once']
    ]);
  }

  /**
   * Initialize contextual modifiers
   */
  private initializeContextualModifiers(): Map<string, number> {
    return new Map([
      ['recent_conversation', 0.1],
      ['mentioned_before', 0.15],
      ['user_preference', 0.2],
      ['emotional_context', 0.1],
      ['time_sensitive', 0.25]
    ]);
  }
}