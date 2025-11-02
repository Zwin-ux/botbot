import type { LLMClient } from '../llm/client';

export class ContentModerator {
  private blocklist: Set<string>;

  constructor(private llm: LLMClient, blocklist: string[] = []) {
    this.blocklist = new Set(blocklist.map((w) => w.toLowerCase()));
  }

  async moderate(content: string): Promise<{ safe: boolean; reason?: string }> {
    // 1. Check blocklist
    const lowerContent = content.toLowerCase();
    for (const word of this.blocklist) {
      if (lowerContent.includes(word)) {
        return {
          safe: false,
          reason: 'Contains blocked content',
        };
      }
    }

    // 2. Use OpenAI moderation API
    const flagged = await this.llm.moderate(content);

    if (flagged) {
      return {
        safe: false,
        reason: 'Flagged by moderation service',
      };
    }

    return { safe: true };
  }

  addToBlocklist(words: string[]): void {
    for (const word of words) {
      this.blocklist.add(word.toLowerCase());
    }
  }

  removeFromBlocklist(words: string[]): void {
    for (const word of words) {
      this.blocklist.delete(word.toLowerCase());
    }
  }
}
