import type { ToolCall } from '@botbot/shared';

export class ToolExecutor {
  private handlers: Map<string, (args: any) => Promise<any>>;

  constructor() {
    this.handlers = new Map();
  }

  // Register a tool handler
  register(name: string, handler: (args: any) => Promise<any>): void {
    this.handlers.set(name, handler);
  }

  // Execute a tool call
  async execute(toolCall: ToolCall): Promise<any> {
    const { name, arguments: argsJson } = toolCall.function;

    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`Tool not found: ${name}`);
    }

    try {
      const args = JSON.parse(argsJson);
      return await handler(args);
    } catch (error) {
      console.error(`Tool execution failed: ${name}`, error);
      throw error;
    }
  }

  // Execute multiple tool calls
  async executeAll(toolCalls: ToolCall[]): Promise<any[]> {
    return Promise.all(toolCalls.map((tc) => this.execute(tc)));
  }
}
