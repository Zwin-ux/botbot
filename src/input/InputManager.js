// InputManager: Normalizes and routes all user input for multi-language support
const LanguageDetector = require("../nlu/LanguageDetector");
const IntentRecognizer = require("../utils/intentRecognizer");
const EnhancedParser = require("../enhancedParser");

const InputManager = {
  async handleInput({ text, user, channel }) {
    // Step 1: Detect language
    const language = await LanguageDetector.detect(text);
    // Step 2: Recognize intent
    const intent = IntentRecognizer.recognizeIntent(text, language);
    // Step 3: Parse for dates/entities
    const parser = new EnhancedParser();
    const parsed = parser.parse(text, language);
    // Step 4: Return normalized data
    return { text, language, user, channel, intent, parsed };
  },
};

module.exports = InputManager;
