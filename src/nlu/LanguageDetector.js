// LanguageDetector: Uses 'franc' for language detection
// To use: npm install franc
const franc = require("franc");

/**
 * Detects the language of a given text using franc.
 * Returns ISO 639-1 code ('en', 'fr', 'ja', etc.), or 'en' as fallback.
 */
module.exports = {
  async detect(text) {
    if (!text || text.length < 3) return "en"; // Too short to detect
    const langCode = franc(text, { minLength: 3 });
    // Map franc's ISO 639-3 codes to ISO 639-1
    const map = { eng: "en", fra: "fr", jpn: "ja", spa: "es" };
    return map[langCode] || "en";
  },
};

/**
 * ---
 * How to add a new language for intent recognition and parsing:
 *
 * 1. INTENT RECOGNIZER:
 *    - In utils/intentRecognizer.js, add a new key to INTENT_PATTERNS (e.g., 'fr', 'ja') with the same structure as 'en'.
 *    - Define patterns, responses, and entity extractors in your target language.
 *
 * 2. ENHANCED PARSER:
 *    - In enhancedParser.js, add a new array in timePatternsByLanguage for your language (e.g., 'fr', 'ja').
 *    - Define regexes and handlers for time/date expressions in your language.
 *
 * 3. That's it! The InputManager will automatically use the detected language for both intent and parsing.
 */
