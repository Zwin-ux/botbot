// Agent runtime types
export interface AgentContext {
  agentId: string;
  userId: string;
  conversationId: string;
  agent: AgentData;
  history: MessageData[];
  memories: MemoryData[];
  state: AgentState;
}

export interface AgentData {
  id: string;
  name: string;
  persona: string;
  systemPrompt: string;
  traits: Record<string, any>;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
}

export interface AgentState {
  mood: {
    valence: number; // -1 to 1 (negative to positive)
    arousal: number; // 0 to 1 (calm to excited)
    dominance: number; // 0 to 1 (submissive to dominant)
  };
  energy: number; // 0 to 100
  environment: Record<string, any>;
}

export interface MessageData {
  id: string;
  sender: 'USER' | 'AGENT' | 'SYSTEM';
  content: string;
  tokens?: number;
  createdAt: Date;
}

export interface MemoryData {
  id: string;
  kind: 'FACT' | 'PREFERENCE' | 'EVENT' | 'EMOTION';
  content: string;
  salience: number;
  similarity?: number;
  createdAt: Date;
  lastAccessedAt: Date;
}

// Memory extraction types
export interface MemoryCandidate {
  type: 'FACT' | 'PREFERENCE' | 'EVENT' | 'EMOTION';
  subject: string;
  content: string;
  confidence: number;
  expiryHint?: string; // e.g., "1 week", "1 month", "never"
}

// LLM types
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMResponse {
  content: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  toolCalls?: ToolCall[];
  memoryCandidates?: MemoryCandidate[];
}

// Tool types
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

// Discord types
export interface DiscordMessage {
  id: string;
  channelId: string;
  guildId?: string;
  authorId: string;
  content: string;
  mentions: string[];
  isBot: boolean;
  timestamp: Date;
}

// Natural language intent types
export interface ParsedIntent {
  type: 'ADOPT' | 'CHAT' | 'REMEMBER' | 'RECALL' | 'MOOD' | 'HELP' | 'GARDEN' | 'UNKNOWN';
  params: Record<string, any>;
  confidence: number;
}

// Rate limiting types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}
