import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export Prisma types
export * from '@prisma/client';

// Helper function for vector similarity search
export async function searchMemoriesByEmbedding(
  agentId: string,
  embedding: number[],
  limit: number = 5,
  userId?: string
) {
  const userFilter = userId ? `AND user_id = '${userId}'` : '';

  const memories = await prisma.$queryRaw`
    SELECT
      id,
      agent_id,
      user_id,
      kind,
      content,
      salience,
      last_accessed_at,
      expires_at,
      metadata,
      created_at,
      1 - (embedding <=> ${embedding}::vector) as similarity
    FROM memories
    WHERE agent_id = ${agentId}
      ${userFilter ? prisma.$queryRawUnsafe(userFilter) : prisma.$queryRawUnsafe('')}
      AND (expires_at IS NULL OR expires_at > NOW())
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${embedding}::vector
    LIMIT ${limit}
  `;

  return memories;
}

// Update memory salience and last accessed time
export async function touchMemory(memoryId: string) {
  return prisma.memory.update({
    where: { id: memoryId },
    data: {
      lastAccessedAt: new Date(),
      salience: {
        increment: 0.1,
      },
    },
  });
}

// Decay memory salience over time (for batch jobs)
export async function decayMemories(agentId: string, decayFactor: number = 0.95) {
  return prisma.$executeRaw`
    UPDATE memories
    SET salience = salience * ${decayFactor}
    WHERE agent_id = ${agentId}
      AND salience > 0.1
  `;
}
