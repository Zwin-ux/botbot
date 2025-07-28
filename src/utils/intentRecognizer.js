/**
 * Natural Language Intent Recognition System
 * Uses simple pattern matching and keyword analysis to determine user intent
 */

// Intent patterns with keywords and responses
// Multi-language intent patterns
// To add a new language, add a new key (e.g., 'fr', 'ja') with the same structure as 'en'.
// English (en) is the default language and should always be defined.
const INTENT_PATTERNS = {
  en: {
    // English intents
    set_reminder: {
      patterns: [
        /(remind me|set a reminder|don't forget|remember to|reminder for)/i,
      ],
      response: "I'll remind you of that. When should I remind you?",
      extract: {},
    },
    help: {
      patterns: [
        /(help|what can you do|how does this work|i'm stuck|what should I do)/i,
      ],
      response:
        "I can help you organize meetings, set reminders, detect if someone is blocked, and play team games. Just talk to me!",
      extract: {},
    },
    greet: {
      patterns: [/(hello|hi|hey|greetings|howdy)/i],
      response: "Hello! How can I help you today?",
      extract: {},
    },
    goodbye: {
      patterns: [/(goodbye|bye|see you|take care|farewell)/i],
      response: "Goodbye! Let me know if you need anything else.",
      extract: {},
    },
    start_meeting: {
      patterns: [
        /(start a meeting|begin a meeting|let's meet|schedule a meeting)/i,
      ],
      response:
        "I can help you start a meeting. What type of meeting would you like to begin?",
      extract: {},
    },
    blocked: {
      patterns: [
        /(i'm stuck|i need help|can someone help|i'm blocked|help me)/i,
      ],
      response:
        "I noticed you might be blocked. Would you like me to help you create a help thread?",
      extract: {},
    },
    start_game: {
      patterns: [/(let's play|start a game|play a game|game time)/i],
      response: "I'd love to play a game! What game would you like to play?",
      extract: {},
    },
    get_time: {
      patterns: [/(what time|current time|time is it|what's the time)/i],
      response: "The current time is {{time}}",
      extract: {},
    },
    status_check: {
      patterns: [
        /(how are you|status|are you working|are you online|you there)/i,
      ],
      response:
        "I'm doing great and ready to help! How can I assist you today?",
      extract: {},
    },
    show_reminders: {
      patterns: [
        /(show reminders|list reminders|my reminders|what reminders|reminder list)/i,
      ],
      response: "Let me show you your current reminders.",
      extract: {},
    },
    thank_you: {
      patterns: [/(thank you|thanks|thx|appreciate it|grateful)/i],
      response: "You're very welcome! Happy to help anytime! 😊",
      extract: {},
    },
  },
  fr: {
    // French intents
    set_reminder: {
      patterns: [
        /(rappelle(-)?moi|crée un rappel|n'oublie pas de|souviens-toi de)/i,
      ],
      response: "Je vais te rappeler cela. Quand dois-je te le rappeler ?",
      extract: {},
    },
    help: {
      patterns: [
        /(aide|qu'est-ce que tu peux faire|comment ça marche|je suis perdu|que dois-je faire)/i,
      ],
      response:
        "Je peux t'aider à organiser des réunions, créer des rappels, détecter si quelqu'un est bloqué, et jouer à des jeux d'équipe. Parle-moi simplement !",
      extract: {},
    },
    // Add more French intents here
    greet: {
      patterns: [/(bonjour|salut|coucou|hey|allo)/i],
      response: "Bonjour ! Comment puis-je t'aider aujourd'hui ?",
      extract: {},
    },
    goodbye: {
      patterns: [/(au revoir|à bientôt|bye|salut|ciao)/i],
      response: "Au revoir ! N'hésite pas à revenir si tu as besoin d'aide.",
      extract: {},
    },
  },
  ja: {
    // Japanese intents
    set_reminder: {
      patterns: [/(リマインドして|リマインダー作成|忘れないで|覚えていて)/i],
      response: "リマインダーを設定します。いつリマインドしますか？",
      extract: {},
    },
    help: {
      patterns: [/(ヘルプ|何ができるの|使い方|困っています|どうすればいい)/i],
      response:
        "会議の管理、リマインダーの作成、ブロックされた人の検出、チームゲームなどができます。お気軽に話しかけてください！",
      extract: {},
    },
    // Add more Japanese intents here
    greet: {
      patterns: [/(こんにちは|やあ|おはよう|こんばんは|ハロー)/i],
      response: "こんにちは！今日はどのようにお手伝いできますか？",
      extract: {},
    },
    goodbye: {
      patterns: [/(さようなら|バイバイ|またね|じゃあね|おやすみ)/i],
      response: "さようなら！また何かあればいつでも話しかけてください。",
      extract: {},
    },
  },
  es: {
    // Spanish intents
    set_reminder: {
      patterns: [/(recuérdame|crear un recordatorio|no olvides|acuérdate de)/i],
      response: "Te recordaré eso. ¿Cuándo quieres que te lo recuerde?",
      extract: {},
    },
    help: {
      patterns: [
        /(ayuda|¿qué puedes hacer?|cómo funciona|estoy perdido|¿qué hago?)/i,
      ],
      response:
        "Puedo ayudarte a organizar reuniones, crear recordatorios, detectar bloqueos y jugar juegos de equipo. ¡Solo háblame!",
      extract: {},
    },
    // Add more Spanish intents here
    greet: {
      patterns: [/(hola|buenos días|buenas tardes|buenas noches|hey)/i],
      response: "¡Hola! ¿En qué puedo ayudarte hoy?",
      extract: {},
    },
    goodbye: {
      patterns: [/(adiós|hasta luego|chao|nos vemos|bye)/i],
      response: "¡Adiós! Si necesitas algo más, aquí estaré.",
      extract: {},
    },
  },
};

/**
 * Recognize intent from a message
 * @param {string} message - The message text to analyze
 * @returns {Object} - { intent: string, confidence: number, entities: Object, response: string }
 */
// Recognize intent from a message for a specific language
/**
 * Recognize intent from a message with optional attentive mode
 * @param {string} message - The message text to analyze
 * @param {string} [language='en'] - Language code
 * @param {boolean} [isAttentive=false] - Whether the bot is in attentive mode
 * @returns {Object} - { intent: string, confidence: number, entities: Object, response: string }
 */
function recognizeIntent(message, language = "en", isAttentive = false) {
  // Clean and prepare the message
  const cleanMessage = message.trim().toLowerCase();

  // Debug logging
  console.log("Recognizing intent for message:", cleanMessage);
  console.log("Available languages:", Object.keys(INTENT_PATTERNS));

  // Pick patterns for the requested language, fallback to English
  const patterns = INTENT_PATTERNS[language] || INTENT_PATTERNS["en"];
  console.log("Using patterns for language:", language);
  console.log("Available intents in language:", Object.keys(patterns));

  // In attentive mode, we can be more lenient with matching
  const ATTENTIVE_MODE_BOOST = 0.2; // 20% confidence boost in attentive mode

  let bestMatch = null;
  let bestConfidence = 0;
  let bestEntities = {};
  let bestResponse = null;

  for (const intent in patterns) {
    const intentObj = patterns[intent];
    for (const pattern of intentObj.patterns) {
      const match = message.match(pattern);
      if (match) {
        const confidence = 1; // Pattern match = high confidence
        if (confidence > bestConfidence) {
          bestMatch = intent;
          bestConfidence = confidence;
          bestEntities = extractEntities(message, intentObj.extract);
          bestResponse = intentObj.response;
        }
      }
    }
  }

  // No intent matched
  if (!bestMatch) {
    return {
      intent: "unknown",
      confidence: 0,
      entities: {},
      response: "",
    };
  }

  // Generate response with entities
  let response = bestResponse;
  for (const [key, value] of Object.entries(bestEntities)) {
    response = response.replace(`{{${key}}}`, value);
  }

  return {
    intent: bestMatch,
    confidence: Math.round(bestConfidence * 100) / 100, // Round to 2 decimal places
    entities: bestEntities,
    response,
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
      if (new RegExp(pattern, "i").test(message)) {
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

export { recognizeIntent, listIntents };
