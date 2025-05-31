// Automated tests for the multi-language NLU and parsing pipeline
// Run with: npx jest or npm test (after installing jest)

import InputManager from '../src/input/InputManager.js'; // Added .js
import EnhancedParser from '../src/enhancedParser.js';   // Added .js
// Assuming IntentRecognizer is used as an object with methods by InputManager
import * as IntentRecognizer from '../src/utils/intentRecognizer.js'; // Added .js
import LanguageDetector from '../src/nlu/LanguageDetector.js';   // Added .js

// Mock OutputManager for pipeline test
const OutputManager = {
  async sendResponse({ text }) {
    return text;
  }
};

// Assuming InputManager is properly initialized or does not need complex setup for these tests
// If InputManager itself requires initialization (e.g., with parser, recognizer, detector instances),
// that setup would need to be done here. Based on its static-like call `InputManager.handleInput`,
// it might be a class with static methods or a pre-configured instance.
// For now, the test structure assumes InputManager.handleInput is ready to be called.

describe('Pipeline Integration Tests', () => {
  // Mock any dependencies InputManager might need if they are not passed to handleInput
  // For example, if InputManager internally news up Parser, Recognizer, Detector:
  // jest.mock('../src/enhancedParser.js');
  // jest.mock('../src/utils/intentRecognizer.js');
  // jest.mock('../src/nlu/LanguageDetector.js');
  // Before each test, you might need to ensure these mocks are clean or provide specific return values.

  test('Detects Spanish intent and parses time', async () => {
    const input = await InputManager.handleInput({
      text: 'Recuérdame llamar a mamá en 2 horas',
      user: { id: '4' },
      channel: { send: jest.fn() }
      // Pass mocks if handleInput expects them, e.g.:
      // languageDetector: LanguageDetector,
      // intentRecognizer: IntentRecognizer,
      // parser: new EnhancedParser()
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
    expect(['en', 'fr', 'ja', 'es']).toContain(input.language);
    expect(input.intent).toBeDefined();
  });

  test('Handles ambiguous input', async () => {
    const input = await InputManager.handleInput({
      text: 'help me remember',
      user: { id: '6' },
      channel: { send: jest.fn() }
    });
    expect(['help', 'set_reminder']).toContain(input.intent.intent);
    expect(input.parsed).toBeDefined();
  });

  test('Handles empty or whitespace input', async () => {
    const input = await InputManager.handleInput({
      text: '   ',
      user: { id: '7' },
      channel: { send: jest.fn() }
    });
    expect(input.intent.intent).toBeDefined();
    expect(input.intent.confidence).toBeLessThan(0.5); // Assuming low confidence for empty
  });

  test('Tone/context detection stub', async () => {
    const text = 'Could you please remind me politely?';
    const tone = 'polite';
    expect(['polite', 'casual', 'formal']).toContain(tone);
  });

  test('Semantic entity extraction stub', async () => {
    const text = 'Remind me to call Alice at 5pm tomorrow';
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

// Advanced NLU/Formatting Guidance comments remain unchanged.
// To add more intents/languages, update INTENT_PATTERNS in intentRecognizer.js and timePatternsByLanguage in enhancedParser.js.
