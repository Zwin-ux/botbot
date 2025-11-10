import { EncounterSpec, PlayerContext, Reward } from '@ai-encounters/core';
import { validateEncounterSpec } from '@ai-encounters/validators';
import { LLMProxyConfig } from './config.js';
import { withRetry, DEFAULT_RETRY_OPTIONS } from './retry.js';
import { CircuitBreaker, DEFAULT_CIRCUIT_BREAKER_OPTIONS } from './circuitBreaker.js';

export interface GenerateEncounterRequest {
  playerContext?: PlayerContext;
  difficulty?: 'easy' | 'medium' | 'hard';
  difficultyLevel?: number; // Numeric difficulty from 0.1 to 1.0 for dynamic adjustment
  theme?: string;
}

export interface GenerateRewardRequest {
  encounterId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  completionTime?: number;
}

export class OpenAIClient {
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private apiEndpoint = 'https://api.openai.com/v1/chat/completions';
  private circuitBreaker: CircuitBreaker;

  constructor(config: LLMProxyConfig) {
    this.apiKey = config.llmApiKey;
    this.model = config.llmModel;
    this.temperature = config.llmTemperature;
    this.maxTokens = config.llmMaxOutputTokens;
    this.circuitBreaker = new CircuitBreaker(
      DEFAULT_CIRCUIT_BREAKER_OPTIONS,
      (message) => console.log(`[CircuitBreaker] ${message}`)
    );
  }

  async generateEncounter(request: GenerateEncounterRequest): Promise<EncounterSpec> {
    const systemPrompt = this.buildEncounterSystemPrompt();
    const userPrompt = this.buildEncounterUserPrompt(request);

    try {
      console.log('[OpenAI] Generating encounter...');
      
      // Use circuit breaker to protect against repeated failures
      const response = await this.circuitBreaker.execute(async () => {
        // Use retry logic with exponential backoff
        return await withRetry(
          async () => {
            return await this.callOpenAI(systemPrompt, userPrompt);
          },
          DEFAULT_RETRY_OPTIONS,
          (message) => console.log(`[Retry] ${message}`)
        );
      });

      const encounterData = this.parseEncounterResponse(response);
      
      // Validate the generated encounter
      const validationResult = validateEncounterSpec(encounterData);
      if (!validationResult.valid) {
        const errorMsg = `Generated encounter failed validation: ${validationResult.errors.join(', ')}`;
        console.error(`[OpenAI] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      console.log('[OpenAI] Encounter generated successfully');
      return validationResult.data;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`[OpenAI] Failed to generate encounter: ${error.message}`);
        throw new Error(`Failed to generate encounter: ${error.message}`);
      }
      console.error('[OpenAI] Failed to generate encounter: Unknown error');
      throw new Error('Failed to generate encounter: Unknown error');
    }
  }

  async generateReward(request: GenerateRewardRequest): Promise<Reward[]> {
    const systemPrompt = this.buildRewardSystemPrompt();
    const userPrompt = this.buildRewardUserPrompt(request);

    try {
      console.log('[OpenAI] Generating reward...');
      
      // Use circuit breaker to protect against repeated failures
      const response = await this.circuitBreaker.execute(async () => {
        // Use retry logic with exponential backoff
        return await withRetry(
          async () => {
            return await this.callOpenAI(systemPrompt, userPrompt);
          },
          DEFAULT_RETRY_OPTIONS,
          (message) => console.log(`[Retry] ${message}`)
        );
      });

      const rewardData = this.parseRewardResponse(response);
      console.log('[OpenAI] Reward generated successfully');
      return rewardData;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`[OpenAI] Failed to generate reward: ${error.message}`);
        throw new Error(`Failed to generate reward: ${error.message}`);
      }
      console.error('[OpenAI] Failed to generate reward: Unknown error');
      throw new Error('Failed to generate reward: Unknown error');
    }
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<any> {
    const requestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      response_format: { type: 'json_object' },
    };

    console.log(`[OpenAI] Calling API with model: ${this.model}`);

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        const errorMessage = `OpenAI API error (${response.status}): ${errorData.error?.message || response.statusText}`;
        console.error(`[OpenAI] ${errorMessage}`);
        
        // Log additional error details if available
        if (errorData.error?.type) {
          console.error(`[OpenAI] Error type: ${errorData.error.type}`);
        }
        if (errorData.error?.code) {
          console.error(`[OpenAI] Error code: ${errorData.error.code}`);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const usage = (data as any).usage?.total_tokens;
      console.log(`[OpenAI] API call successful, tokens used: ${usage || 'unknown'}`);
      return data;
    } catch (error) {
      // Log network or parsing errors
      if (error instanceof Error && !error.message.includes('OpenAI API error')) {
        console.error(`[OpenAI] Network or parsing error: ${error.message}`);
      }
      throw error;
    }
  }

  private buildEncounterSystemPrompt(): string {
    return `You are an AI game master that generates dynamic mission-style encounters for games.
You must respond with ONLY valid JSON matching the EncounterSpec schema.

The EncounterSpec schema:
{
  "id": "string (format: enc_<random>)",
  "title": "string (engaging encounter title)",
  "description": "string (detailed encounter description)",
  "objectives": [
    {
      "id": "string (format: obj_<number>)",
      "description": "string (clear objective description)",
      "type": "collect | eliminate | interact | reach",
      "target": "string (optional, what to interact with)",
      "quantity": "number (optional, how many)",
      "completed": false
    }
  ],
  "npcs": [
    {
      "id": "string (format: npc_<number>)",
      "name": "string (NPC name)",
      "role": "string (NPC role like quest_giver, merchant, etc.)",
      "dialogue": [
        {
          "trigger": "string (when this dialogue appears: initial, progress, completion)",
          "text": "string (what the NPC says)"
        }
      ]
    }
  ],
  "rewards": [
    {
      "type": "currency | item | experience",
      "amount": "number",
      "itemId": "string (optional, for item rewards)"
    }
  ],
  "difficulty": "easy | medium | hard",
  "estimatedDuration": "number (minutes)"
}

Generate creative, engaging encounters with 2-4 objectives, 1-3 NPCs, and appropriate rewards.
Ensure all objectives have completed: false.
Return ONLY the JSON, no additional text.`;
  }

  private buildEncounterUserPrompt(request: GenerateEncounterRequest): string {
    const parts: string[] = [];
    
    parts.push('Generate a new encounter with the following parameters:');
    
    if (request.difficulty) {
      parts.push(`- Difficulty: ${request.difficulty}`);
    } else {
      parts.push('- Difficulty: medium');
    }
    
    // Add numeric difficulty level if provided (for dynamic difficulty adjustment)
    if (request.difficultyLevel !== undefined) {
      const difficultyPercent = Math.round(request.difficultyLevel * 100);
      parts.push(`- Difficulty level: ${request.difficultyLevel.toFixed(2)} (${difficultyPercent}% challenge)`);
      parts.push(`  Adjust encounter complexity, enemy strength, and objective difficulty accordingly.`);
    }
    
    if (request.theme) {
      parts.push(`- Theme: ${request.theme}`);
    }
    
    if (request.playerContext) {
      if (request.playerContext.level) {
        parts.push(`- Player level: ${request.playerContext.level}`);
      }
      if (request.playerContext.preferences && request.playerContext.preferences.length > 0) {
        parts.push(`- Player preferences: ${request.playerContext.preferences.join(', ')}`);
      }
      if (request.playerContext.history && request.playerContext.history.length > 0) {
        parts.push(`- Recent encounters: ${request.playerContext.history.slice(0, 3).join(', ')}`);
      }
    }
    
    return parts.join('\n');
  }

  private buildRewardSystemPrompt(): string {
    return `You are an AI game master that generates rewards for completed encounters.
You must respond with ONLY valid JSON containing an array of rewards.

The Reward schema:
{
  "rewards": [
    {
      "type": "currency | item | experience",
      "amount": "number",
      "itemId": "string (optional, for item rewards)"
    }
  ]
}

Generate 1-3 appropriate rewards based on the encounter difficulty and completion time.
Return ONLY the JSON, no additional text.`;
  }

  private buildRewardUserPrompt(request: GenerateRewardRequest): string {
    const parts: string[] = [];
    
    parts.push('Generate rewards for a completed encounter:');
    parts.push(`- Encounter ID: ${request.encounterId}`);
    parts.push(`- Difficulty: ${request.difficulty}`);
    
    if (request.completionTime) {
      parts.push(`- Completion time: ${request.completionTime} minutes`);
    }
    
    return parts.join('\n');
  }

  private parseEncounterResponse(response: any): any {
    if (!response.choices || response.choices.length === 0) {
      console.error('[OpenAI] No choices in response');
      throw new Error('No choices in OpenAI response');
    }

    const message = response.choices[0].message;
    if (!message || !message.content) {
      console.error('[OpenAI] No content in response message');
      throw new Error('No content in OpenAI response');
    }

    try {
      const encounterData = JSON.parse(message.content);
      console.log(`[OpenAI] Successfully parsed encounter response`);
      return encounterData;
    } catch (error) {
      console.error(`[OpenAI] Failed to parse response as JSON: ${error}`);
      console.error(`[OpenAI] Response content: ${message.content.substring(0, 200)}...`);
      throw new Error(`Failed to parse OpenAI response as JSON: ${error}`);
    }
  }

  private parseRewardResponse(response: any): Reward[] {
    if (!response.choices || response.choices.length === 0) {
      console.error('[OpenAI] No choices in response');
      throw new Error('No choices in OpenAI response');
    }

    const message = response.choices[0].message;
    if (!message || !message.content) {
      console.error('[OpenAI] No content in response message');
      throw new Error('No content in OpenAI response');
    }

    try {
      const data = JSON.parse(message.content);
      if (!data.rewards || !Array.isArray(data.rewards)) {
        console.error('[OpenAI] Response does not contain rewards array');
        console.error(`[OpenAI] Response content: ${message.content.substring(0, 200)}...`);
        throw new Error('Response does not contain rewards array');
      }
      console.log(`[OpenAI] Successfully parsed reward response with ${data.rewards.length} rewards`);
      return data.rewards;
    } catch (error) {
      console.error(`[OpenAI] Failed to parse reward response: ${error}`);
      throw new Error(`Failed to parse reward response: ${error}`);
    }
  }
}
