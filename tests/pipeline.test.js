// Automated tests for the multi-language NLU and parsing pipeline
// Run with: npx jest or npm test (after installing jest)

const InputManager = require('../src/input/InputManager');
const EnhancedParser = require('../src/enhancedParser');
const IntentRecognizer = require('../src/utils/intentRecognizer');
const LanguageDetector = require('../src/nlu/LanguageDetector');

// Mock OutputManager for pipeline test
const OutputManager = {
  async sendResponse({ text }) {
    return text;
  }
};

describe('Pipeline Integration Tests', () => {
  test('Detects Spanish intent and parses time', async () => {
    const input = await InputManager.handleInput({
      text: 'Recuérdame llamar a mamá en 2 horas',
      user: { id: '4' },
      channel: { send: jest.fn() }
    });
    expect(input.language).toBe('es');
    expect(input.intent.intent).toBeDefined();
    expect(input.parsed).toBeDefined();
  });

  test('Handles unknown language gracefully', async () => {
    const input = await InputManager.handleInput({
      text: 'asdfghjkl qwertyuiop',
      user: { id: '5' },
      channel: { send: jest.fn() }
    });
    // Should fallback to English or default
    expect(['en', 'fr', 'ja', 'es']).toContain(input.language);
    // Should not crash
    expect(input.intent).toBeDefined();
  });

  test('Handles ambiguous input', async () => {
    const input = await InputManager.handleInput({
      text: 'help me remember',
      user: { id: '6' },
      channel: { send: jest.fn() }
    });
    // Should match either help or set_reminder
    expect(['help', 'set_reminder']).toContain(input.intent.intent);
    expect(input.parsed).toBeDefined();
  });

  test('Handles empty or whitespace input', async () => {
    const input = await InputManager.handleInput({
      text: '   ',
      user: { id: '7' },
      channel: { send: jest.fn() }
    });
    // Should return a fallback or error intent
    expect(input.intent.intent).toBeDefined();
    expect(input.intent.confidence).toBeLessThan(0.5);
  });

  test('Tone/context detection stub', async () => {
    // This is a stub for integrating tone/context detection
    // Replace with real implementation if available
    const text = 'Could you please remind me politely?';
    // Simulate a tone/context detection call
    const tone = 'polite'; // Stub result
    expect(['polite', 'casual', 'formal']).toContain(tone);
  });

  test('Semantic entity extraction stub', async () => {
    // This is a stub for integrating semantic entity extraction
    // Replace with real implementation if available
    const text = 'Remind me to call Alice at 5pm tomorrow';
    // Simulate entity extraction
    const entities = { person: 'Alice', time: '5pm tomorrow' };
    expect(entities.person).toBe('Alice');
    expect(entities.time).toBe('5pm tomorrow');
  });

  test('Detects English intent and parses time', async () => {
    const input = await InputManager.handleInput({
      text: 'Remind me to call mom in 2 hours',
      user: { id: '1' },
      channel: { send: jest.fn() }
    });
    expect(input.language).toBe('en');
    expect(input.intent.intent).toBeDefined();
    expect(input.parsed).toBeDefined();
  });

  test('Detects French intent and parses time', async () => {
    const input = await InputManager.handleInput({
      text: "Rappelle-moi d'acheter du pain dans 30 minutes",
      user: { id: '2' },
      channel: { send: jest.fn() }
    });
    expect(input.language).toBe('fr');
    expect(input.intent.intent).toBeDefined();
    expect(input.parsed).toBeDefined();
  });

  test('Detects Japanese intent and parses time', async () => {
    const input = await InputManager.handleInput({
      text: 'パンを買うのをリマインドして2時間後',
      user: { id: '3' },
      channel: { send: jest.fn() }
    });
    expect(input.language).toBe('ja');
    expect(input.intent.intent).toBeDefined();
    expect(input.parsed).toBeDefined();
  });
});

// Advanced NLU/Formatting Guidance
// To add tone/context-aware response or semantic entity extraction:
// 1. For tone/context: Integrate a library like "compromise" or use OpenAI API for tone detection.
// 2. For entity extraction: Use regex, compromise, or spaCy (Python) for advanced extraction.
// 3. For formatting: Use your Auto-Format AI pipeline to clean and structure bot responses, preserving tone and context.

// To add more intents/languages, update INTENT_PATTERNS in intentRecognizer.js and timePatternsByLanguage in enhancedParser.js.
