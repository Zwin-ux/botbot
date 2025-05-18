/**
 * Natural Language Intent Recognition System
 * Uses simple pattern matching and keyword analysis to determine user intent
 */

// Intent patterns with keywords and responses
const INTENT_PATTERNS = {
  // Meeting-related intents
  'start_meeting': {
    patterns: [
      /(let'?s?|let us|we should|can we|start|begin|run)\s+(a |the |an |our )?(meeting|standup|stand-up|retro|retrospective|planning)/i,
      /time for (a |the |our )?(standup|retro|meeting|planning)/i,
      /^(standup|retro|meeting|planning)\s+time/i
    ],
    response: "I'll help you start a {{meeting_type}}. React with 📅 to confirm.",
    extract: {
      meeting_type: [
        [/(standup|stand-up)/i, 'standup'],
        [/(retro|retrospective)/i, 'retrospective'],
        [/(planning)/i, 'planning meeting'],
        [/(meeting)/i, 'meeting']
      ]
    }
  },
  
  // Reminder intents
  'set_reminder': {
    patterns: [
      /(remind me|set a reminder|don'?t let me forget|remember to|don'?t forget to)/i,
      /(i need to|we should|can you remind me|can someone remind me)/i
    ],
    response: "I'll remind you about that. When should I remind you? (e.g., 'in 2 hours' or 'tomorrow at 3pm')",
    extract: {}
  },
  
  // Blocked/help needed
  'blocked': {
    patterns: [
      /(i'?m|i am|we'?re|we are|is anyone|who'?s|who is|who else is|anyone else|anyone)\s+(stuck|blocked|needs? help|waiting on|blocked by)/i,
      /(blocker|blocked|stuck|need help|need a hand|need guidance|need support)/i
    ],
    response: "It sounds like someone might be blocked. Would you like me to start a thread to help?",
    extract: {}
  },
  
  // Game time!
  'start_game': {
    patterns: [
      /(let'?s|let us|we should|can we|who wants to|time for|how about|play|start|begin)\s+(a |the |an |our )?(game|emoji race|story builder|who said it)/i,
      /(game time|play a game|wanna play|anyone for a game)/i
    ],
    response: "🎮 I'll start a {{game_type}} game! React with 🎮 to confirm.",
    extract: {
      game_type: [
        [/(emoji race|emojirace)/i, 'emoji race'],
        [/(story builder|story)/i, 'story builder'],
        [/(who said it|quote game)/i, 'who said it'],
        [/(game)/i, 'game']
      ]
    }
  },
  
  // Help/confused
  'help': {
    patterns: [
      /^\?+$/, // Just question marks
      /(what can you do|how does this work|help me|i'?m lost|confused|what do i do)/i,
      /^(help|halp|huh\??|what\??|how\??|\?)$/i
    ],
    response: "I'm here to help! Here's what I can do:\n\n" +
               "• Start a meeting or standup by mentioning it\n" +
               "• Set reminders naturally in chat\n" +
               "• Help when someone's blocked\n" +
               "• Play games with the team\n\n" +
               "Just type naturally and I'll try to help!",
    extract: {}
  }
};

/**
 * Recognize intent from a message
 * @param {string} message - The message text to analyze
 * @returns {Object} - { intent: string, confidence: number, entities: Object, response: string }
 */
function recognizeIntent(message) {
  // Clean and prepare the message
  const cleanMessage = message.trim().toLowerCase();
  
  // Check for exact matches first (like single words)
  if (cleanMessage === 'help' || cleanMessage === '?') {
    return {
      intent: 'help',
      confidence: 1.0,
      entities: {},
      response: INTENT_PATTERNS.help.response
    };
  }
  
  // Check all patterns
  for (const [intent, data] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of data.patterns) {
      if (pattern.test(cleanMessage)) {
        const match = cleanMessage.match(pattern);
        const entities = extractEntities(cleanMessage, data.extract || {});
        
        // Calculate confidence based on match length vs message length
        const matchedText = match[0];
        const confidence = Math.min(1, matchedText.length / cleanMessage.length * 1.5);
        
        // Generate response with entities
        let response = data.response;
        for (const [key, value] of Object.entries(entities)) {
          response = response.replace(`{{${key}}}`, value);
        }
        
        return {
          intent,
          confidence: Math.round(confidence * 100) / 100, // Round to 2 decimal places
          entities,
          response
        };
      }
    }
  }
  
  // No intent matched
  return {
    intent: 'unknown',
    confidence: 0,
    entities: {},
    response: ''
  };
}

/**
 * Extract entities from the message based on patterns
 * @private
 */
function extractEntities(message, extractors) {
  const entities = {};
  
  for (const [entity, patterns] of Object.entries(extractors)) {
    for (const [pattern, value] of patterns) {
      if (new RegExp(pattern, 'i').test(message)) {
        entities[entity] = value;
        break;
      }
    }
  }
  
  return entities;
}

/**
 * Get a list of all available intents (for help/validation)
 * @returns {string[]} - Array of intent names
 */
function listIntents() {
  return Object.keys(INTENT_PATTERNS);
}

module.exports = {
  recognizeIntent,
  listIntents
};
