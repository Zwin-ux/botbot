/**
 * LLM Abstraction Layer Types
 * Provider-agnostic interfaces for LLM interactions
 */

/**
 * Message role in a conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * A single message in a completion request
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * Request for LLM completion
 */
export interface CompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * Reason for completion termination
 */
export type FinishReason = 'stop' | 'length' | 'tool_call';

/**
 * Token usage statistics
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

/**
 * Response from LLM completion
 */
export interface CompletionResponse {
  content: string;
  usage: TokenUsage;
  finishReason: FinishReason;
}

/**
 * LLM Provider Interface
 * All LLM providers must implement this interface
 */
export interface LLMProvider {
  /** Unique identifier for this provider */
  providerId: string;

  /** Generate a completion for the given request */
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}

/**
 * LLM Abstraction Interface
 * High-level interface for LLM operations
 */
export interface LLMAbstraction {
  /** Get the current active provider */
  getProvider(): LLMProvider;

  /** Generate a completion using the active provider */
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}

/**
 * LLM Error with provider context
 */
export interface LLMError {
  code: string;
  message: string;
  providerId: string;
  originalError?: unknown;
}
