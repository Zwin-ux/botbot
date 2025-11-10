import { EncounterSpec, Reward } from '@ai-encounters/core';
import { validateEncounterSpec } from '@ai-encounters/validators';
import { GenerateEncounterRequest, GenerateRewardRequest } from '../openai.js';
import { withRetry, DEFAULT_RETRY_OPTIONS } from '../retry.js';
import { CircuitBreaker, DEFAULT_CIRCUIT_BREAKER_OPTIONS } from '../circuitBreaker.js';
import { BaseProvider } from './BaseProvider.js';
import { ProviderConfig, ProviderHealth } from './types.js';

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends BaseProvider {
  private apiEndpoint = 'https://api.openai.com/v1/chat/completions';
  private circuitBreaker: CircuitBreaker;

  constructor(config: ProviderConfig) {
    super('OpenAI', config);
    this.circuitBreaker = new CircuitBreaker(
      DEFAULT_CIRCUIT_BREAKER_OPTIONS,
      (message) => this.log(message)
    );
  }

  async initialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.log('Initialized');
  }

  async generateEncounter(request: GenerateEncounterRequest): Promise<EncounterSpec> {
    const systemPrompt = this.buildEncounterSystemPrompt();
    const userPrompt = this.buildEncounterUserPrompt(request);
    const costEstimate = this.estimateCost(request);

    return this.executeWithMetrics(async () => {
      this.log('Generating encounter...');

      // Use circuit breaker to protect against repeated failures
      const response = await this.circuitBreaker.execute(async () => {
        // Use retry logic with exponential backoff
        return await withRetry(
          async () => {
            return await this.callOpenAI(systemPrompt, userPrompt);
          },
          DEFAULT_RETRY_OPTIONS,
          (message) => this.log(message)
        );
      });

      const encounterData = this.parseEncounterResponse(response);

      // Validate the generated encounter
      const validationResult = validateEncounterSpec(encounterData);
      if (!validationResult.valid) {
        const errorMsg = `Generated encounter failed validation: ${validationResult.errors.join(', ')}`;
        this.log(errorMsg, 'error');
        throw new Error(errorMsg);
      }

      this.log('Encounter generated successfully');
      return validationResult.data;
    }, costEstimate);
  }

  async generateReward(request: GenerateRewardRequest): Promise<Reward[]> {
    const systemPrompt = this.buildRewardSystemPrompt();
    const userPrompt = this.buildRewardUserPrompt(request);
    const costEstimate = this.estimateCost(request);

    return this.executeWithMetrics(async () => {
      this.log('Generating reward...');

      // Use circuit breaker to protect against repeated failures
      const response = await this.circuitBreaker.execute(async () => {
        // Use retry logic with exponential backoff
        return await withRetry(
          async () => {
            return await this.callOpenAI(systemPrompt, userPrompt);
          },
          DEFAULT_RETRY_OPTIONS,
          (message) => this.log(message)
        );
      });

      const rewardData = this.parseRewardResponse(response);
      this.log('Reward generated successfully');
      return rewardData;
    }, costEstimate);
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      // Simple health check - test API connectivity
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        return {
          available: true,
          latency,
          lastChecked: new Date().toISOString(),
        };
      } else {
        return {
          available: false,
          error: `API returned status ${response.status}`,
          lastChecked: new Date().toISOString(),
        };
      }
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  estimateCost(request: GenerateEncounterRequest | GenerateRewardRequest): number {
    // OpenAI pricing (approximate, per 1M tokens)
    // gpt-4o-mini: $0.15 input, $0.60 output
    // gpt-4o: $2.50 input, $10.00 output

    const model = this.config.model;
    let inputCostPer1M = 0.15;
    let outputCostPer1M = 0.60;

    if (model.includes('gpt-4o') && !model.includes('mini')) {
      inputCostPer1M = 2.50;
      outputCostPer1M = 10.00;
    } else if (model.includes('gpt-4-turbo')) {
      inputCostPer1M = 10.00;
      outputCostPer1M = 30.00;
    } else if (model.includes('gpt-3.5-turbo')) {
      inputCostPer1M = 0.50;
      outputCostPer1M = 1.50;
    }

    // Estimate token usage
    const estimatedInputTokens = 500; // System + user prompts
    const estimatedOutputTokens = this.config.maxTokens || 800;

    const inputCost = (estimatedInputTokens / 1_000_000) * inputCostPer1M;
    const outputCost = (estimatedOutputTokens / 1_000_000) * outputCostPer1M;

    return inputCost + outputCost;
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<any> {
    const requestBody = {
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      response_format: { type: 'json_object' },
    };

    this.log(`Calling API with model: ${this.config.model}`);

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        const errorMessage = `OpenAI API error (${response.status}): ${errorData.error?.message || response.statusText}`;
        this.log(errorMessage, 'error');

        // Log additional error details if available
        if (errorData.error?.type) {
          this.log(`Error type: ${errorData.error.type}`, 'error');
        }
        if (errorData.error?.code) {
          this.log(`Error code: ${errorData.error.code}`, 'error');
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      const usage = (data as any).usage?.total_tokens;
      this.log(`API call successful, tokens used: ${usage || 'unknown'}`);
      return data;
    } catch (error) {
      // Log network or parsing errors
      if (error instanceof Error && !error.message.includes('OpenAI API error')) {
        this.log(`Network or parsing error: ${error.message}`, 'error');
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
      this.log('No choices in response', 'error');
      throw new Error('No choices in OpenAI response');
    }

    const message = response.choices[0].message;
    if (!message || !message.content) {
      this.log('No content in response message', 'error');
      throw new Error('No content in OpenAI response');
    }

    try {
      const encounterData = JSON.parse(message.content);
      this.log('Successfully parsed encounter response');
      return encounterData;
    } catch (error) {
      this.log(`Failed to parse response as JSON: ${error}`, 'error');
      this.log(`Response content: ${message.content.substring(0, 200)}...`, 'error');
      throw new Error(`Failed to parse OpenAI response as JSON: ${error}`);
    }
  }

  private parseRewardResponse(response: any): Reward[] {
    if (!response.choices || response.choices.length === 0) {
      this.log('No choices in response', 'error');
      throw new Error('No choices in OpenAI response');
    }

    const message = response.choices[0].message;
    if (!message || !message.content) {
      this.log('No content in response message', 'error');
      throw new Error('No content in OpenAI response');
    }

    try {
      const data = JSON.parse(message.content);
      if (!data.rewards || !Array.isArray(data.rewards)) {
        this.log('Response does not contain rewards array', 'error');
        this.log(`Response content: ${message.content.substring(0, 200)}...`, 'error');
        throw new Error('Response does not contain rewards array');
      }
      this.log(`Successfully parsed reward response with ${data.rewards.length} rewards`);
      return data.rewards;
    } catch (error) {
      this.log(`Failed to parse reward response: ${error}`, 'error');
      throw new Error(`Failed to parse reward response: ${error}`);
    }
  }
}
