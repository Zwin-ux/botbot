import { performance } from "./performance.js";
import { analytics } from "./analytics.js";
import { cache } from "./cache.js";

/**
 * Advanced AI/ML Features for BotBot
 * Includes sentiment analysis, content moderation, smart suggestions, and predictive analytics
 */
class AIFeaturesManager {
  constructor() {
    this.sentimentCache = new Map();
    this.moderationCache = new Map();
    this.userProfiles = new Map();
    this.conversationContext = new Map();
    this.predictionModels = new Map();

    this.initializeModels();
  }

  /**
   * Initialize AI models and configurations
   */
  initializeModels() {
    // Sentiment analysis keywords (simplified model)
    this.sentimentKeywords = {
      positive: [
        "happy",
        "great",
        "awesome",
        "love",
        "excellent",
        "amazing",
        "wonderful",
        "fantastic",
        "good",
        "nice",
        "thanks",
        "thank you",
      ],
      negative: [
        "sad",
        "bad",
        "terrible",
        "hate",
        "awful",
        "horrible",
        "angry",
        "frustrated",
        "annoyed",
        "disappointed",
        "upset",
      ],
      neutral: [
        "okay",
        "fine",
        "maybe",
        "perhaps",
        "possibly",
        "might",
        "could",
        "would",
        "should",
      ],
    };

    // Content moderation patterns
    this.moderationPatterns = {
      spam: /(.)\1{4,}|(.{1,3})\2{3,}/gi,
      caps: /[A-Z]{10,}/g,
      profanity: /\b(damn|hell|crap)\b/gi, // Simplified list
      toxicity: /(stupid|idiot|moron|dumb)/gi,
    };

    // Initialize prediction models
    this.initializePredictionModels();
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(text, userId = null) {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = `sentiment:${text.substring(0, 100)}`;
      let result = cache.get(cacheKey);

      if (!result) {
        result = await this.performSentimentAnalysis(text);
        cache.set(cacheKey, result, 1800); // 30 minutes
      }

      // Update user profile if provided
      if (userId) {
        this.updateUserSentimentProfile(userId, result);
      }

      const duration = Date.now() - startTime;
      if (performance && performance.recordMetric) {
        performance.recordMetric("sentiment_analysis_time", duration);
      }

      analytics.trackEvent("sentiment_analyzed", {
        sentiment: result.sentiment,
        confidence: result.confidence,
        userId,
        duration,
      });

      return result;
    } catch (error) {
      analytics.trackEvent("sentiment_analysis_error", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Perform sentiment analysis
   */
  async performSentimentAnalysis(text) {
    const words = text.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;
    let neutralScore = 0;

    // Count sentiment keywords
    for (const word of words) {
      if (this.sentimentKeywords.positive.includes(word)) {
        positiveScore++;
      } else if (this.sentimentKeywords.negative.includes(word)) {
        negativeScore++;
      } else if (this.sentimentKeywords.neutral.includes(word)) {
        neutralScore++;
      }
    }

    // Calculate overall sentiment
    const totalScore = positiveScore + negativeScore + neutralScore;
    let sentiment = "neutral";
    let confidence = 0.5;

    if (totalScore > 0) {
      const positiveRatio = positiveScore / totalScore;
      const negativeRatio = negativeScore / totalScore;

      if (positiveRatio > negativeRatio && positiveRatio > 0.3) {
        sentiment = "positive";
        confidence = Math.min(0.9, 0.5 + positiveRatio);
      } else if (negativeRatio > positiveRatio && negativeRatio > 0.3) {
        sentiment = "negative";
        confidence = Math.min(0.9, 0.5 + negativeRatio);
      }
    }

    // Advanced analysis based on patterns
    const advancedAnalysis = this.performAdvancedSentimentAnalysis(text);

    return {
      sentiment,
      confidence,
      scores: {
        positive: positiveScore,
        negative: negativeScore,
        neutral: neutralScore,
      },
      advanced: advancedAnalysis,
      keywords: this.extractSentimentKeywords(text),
      timestamp: Date.now(),
    };
  }

  /**
   * Perform advanced sentiment analysis
   */
  performAdvancedSentimentAnalysis(text) {
    const analysis = {
      emotion: "neutral",
      intensity: 0.5,
      subjectivity: 0.5,
      urgency: 0.5,
    };

    // Emotion detection
    const emotionPatterns = {
      joy: /\b(happy|joy|excited|thrilled|delighted)\b/gi,
      anger: /\b(angry|mad|furious|rage|pissed)\b/gi,
      sadness: /\b(sad|depressed|down|blue|melancholy)\b/gi,
      fear: /\b(scared|afraid|terrified|anxious|worried)\b/gi,
      surprise: /\b(surprised|shocked|amazed|astonished)\b/gi,
    };

    for (const [emotion, pattern] of Object.entries(emotionPatterns)) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        analysis.emotion = emotion;
        analysis.intensity = Math.min(0.9, 0.5 + matches.length * 0.2);
        break;
      }
    }

    // Subjectivity (opinion vs fact)
    const subjectivePatterns =
      /\b(think|feel|believe|opinion|personally|seems|appears)\b/gi;
    const subjectiveMatches = text.match(subjectivePatterns);
    if (subjectiveMatches) {
      analysis.subjectivity = Math.min(
        0.9,
        0.5 + subjectiveMatches.length * 0.1,
      );
    }

    // Urgency detection
    const urgencyPatterns =
      /\b(urgent|asap|immediately|now|quickly|emergency|help)\b/gi;
    const urgencyMatches = text.match(urgencyPatterns);
    if (urgencyMatches) {
      analysis.urgency = Math.min(0.9, 0.5 + urgencyMatches.length * 0.2);
    }

    return analysis;
  }

  /**
   * Extract sentiment keywords
   */
  extractSentimentKeywords(text) {
    const words = text.toLowerCase().split(/\s+/);
    const keywords = {
      positive: [],
      negative: [],
      neutral: [],
    };

    for (const word of words) {
      if (this.sentimentKeywords.positive.includes(word)) {
        keywords.positive.push(word);
      } else if (this.sentimentKeywords.negative.includes(word)) {
        keywords.negative.push(word);
      } else if (this.sentimentKeywords.neutral.includes(word)) {
        keywords.neutral.push(word);
      }
    }

    return keywords;
  }

  /**
   * Moderate content for inappropriate material
   */
  async moderateContent(text, userId = null, channelId = null) {
    const startTime = Date.now();

    try {
      const cacheKey = `moderation:${text.substring(0, 100)}`;
      let result = cache.get(cacheKey);

      if (!result) {
        result = await this.performContentModeration(text);
        cache.set(cacheKey, result, 3600); // 1 hour
      }

      // Track moderation results
      if (result.flagged) {
        analytics.trackEvent("content_flagged", {
          reasons: result.reasons,
          severity: result.severity,
          userId,
          channelId,
        });
      }

      const duration = Date.now() - startTime;
      if (performance && performance.recordMetric) {
        performance.recordMetric("content_moderation_time", duration);
      }

      return result;
    } catch (error) {
      analytics.trackEvent("content_moderation_error", {
        error: error.message,
        userId,
        channelId,
      });
      throw error;
    }
  }

  /**
   * Perform content moderation
   */
  async performContentModeration(text) {
    const flags = [];
    const reasons = [];
    let severity = "low";

    // Check for spam patterns
    if (this.moderationPatterns.spam.test(text)) {
      flags.push("spam");
      reasons.push("Repetitive characters or patterns detected");
    }

    // Check for excessive caps
    const capsMatches = text.match(this.moderationPatterns.caps);
    if (capsMatches && capsMatches.length > 0) {
      flags.push("caps");
      reasons.push("Excessive use of capital letters");
    }

    // Check for profanity
    if (this.moderationPatterns.profanity.test(text)) {
      flags.push("profanity");
      reasons.push("Inappropriate language detected");
      severity = "medium";
    }

    // Check for toxicity
    if (this.moderationPatterns.toxicity.test(text)) {
      flags.push("toxicity");
      reasons.push("Potentially toxic language detected");
      severity = "high";
    }

    // Advanced checks
    const advancedFlags = await this.performAdvancedModeration(text);
    flags.push(...advancedFlags.flags);
    reasons.push(...advancedFlags.reasons);

    if (advancedFlags.severity === "critical") {
      severity = "critical";
    }

    return {
      flagged: flags.length > 0,
      flags,
      reasons,
      severity,
      confidence: this.calculateModerationConfidence(flags),
      suggestions: this.generateModerationSuggestions(flags),
      timestamp: Date.now(),
    };
  }

  /**
   * Perform advanced content moderation
   */
  async performAdvancedModeration(text) {
    const flags = [];
    const reasons = [];
    let severity = "low";

    // Check for personal information
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;

    if (emailPattern.test(text)) {
      flags.push("personal_info");
      reasons.push("Email address detected");
      severity = "medium";
    }

    if (phonePattern.test(text)) {
      flags.push("personal_info");
      reasons.push("Phone number detected");
      severity = "medium";
    }

    // Check for potential scams
    const scamPatterns = [
      /\b(free money|click here|limited time|act now|congratulations you've won)\b/gi,
      /\b(send money|wire transfer|bitcoin|cryptocurrency)\b/gi,
    ];

    for (const pattern of scamPatterns) {
      if (pattern.test(text)) {
        flags.push("potential_scam");
        reasons.push("Potential scam content detected");
        severity = "high";
        break;
      }
    }

    // Check for harassment patterns
    const harassmentPatterns = /\b(kill yourself|kys|die|hate you)\b/gi;
    if (harassmentPatterns.test(text)) {
      flags.push("harassment");
      reasons.push("Potential harassment detected");
      severity = "critical";
    }

    return { flags, reasons, severity };
  }

  /**
   * Calculate moderation confidence
   */
  calculateModerationConfidence(flags) {
    if (flags.length === 0) return 0;

    const weights = {
      spam: 0.7,
      caps: 0.5,
      profanity: 0.8,
      toxicity: 0.9,
      personal_info: 0.6,
      potential_scam: 0.85,
      harassment: 0.95,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const flag of flags) {
      const weight = weights[flag] || 0.5;
      totalWeight += weight;
      weightedSum += weight * weight;
    }

    return totalWeight > 0 ? Math.min(0.95, weightedSum / totalWeight) : 0;
  }

  /**
   * Generate moderation suggestions
   */
  generateModerationSuggestions(flags) {
    const suggestions = [];

    if (flags.includes("spam")) {
      suggestions.push("Consider reducing repetitive content");
    }
    if (flags.includes("caps")) {
      suggestions.push("Try using normal capitalization");
    }
    if (flags.includes("profanity")) {
      suggestions.push("Please keep language appropriate for all users");
    }
    if (flags.includes("toxicity")) {
      suggestions.push("Consider rephrasing in a more constructive way");
    }
    if (flags.includes("personal_info")) {
      suggestions.push("Avoid sharing personal information in public channels");
    }
    if (flags.includes("potential_scam")) {
      suggestions.push("Be cautious of suspicious offers or requests");
    }
    if (flags.includes("harassment")) {
      suggestions.push("This content may violate community guidelines");
    }

    return suggestions;
  }

  /**
   * Generate smart suggestions based on context
   */
  async generateSmartSuggestions(text, userId, channelId, context = {}) {
    const startTime = Date.now();

    try {
      const suggestions = [];

      // Analyze user intent
      const intent = await this.analyzeIntent(text);

      // Generate contextual suggestions
      if (intent.type === "question") {
        suggestions.push(...this.generateQuestionSuggestions(text, context));
      } else if (intent.type === "request") {
        suggestions.push(...this.generateRequestSuggestions(text, context));
      } else if (intent.type === "complaint") {
        suggestions.push(...this.generateComplaintSuggestions(text, context));
      }

      // Add personalized suggestions based on user profile
      const userProfile = this.getUserProfile(userId);
      if (userProfile) {
        suggestions.push(
          ...this.generatePersonalizedSuggestions(text, userProfile),
        );
      }

      // Add channel-specific suggestions
      suggestions.push(...this.generateChannelSuggestions(text, channelId));

      const duration = Date.now() - startTime;
      if (performance && performance.recordMetric) {
        performance.recordMetric("smart_suggestions_time", duration);
      }

      analytics.trackEvent("smart_suggestions_generated", {
        userId,
        channelId,
        intentType: intent.type,
        suggestionCount: suggestions.length,
        duration,
      });

      return {
        suggestions: suggestions.slice(0, 5), // Limit to top 5
        intent,
        confidence: this.calculateSuggestionConfidence(suggestions),
        timestamp: Date.now(),
      };
    } catch (error) {
      analytics.trackEvent("smart_suggestions_error", {
        error: error.message,
        userId,
        channelId,
      });
      throw error;
    }
  }

  /**
   * Analyze user intent
   */
  async analyzeIntent(text) {
    const intentPatterns = {
      question:
        /\b(what|how|when|where|why|who|which|can|could|would|should|is|are|do|does|did)\b.*\?/gi,
      request: /\b(please|can you|could you|would you|help|need|want)\b/gi,
      complaint:
        /\b(problem|issue|bug|error|broken|not working|frustrated|annoyed)\b/gi,
      greeting: /\b(hello|hi|hey|good morning|good afternoon|good evening)\b/gi,
      goodbye: /\b(bye|goodbye|see you|farewell|take care)\b/gi,
      thanks: /\b(thank|thanks|appreciate|grateful)\b/gi,
    };

    for (const [type, pattern] of Object.entries(intentPatterns)) {
      if (pattern.test(text)) {
        return {
          type,
          confidence: 0.8,
          keywords: text.match(pattern) || [],
        };
      }
    }

    return {
      type: "statement",
      confidence: 0.5,
      keywords: [],
    };
  }

  /**
   * Generate question suggestions
   */
  generateQuestionSuggestions(text, context) {
    const suggestions = [];

    if (text.toLowerCase().includes("how")) {
      suggestions.push({
        type: "help",
        text: "I can help you with step-by-step instructions",
        action: "provide_tutorial",
        confidence: 0.8,
      });
    }

    if (text.toLowerCase().includes("what")) {
      suggestions.push({
        type: "definition",
        text: "Would you like me to explain or define something?",
        action: "provide_definition",
        confidence: 0.7,
      });
    }

    return suggestions;
  }

  /**
   * Generate request suggestions
   */
  generateRequestSuggestions(text, context) {
    const suggestions = [];

    if (text.toLowerCase().includes("remind")) {
      suggestions.push({
        type: "reminder",
        text: "I can set up a reminder for you",
        action: "create_reminder",
        confidence: 0.9,
      });
    }

    if (text.toLowerCase().includes("game")) {
      suggestions.push({
        type: "game",
        text: "Would you like to start a game?",
        action: "start_game",
        confidence: 0.8,
      });
    }

    return suggestions;
  }

  /**
   * Generate complaint suggestions
   */
  generateComplaintSuggestions(text, context) {
    const suggestions = [];

    suggestions.push({
      type: "support",
      text: "I can help troubleshoot the issue",
      action: "provide_support",
      confidence: 0.8,
    });

    suggestions.push({
      type: "escalate",
      text: "Would you like me to notify an administrator?",
      action: "escalate_issue",
      confidence: 0.7,
    });

    return suggestions;
  }

  /**
   * Generate personalized suggestions
   */
  generatePersonalizedSuggestions(text, userProfile) {
    const suggestions = [];

    // Based on user's favorite features
    if (userProfile.favoriteFeatures.includes("games")) {
      suggestions.push({
        type: "game_recommendation",
        text: "Try our new advanced games!",
        action: "suggest_games",
        confidence: 0.6,
      });
    }

    if (userProfile.favoriteFeatures.includes("reminders")) {
      suggestions.push({
        type: "reminder_tip",
        text: "Pro tip: You can set recurring reminders",
        action: "show_reminder_tips",
        confidence: 0.6,
      });
    }

    return suggestions;
  }

  /**
   * Generate channel-specific suggestions
   */
  generateChannelSuggestions(text, channelId) {
    const suggestions = [];

    // This would be based on channel configuration and history
    // For now, return generic suggestions
    suggestions.push({
      type: "channel_help",
      text: 'Type "help" to see what I can do in this channel',
      action: "show_channel_help",
      confidence: 0.5,
    });

    return suggestions;
  }

  /**
   * Calculate suggestion confidence
   */
  calculateSuggestionConfidence(suggestions) {
    if (suggestions.length === 0) return 0;

    const totalConfidence = suggestions.reduce(
      (sum, s) => sum + s.confidence,
      0,
    );
    return totalConfidence / suggestions.length;
  }

  /**
   * Update user sentiment profile
   */
  updateUserSentimentProfile(userId, sentimentResult) {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, {
        id: userId,
        sentimentHistory: [],
        averageSentiment: 0.5,
        emotionalState: "neutral",
        lastUpdated: Date.now(),
        favoriteFeatures: [],
        interactionPatterns: {},
      });
    }

    const profile = this.userProfiles.get(userId);
    profile.sentimentHistory.push({
      sentiment: sentimentResult.sentiment,
      confidence: sentimentResult.confidence,
      timestamp: Date.now(),
    });

    // Keep only last 50 entries
    if (profile.sentimentHistory.length > 50) {
      profile.sentimentHistory = profile.sentimentHistory.slice(-50);
    }

    // Calculate average sentiment
    const sentimentValues = profile.sentimentHistory.map((s) => {
      switch (s.sentiment) {
        case "positive":
          return 1;
        case "negative":
          return -1;
        default:
          return 0;
      }
    });

    profile.averageSentiment =
      sentimentValues.reduce((sum, val) => sum + val, 0) /
      sentimentValues.length;
    profile.lastUpdated = Date.now();

    // Update emotional state
    if (profile.averageSentiment > 0.3) {
      profile.emotionalState = "positive";
    } else if (profile.averageSentiment < -0.3) {
      profile.emotionalState = "negative";
    } else {
      profile.emotionalState = "neutral";
    }
  }

  /**
   * Get user profile
   */
  getUserProfile(userId) {
    return this.userProfiles.get(userId);
  }

  /**
   * Initialize prediction models
   */
  initializePredictionModels() {
    // User engagement prediction
    this.predictionModels.set("user_engagement", {
      predict: (userProfile, context) => {
        if (!userProfile) return 0.5;

        const recentActivity = userProfile.sentimentHistory.slice(-10);
        const avgSentiment =
          recentActivity.reduce((sum, s) => {
            switch (s.sentiment) {
              case "positive":
                return sum + 1;
              case "negative":
                return sum - 1;
              default:
                return sum;
            }
          }, 0) / recentActivity.length;

        return Math.max(0, Math.min(1, 0.5 + avgSentiment * 0.3));
      },
    });

    // Churn prediction
    this.predictionModels.set("churn_risk", {
      predict: (userProfile, context) => {
        if (!userProfile) return 0.5;

        const daysSinceLastActivity =
          (Date.now() - userProfile.lastUpdated) / (1000 * 60 * 60 * 24);
        const avgSentiment = userProfile.averageSentiment;

        let churnRisk = 0.1;
        if (daysSinceLastActivity > 7) churnRisk += 0.3;
        if (daysSinceLastActivity > 14) churnRisk += 0.3;
        if (avgSentiment < -0.2) churnRisk += 0.2;

        return Math.min(0.9, churnRisk);
      },
    });
  }

  /**
   * Make prediction using specified model
   */
  predict(modelName, userProfile, context = {}) {
    const model = this.predictionModels.get(modelName);
    if (!model) {
      throw new Error(`Prediction model '${modelName}' not found`);
    }

    const prediction = model.predict(userProfile, context);

    analytics.trackEvent("prediction_made", {
      model: modelName,
      prediction,
      userId: userProfile?.id,
    });

    return {
      model: modelName,
      prediction,
      confidence: 0.7, // This would be calculated based on model performance
      timestamp: Date.now(),
    };
  }

  /**
   * Get AI features statistics
   */
  getAIStats() {
    return {
      sentimentAnalyses: this.sentimentCache.size,
      moderationChecks: this.moderationCache.size,
      userProfiles: this.userProfiles.size,
      predictionModels: this.predictionModels.size,
      cacheHitRate: cache.getStats().hitRate || 0,
    };
  }
}

export const aiFeatures = new AIFeaturesManager();
