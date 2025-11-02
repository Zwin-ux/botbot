'use client';
import { Sparkles, MessageCircle, Brain } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  persona: string;
  instances: Array<{
    mood: unknown;
    energy: number;
    updatedAt: Date;
  }>;
  _count: {
    memories: number;
    conversations: number;
  };
}

export function AgentGrid({ agents }: { agents: Agent[] }) {
  if (agents.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-xl">
        <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Agents Yet</h2>
        <p className="text-gray-600 mb-6">
          Adopt your first AI companion on Discord!
        </p>
        <code className="bg-gray-100 px-4 py-2 rounded text-sm">
          @BotBot adopt a curious scientist named Atlas
        </code>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const instance = agent.instances[0];
  const energy = instance?.energy ?? 100;
  const mood = (instance?.mood as { valence: number; arousal: number } | null) ?? { valence: 0.5, arousal: 0.5 };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all cursor-pointer group">
      {/* Avatar */}
      <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform animate-bounce-subtle">
        🤖
      </div>

      {/* Name & Persona */}
      <h3 className="text-2xl font-bold text-center mb-2">{agent.name}</h3>
      <p className="text-gray-600 text-center mb-4 text-sm">{agent.persona}</p>

      {/* Stats */}
      <div className="space-y-2 mb-4">
        <StatBar
          icon={<Brain className="w-4 h-4" />}
          label="Memories"
          value={agent._count.memories}
        />
        <StatBar
          icon={<MessageCircle className="w-4 h-4" />}
          label="Conversations"
          value={agent._count.conversations}
        />
      </div>

      {/* Energy Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Energy</span>
          <span className="font-semibold">{energy}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all"
            style={{ width: `${energy}%` }}
          />
        </div>
      </div>

      {/* Mood */}
      <div className="text-center text-sm text-gray-600">
        Mood: {describeMood(mood)}
      </div>
    </div>
  );
}

function StatBar({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-gray-600">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function describeMood(mood: { valence: number; arousal: number }): string {
  const { valence, arousal } = mood;

  if (valence > 0.6 && arousal > 0.6) return '😊 Happy & Energized';
  if (valence > 0.6) return '😌 Content';
  if (arousal > 0.6) return '😤 Energetic';
  if (valence < -0.4) return '😔 Down';
  return '😐 Neutral';
}
