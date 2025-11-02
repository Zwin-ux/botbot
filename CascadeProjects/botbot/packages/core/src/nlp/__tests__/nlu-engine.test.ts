/**
 * NLU Engine Tests
 * Unit tests for the Natural Language Understanding engine
 */

import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { NLUEngine, DEFAULT_NLU_CONFIG } from '../index';
import { MessageInput, ConversationContext } from '../types';

describe('NLUEngine', () => {
    let nluEngine: NLUEngine;

    beforeEach(() => {
        nluEngine = new NLUEngine(DEFAULT_NLU_CONFIG);
    });

    describe('parseMessage', () => {
        it('should parse a simple chat message', async () => {
            const input: MessageInput = {
                content: 'Hello, how are you?',
                platform: 'discord',
                userId: 'user123',
                channelId: 'channel123',
                timestamp: new Date()
            };

            const result = await nluEngine.parseMessage(input);

            expect(result.intents).toHaveLength(1);
            expect(result.intents[0].type).toBe('CHAT');
            expect(result.complexity).toBe('simple');
            expect(result.confidence).toBeGreaterThan(0);
        });

        it('should detect adoption intent', async () => {
            const input: MessageInput = {
                content: 'I want to adopt a new agent',
                platform: 'discord',
                userId: 'user123',
                channelId: 'channel123',
                timestamp: new Date()
            };

            const result = await nluEngine.parseMessage(input);

            expect(result.intents).toHaveLength(1);
            expect(result.intents[0].type).toBe('ADOPT');
            expect(result.intents[0].confidence).toBeGreaterThan(0.6);
        });

        it('should handle multi-intent messages when enabled', async () => {
            const input: MessageInput = {
                content: 'Remember this and help me understand it',
                platform: 'discord',
                userId: 'user123',
                channelId: 'channel123',
                timestamp: new Date()
            };

            const result = await nluEngine.parseMessage(input);

            expect(result.intents.length).toBeGreaterThanOrEqual(1);
            expect(result.complexity).toBe('multi-part');
        });
    });

    describe('extractIntents', () => {
        it('should extract basic intents with confidence scores', async () => {
            const intents = await nluEngine.extractIntents('Please help me with this');

            expect(intents).toHaveLength(1);
            expect(intents[0].type).toBe('HELP');
            expect(intents[0].confidence).toBeGreaterThan(0.6);
        });

        it('should return empty array for unclear text', async () => {
            const intents = await nluEngine.extractIntents('asdfghjkl random noise');

            expect(intents).toHaveLength(0);
        });

        it('should prioritize intents correctly', async () => {
            const intents = await nluEngine.extractIntents('I want to adopt an agent and get help');

            expect(intents.length).toBeGreaterThan(0);
            // ADOPT should have higher priority than HELP
            if (intents.length > 1) {
                expect(intents[0].type).toBe('ADOPT');
            }
        });

        it('should handle multi-intent parsing when enabled', async () => {
            const intents = await nluEngine.extractIntents('Remember this and help me understand');

            expect(intents.length).toBeGreaterThanOrEqual(1);
            const intentTypes = intents.map(i => i.type);
            expect(intentTypes).toContain('REMEMBER');
        });

        it('should respect confidence thresholds', async () => {
            const intents = await nluEngine.extractIntents('maybe something unclear');

            // All returned intents should meet confidence threshold
            intents.forEach(intent => {
                expect(intent.confidence).toBeGreaterThanOrEqual(DEFAULT_NLU_CONFIG.thresholds.intentConfidence);
            });
        });
    });

    describe('detectEmotionalTone', () => {
        it('should detect happy emotions', async () => {
            const emotion = await nluEngine.detectEmotionalTone('I am so happy and excited!');

            expect(emotion.primary).toBe('happy');
            expect(emotion.intensity).toBeGreaterThan(0);
            expect(emotion.valence).toBeGreaterThan(0);
            expect(emotion.indicators).toContain('happy');
        });

        it('should detect sad emotions', async () => {
            const emotion = await nluEngine.detectEmotionalTone('I feel really sad and disappointed');

            expect(emotion.primary).toBe('sad');
            expect(emotion.intensity).toBeGreaterThan(0);
            expect(emotion.valence).toBeLessThan(0);
            expect(emotion.indicators).toContain('sad');
        });

        it('should default to neutral for unclear text', async () => {
            const emotion = await nluEngine.detectEmotionalTone('The weather is weather');

            expect(emotion.primary).toBe('neutral');
            expect(emotion.intensity).toBeLessThan(0.5);
            expect(emotion.valence).toBe(0);
        });

        it('should calculate appropriate arousal levels', async () => {
            const excitedEmotion = await nluEngine.detectEmotionalTone('I am so excited!');
            const sadEmotion = await nluEngine.detectEmotionalTone('I am sad');

            expect(excitedEmotion.arousal).toBeGreaterThan(sadEmotion.arousal);
        });
    });

    describe('resolveReferences', () => {
        const mockContext: ConversationContext = {
            userId: 'user123',
            channelId: 'channel123',
            platform: 'discord',
            recentMessages: [
                {
                    id: 'msg1',
                    content: 'I bought a new car yesterday',
                    sender: 'user',
                    timestamp: new Date(Date.now() - 60000)
                },
                {
                    id: 'msg2',
                    content: 'That sounds great!',
                    sender: 'agent',
                    timestamp: new Date(Date.now() - 30000)
                }
            ],
            topicHistory: [],
            activeReferences: [],
            lastInteraction: new Date()
        };

        it('should identify pronoun references', async () => {
            const references = await nluEngine.resolveReferences('It was expensive', mockContext);

            expect(references).toHaveLength(1);
            expect(references[0].type).toBe('pronoun');
            expect(references[0].text).toBe('It');
        });

        it('should attempt to resolve references using context', async () => {
            const references = await nluEngine.resolveReferences('It was expensive', mockContext);

            expect(references[0].resolvedTo).toBeDefined();
            expect(references[0].confidence).toBeGreaterThan(0.7);
        });

        it('should return empty array when reference resolution is disabled', async () => {
            const disabledConfig = {
                ...DEFAULT_NLU_CONFIG,
                enabledFeatures: {
                    ...DEFAULT_NLU_CONFIG.enabledFeatures,
                    referenceResolution: false
                }
            };
            const disabledEngine = new NLUEngine(disabledConfig);

            const references = await disabledEngine.resolveReferences('It was great', mockContext);

            expect(references).toHaveLength(0);
        });
    });

    describe('analyzeMedia', () => {
        it('should analyze image attachments', async () => {
            const attachments = [{
                type: 'image' as const,
                url: 'https://example.com/image.jpg',
                filename: 'photo.jpg',
                size: 1024,
                mimeType: 'image/jpeg'
            }];

            const analysis = await nluEngine.analyzeMedia(attachments);

            expect(analysis).toHaveLength(1);
            expect(analysis![0].type).toBe('image');
            expect(analysis![0].description).toContain('image');
            expect(analysis![0].confidence).toBeGreaterThan(0);
        });

        it('should return undefined for no attachments', async () => {
            const analysis = await nluEngine.analyzeMedia(undefined);

            expect(analysis).toBeUndefined();
        });
    });

    describe('error handling', () => {
        it('should handle parsing errors gracefully', async () => {
            // Mock a parsing error by passing invalid input
            const mockEngine = new NLUEngine(DEFAULT_NLU_CONFIG);

            // Override extractIntents to throw an error
            jest.spyOn(mockEngine, 'extractIntents').mockRejectedValue(new Error('Test error'));

            const input: MessageInput = {
                content: 'test message',
                platform: 'discord',
                userId: 'user123',
                channelId: 'channel123',
                timestamp: new Date()
            };

            const result = await mockEngine.parseMessage(input);

            expect(result.intents).toHaveLength(1);
            expect(result.intents[0].type).toBe('CHAT');
            expect(result.confidence).toBeLessThan(0.5);
        });

        it('should use fallback strategies', async () => {
            const error = {
                type: 'parsing' as const,
                message: 'Test error',
                severity: 'medium' as const,
                fallbackUsed: false,
                timestamp: new Date()
            };

            const result = await nluEngine.handleError(error, 1);

            expect(result.intents[0].type).toBe('CHAT');
            expect(result.confidence).toBeLessThan(1.0);
        });
    });

    describe('enhanced features', () => {
        it('should detect multiple intents', () => {
            const multiIntentText = 'Remember this and help me with that';
            const singleIntentText = 'Just help me please';

            expect(nluEngine.hasMultipleIntents(multiIntentText)).toBe(true);
            expect(nluEngine.hasMultipleIntents(singleIntentText)).toBe(false);
        });

        it('should parse single intent for backward compatibility', async () => {
            const text = 'I need help with something';
            const intent = await nluEngine.parseSingleIntent(text);

            expect(intent).not.toBeNull();
            expect(intent!.type).toBe('HELP');
        });

        it('should provide intent statistics', async () => {
            const text = 'Remember this and help me understand';
            const stats = await nluEngine.getIntentStatistics(text);

            expect(stats.totalIntents).toBeGreaterThan(0);
            expect(stats.topIntent).not.toBeNull();
            expect(stats.allIntents).toHaveLength(stats.totalIntents);
            expect(typeof stats.hasMultiple).toBe('boolean');
        });
    });

    describe('configuration', () => {
        it('should update configuration correctly', () => {
            const newConfig = {
                thresholds: {
                    intentConfidence: 0.8,
                    emotionConfidence: 0.7,
                    referenceConfidence: 0.9
                }
            };

            nluEngine.updateConfig(newConfig);

            // Test that the new thresholds are applied
            expect(nluEngine['config'].thresholds.intentConfidence).toBe(0.8);
        });

        it('should respect feature toggles', async () => {
            const disabledConfig = {
                ...DEFAULT_NLU_CONFIG,
                enabledFeatures: {
                    ...DEFAULT_NLU_CONFIG.enabledFeatures,
                    emotionalIntelligence: false
                }
            };
            const disabledEngine = new NLUEngine(disabledConfig);

            const emotion = await disabledEngine.detectEmotionalTone('I am very happy!');

            expect(emotion.primary).toBe('neutral');
            expect(emotion.confidence).toBe(0.8);
        });

        it('should disable multi-intent parsing when configured', async () => {
            const singleIntentConfig = {
                ...DEFAULT_NLU_CONFIG,
                enabledFeatures: {
                    ...DEFAULT_NLU_CONFIG.enabledFeatures,
                    multiIntentParsing: false
                }
            };
            const singleIntentEngine = new NLUEngine(singleIntentConfig);

            const intents = await singleIntentEngine.extractIntents('Remember this and help me');

            // Should return only one intent when multi-intent is disabled
            expect(intents).toHaveLength(1);
        });
    });
});