import { prisma, searchMemoriesByEmbedding, touchMemory } from '@botbot/db';
import type { MemoryData, MemoryCandidate } from '@botbot/shared';
import { MEMORY_TOP_K, MEMORY_SIMILARITY_THRESHOLD } from '@botbot/shared';
import type { LLMClient } from '../llm/client';

export class MemoryManager {
  constructor(private llm: LLMClient) {}

  // Retrieve relevant memories via vector search
  async retrieve(
    agentId: string,
    query: string,
    userId?: string,
    limit: number = MEMORY_TOP_K
  ): Promise<MemoryData[]> {
    // Generate embedding for query
    const embedding = await this.llm.embed(query);

    // Search for similar memories
    const results = await searchMemoriesByEmbedding(agentId, embedding, limit, userId);

    // Filter by similarity threshold and update access time
    const memories: MemoryData[] = [];

    for (const result of results as any[]) {
      if (result.similarity >= MEMORY_SIMILARITY_THRESHOLD) {
        memories.push({
          id: result.id,
          kind: result.kind,
          content: result.content,
          salience: result.salience,
          similarity: result.similarity,
          createdAt: result.created_at,
          lastAccessedAt: result.last_accessed_at,
        });

        // Touch memory to update salience and access time
        await touchMemory(result.id);
      }
    }

    return memories;
  }

  // Store new memories from candidates
  async store(agentId: string, candidates: MemoryCandidate[], userId?: string): Promise<void> {
    for (const candidate of candidates) {
      // Skip low-confidence memories
      if (candidate.confidence < 0.6) {
        continue;
      }

      // Generate embedding
      const embedding = await this.llm.embed(candidate.content);

      // Calculate expiry date if hint provided
      let expiresAt: Date | null = null;
      if (candidate.expiryHint) {
        expiresAt = this.parseExpiryHint(candidate.expiryHint);
      }

      // Store memory
      await prisma.memory.create({
        data: {
          agentId,
          userId,
          kind: candidate.type,
          content: candidate.content,
          embedding: embedding as any,
          salience: candidate.confidence,
          expiresAt,
          metadata: {
            subject: candidate.subject,
          },
        },
      });
    }
  }

  // Extract memories from conversation
  async extractFromConversation(
    agentId: string,
    userId: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<void> {
    // Use LLM to extract memory candidates
    const candidates = await this.llm.extractMemories(
      messages.map((m) => ({ role: m.role, content: m.content }))
    );

    // Store extracted memories
    await this.store(agentId, candidates, userId);
  }

  // Get recent memories for an agent-user pair
  async getRecent(agentId: string, userId?: string, limit: number = 10): Promise<MemoryData[]> {
    const whereClause: any = {
      agentId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };

    if (userId) {
      whereClause.userId = userId;
    }

    const memories = await prisma.memory.findMany({
      where: whereClause,
      orderBy: [{ salience: 'desc' }, { lastAccessedAt: 'desc' }],
      take: limit,
    });

    return memories.map((m) => ({
      id: m.id,
      kind: m.kind as any,
      content: m.content,
      salience: m.salience,
      createdAt: m.createdAt,
      lastAccessedAt: m.lastAccessedAt,
    }));
  }

  // Delete a memory
  async delete(memoryId: string): Promise<void> {
    await prisma.memory.delete({
      where: { id: memoryId },
    });
  }

  // Parse expiry hint into Date
  private parseExpiryHint(hint: string): Date | null {
    const now = new Date();
    const lower = hint.toLowerCase();

    if (lower.includes('never')) {
      return null;
    }

    if (lower.includes('hour')) {
      const hours = parseInt(lower) || 1;
      return new Date(now.getTime() + hours * 60 * 60 * 1000);
    }

    if (lower.includes('day')) {
      const days = parseInt(lower) || 1;
      return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }

    if (lower.includes('week')) {
      const weeks = parseInt(lower) || 1;
      return new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
    }

    if (lower.includes('month')) {
      const months = parseInt(lower) || 1;
      now.setMonth(now.getMonth() + months);
      return now;
    }

    // Default: 30 days
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
}
