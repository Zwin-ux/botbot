/**
 * Enhanced Intent Parsing Demo
 * Examples showing the capabilities of the new multi-intent system
 */

import { NLUEngine, DEFAULT_NLU_CONFIG } from '../index';
import { ConversationContext } from '../types';

export async function runIntentParsingDemo() {
  console.log('🚀 Enhanced Intent Parsing Demo\n');

  const nluEngine = new NLUEngine(DEFAULT_NLU_CONFIG);

  // Example conversation context
  const context: ConversationContext = {
    userId: 'demo-user',
    channelId: 'demo-channel',
    platform: 'discord',
    recentMessages: [
      {
        id: 'msg1',
        content: 'I love playing video games',
        sender: 'user',
        timestamp: new Date(Date.now() - 300000) // 5 minutes ago
      },
      {
        id: 'msg2',
        content: 'That sounds fun! What games do you enjoy?',
        sender: 'agent',
        timestamp: new Date(Date.now() - 240000) // 4 minutes ago
      }
    ],
    topicHistory: [
      {
        subject: 'gaming preferences',
        startedAt: new Date(Date.now() - 300000),
        lastMentioned: new Date(Date.now() - 240000),
        importance: 0.8,
        relatedMessages: ['msg1', 'msg2'],
        keywords: ['games', 'video games', 'playing']
      }
    ],
    activeReferences: [],
    lastInteraction: new Date(Date.now() - 60000)
  };

  // Demo examples
  const examples = [
    {
      title: 'Single Intent - Simple Greeting',
      text: 'Hello there, how are you doing today?'
    },
    {
      title: 'Single Intent - Adoption Request',
      text: 'I want to adopt a friendly companion named Luna'
    },
    {
      title: 'Multi-Intent - Remember and Help',
      text: 'Remember that I like pizza and also help me understand how this works'
    },
    {
      title: 'Multi-Intent - Complex Request',
      text: 'Set your mood to happy, then tell me what you remember about my gaming preferences'
    },
    {
      title: 'Slang Recognition',
      text: 'ur so cool, thx for the help btw'
    },
    {
      title: 'Context-Aware Recall',
      text: 'What do you remember about what I told you earlier?'
    },
    {
      title: 'Question with Parameters',
      text: 'Why did that happen and how can I fix it?'
    },
    {
      title: 'Compliment Recognition',
      text: 'You are amazing, thank you so much for your help!'
    }
  ];

  for (const example of examples) {
    console.log(`📝 ${example.title}`);
    console.log(`Input: "${example.text}"`);
    
    try {
      // Parse with full context for context-aware examples
      const useContext = example.title.includes('Context-Aware') || example.title.includes('Complex');
      const result = await nluEngine.parseMessage({
        content: example.text,
        platform: 'discord',
        userId: 'demo-user',
        channelId: 'demo-channel',
        timestamp: new Date()
      }, useContext ? context : undefined);

      console.log(`Complexity: ${result.complexity}`);
      console.log(`Overall Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`Emotional Tone: ${result.emotionalTone.primary} (${(result.emotionalTone.intensity * 100).toFixed(1)}%)`);
      
      if (result.intents.length > 0) {
        console.log('Detected Intents:');
        result.intents.forEach((intent, index) => {
          console.log(`  ${index + 1}. ${intent.type} (${(intent.confidence * 100).toFixed(1)}% confidence, priority: ${intent.priority})`);
          
          if (Object.keys(intent.parameters).length > 0) {
            console.log(`     Parameters:`, intent.parameters);
          }
        });
      }

      if (result.references.length > 0) {
        console.log('References:');
        result.references.forEach((ref, index) => {
          console.log(`  ${index + 1}. "${ref.text}" (${ref.type}) -> ${ref.resolvedTo || 'unresolved'}`);
        });
      }

      // Show multi-intent detection
      const hasMultiple = nluEngine.hasMultipleIntents(example.text);
      if (hasMultiple) {
        console.log('🔄 Multiple intents detected in this message');
      }

    } catch (error) {
      console.log(`❌ Error parsing: ${error}`);
    }

    console.log('─'.repeat(60));
  }

  // Demonstrate intent statistics
  console.log('\n📊 Intent Statistics Demo');
  const complexText = 'Remember my name is John, help me adopt a bot, and set your mood to excited';
  const stats = await nluEngine.getIntentStatistics(complexText, context);
  
  console.log(`Text: "${complexText}"`);
  console.log(`Total Intents Found: ${stats.totalIntents}`);
  console.log(`Has Multiple Intents: ${stats.hasMultiple}`);
  console.log(`Top Intent: ${stats.topIntent?.type} (${(stats.topIntent?.confidence || 0 * 100).toFixed(1)}%)`);
  console.log('All Intents:', stats.allIntents.map(i => `${i.type}(${(i.confidence * 100).toFixed(1)}%)`).join(', '));

  console.log('\n✅ Demo completed!');
}

// Run demo if this file is executed directly
if (require.main === module) {
  runIntentParsingDemo().catch(console.error);
}