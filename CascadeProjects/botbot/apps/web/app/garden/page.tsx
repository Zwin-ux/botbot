import { prisma } from '@botbot/db';
import { AgentGrid } from '@/components/agent-grid';

// Force dynamic rendering - don't pre-render at build time
export const dynamic = 'force-dynamic';

// Mock user ID for MVP - replace with NextAuth session
const MOCK_USER_ID = 'demo-user';

export default async function GardenPage() {
  // Ensure demo user exists
  await prisma.user.upsert({
    where: { id: MOCK_USER_ID },
    update: {},
    create: {
      id: MOCK_USER_ID,
      discordId: 'demo-discord-id',
      username: 'Demo User',
    },
  });

  // Fetch user's agents
  const agents = await prisma.agent.findMany({
    where: {
      ownerUserId: MOCK_USER_ID,
      status: 'ACTIVE',
    },
    include: {
      _count: {
        select: {
          memories: true,
          conversations: true,
        },
      },
      instances: {
        orderBy: {
          updatedAt: 'desc',
        },
        take: 1,
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🌸 Your Chao Garden 🌸</h1>
          <p className="text-gray-600">Manage your AI companions</p>
        </div>

        <AgentGrid agents={agents} />
      </div>
    </div>
  );
}
