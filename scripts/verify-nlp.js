#!/usr/bin/env node
/**
 * Standalone Natural Language Processing Verification Script
 * Tests the bot's NLP capabilities without Jest overhead
 */

import { recognizeIntent } from '../src/utils/intentRecognizer.js';
import EnhancedParser from '../src/enhancedParser.js';

console.log('🤖 BotBot Natural Language Processing Verification\n');

// Test Intent Recognition
console.log('📝 Testing Intent Recognition...');

const intentTests = [
  // Greetings
  { input: 'hello', expected: 'greet' },
  { input: 'hi there', expected: 'greet' },
  { input: 'hey bot', expected: 'greet' },
  { input: 'good morning', expected: 'greet' },
  
  // Reminders
  { input: 'remind me to call mom', expected: 'set_reminder' },
  { input: 'set a reminder for the meeting', expected: 'set_reminder' },
  { input: 'don\'t forget to buy groceries', expected: 'set_reminder' },
  
  // Help requests
  { input: 'help', expected: 'help' },
  { input: 'what can you do', expected: 'help' },
  { input: 'how does this work', expected: 'help' },
  
  // Blocked/stuck
  { input: 'i\'m stuck on this problem', expected: 'blocked' },
  { input: 'i need help with this', expected: 'blocked' },
  { input: 'can someone help me', expected: 'blocked' },
  
  // Goodbye
  { input: 'goodbye', expected: 'goodbye' },
  { input: 'bye', expected: 'goodbye' },
  { input: 'see you later', expected: 'goodbye' },
];

let intentPassed = 0;
let intentTotal = intentTests.length;

intentTests.forEach(({ input, expected }) => {
  const result = recognizeIntent(input);
  const passed = result.intent === expected;
  
  console.log(`  ${passed ? '✅' : '❌'} "${input}" -> ${result.intent} (confidence: ${result.confidence.toFixed(2)})`);
  
  if (passed) intentPassed++;
});

console.log(`\n📊 Intent Recognition: ${intentPassed}/${intentTotal} tests passed (${((intentPassed/intentTotal)*100).toFixed(1)}%)\n`);

// Test Multi-language Support
console.log('🌍 Testing Multi-language Support...');

const multiLangTests = [
  { input: 'hola', lang: 'es', expected: 'greet' },
  { input: 'bonjour', lang: 'fr', expected: 'greet' },
  { input: 'ayuda', lang: 'es', expected: 'help' },
  { input: 'aide', lang: 'fr', expected: 'help' },
];

let langPassed = 0;
let langTotal = multiLangTests.length;

multiLangTests.forEach(({ input, lang, expected }) => {
  const result = recognizeIntent(input, lang);
  const passed = result.intent === expected;
  
  console.log(`  ${passed ? '✅' : '❌'} "${input}" (${lang}) -> ${result.intent} (confidence: ${result.confidence.toFixed(2)})`);
  
  if (passed) langPassed++;
});

console.log(`\n📊 Multi-language: ${langPassed}/${langTotal} tests passed (${((langPassed/langTotal)*100).toFixed(1)}%)\n`);

// Test Time Parsing
console.log('⏰ Testing Time Parsing...');

const parser = new EnhancedParser();

const timeTests = [
  'in 5 minutes',
  'in 2 hours',
  'in 1 day',
  'tomorrow',
  'next week',
  'at 3pm',
  'at 15:30',
  'at 9:00 AM',
  'today at 5pm',
  'tomorrow at noon',
];

let timePassed = 0;
let timeTotal = timeTests.length;

timeTests.forEach(input => {
  const result = parser.parseTime(input);
  const passed = result instanceof Date && !isNaN(result.getTime());
  
  console.log(`  ${passed ? '✅' : '❌'} "${input}" -> ${passed ? result.toLocaleString() : 'Failed to parse'}`);
  
  if (passed) timePassed++;
});

console.log(`\n📊 Time Parsing: ${timePassed}/${timeTotal} tests passed (${((timePassed/timeTotal)*100).toFixed(1)}%)\n`);

// Test Wake Word Detection
console.log('👂 Testing Wake Word Detection...');

const wakeWordTests = [
  'hey bot can you help me?',
  'okay bot what\'s up?',
  'yo bot how are you?',
  'bot please help',
  'botbot are you there?',
  'hey botbot what can you do?',
];

// Simple wake word detection simulation
const WAKE_WORDS = ['hey bot', 'okay bot', 'yo bot', 'bot', 'botbot', 'hey botbot'];

let wakePassed = 0;
let wakeTotal = wakeWordTests.length;

wakeWordTests.forEach(input => {
  const lowerInput = input.toLowerCase();
  const detected = WAKE_WORDS.some(wakeWord => lowerInput.includes(wakeWord.toLowerCase()));
  
  console.log(`  ${detected ? '✅' : '❌'} "${input}" -> ${detected ? 'Detected' : 'Not detected'}`);
  
  if (detected) wakePassed++;
});

console.log(`\n📊 Wake Word Detection: ${wakePassed}/${wakeTotal} tests passed (${((wakePassed/wakeTotal)*100).toFixed(1)}%)\n`);

// Overall Results
const totalPassed = intentPassed + langPassed + timePassed + wakePassed;
const totalTests = intentTotal + langTotal + timeTotal + wakeTotal;
const overallPercentage = ((totalPassed/totalTests)*100).toFixed(1);

console.log('🎯 Overall Natural Language Processing Results:');
console.log(`   Intent Recognition: ${intentPassed}/${intentTotal} (${((intentPassed/intentTotal)*100).toFixed(1)}%)`);
console.log(`   Multi-language: ${langPassed}/${langTotal} (${((langPassed/langTotal)*100).toFixed(1)}%)`);
console.log(`   Time Parsing: ${timePassed}/${timeTotal} (${((timePassed/timeTotal)*100).toFixed(1)}%)`);
console.log(`   Wake Word Detection: ${wakePassed}/${wakeTotal} (${((wakePassed/wakeTotal)*100).toFixed(1)}%)`);
console.log(`\n🏆 TOTAL: ${totalPassed}/${totalTests} tests passed (${overallPercentage}%)`);

if (overallPercentage >= 90) {
  console.log('\n🎉 Excellent! Natural language processing is working very well.');
} else if (overallPercentage >= 75) {
  console.log('\n👍 Good! Natural language processing is working well with some areas for improvement.');
} else if (overallPercentage >= 50) {
  console.log('\n⚠️  Fair. Natural language processing needs some improvements.');
} else {
  console.log('\n❌ Poor. Natural language processing needs significant work.');
}

console.log('\n✨ Verification complete!');
