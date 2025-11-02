import OpenAI from 'openai';
import type { LLMMessage, LLMResponse, ToolDefinition } from '@botbot/shared';
import { retry, estimateTokens } from '@botbot/shared';

export class LLMClient {
  private client: OpenAI;
  private model: string;
  private embeddingModel: string;

  constructor(apiKey: string, model?: string, embeddingModel?: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model || 'gpt-4-turbo-preview';
    this.embeddingModel = embeddingModel || 'text-embedding-3-large';
  }

  // Generate chat completion
  async chat(
    messages: LLMMessage[],
    options?: {
      tools?: ToolDefinition[];
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<LLMResponse> {
    return retry(async () => {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as any,
        tools: options?.tools?.map((t) => ({ type: 'function', function: t })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
        stream: options?.stream ?? false,
      });

      const choice = completion.choices[0];
      const content = choice.message.content || '';
      const toolCalls = choice.message.tool_calls;

      return {
        content,
        tokens: {
          prompt: completion.usage?.prompt_tokens || 0,
          completion: completion.usage?.completion_tokens || 0,
          total: completion.usage?.total_tokens || 0,
        },
        toolCalls: toolCalls?.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      };
    });
  }

  // Stream chat completion
  async *chatStream(
    messages: LLMMessage[],
    options?: {
      tools?: ToolDefinition[];
      temperature?: number;
      maxTokens?: number;
    }
  ): AsyncGenerator<string, void, unknown> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: messages as any,
      tools: options?.tools?.map((t) => ({ type: 'function', function: t })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1000,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  // Extract structured memory candidates
  async extractMemories(conversation: LLMMessage[]): Promise<any[]> {
    const extractionPrompt: LLMMessage = {
      role: 'system',
      content: `Extract stable facts or preferences from the conversation.
Return a JSON object with a "memories" array containing items with:
- type: "FACT" | "PREFERENCE" | "EVENT" | "EMOTION"
- subject: what/who the memory is about
- content: the memory content
- confidence: 0-1 score
- expiryHint: optional, like "1 week", "1 month", or "never"

Only include items worth remembering a month from now. Be selective.`,
    };

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [extractionPrompt, ...conversation] as any,
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    try {
      const parsed = JSON.parse(response.choices[0].message.content || '{"memories":[]}');
      return parsed.memories || [];
    } catch {
      return [];
    }
  }

  // Generate embeddings
  async embed(text: string): Promise<number[]> {
    return retry(async () => {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    });
  }

  // Batch embed multiple texts
  async embedBatch(texts: string[]): Promise<number[][]> {
    return retry(async () => {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: texts,
        encoding_format: 'float',
      });

      return response.data.map((d) => d.embedding);
    });
  }

  // Moderate content
  async moderate(content: string): Promise<boolean> {
    try {
      const response = await this.client.moderations.create({
        input: content,
      });

      const result = response.results[0];
      return result.flagged;
    } catch {
      return false;
    }
  }
}
