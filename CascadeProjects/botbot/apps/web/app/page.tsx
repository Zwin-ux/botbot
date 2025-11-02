import Link from 'next/link';
import { Sparkles, MessageCircle, Brain, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome to BotBot
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Your AI Companions in a Persistent Memory Garden
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/garden"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Enter Garden
            </Link>
            <a
              href="#features"
              className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <FeatureCard
            icon={<Sparkles className="w-12 h-12 text-purple-600" />}
            title="Adopt AI Agents"
            description="Create unique AI companions with distinct personalities and traits"
          />
          <FeatureCard
            icon={<Brain className="w-12 h-12 text-blue-600" />}
            title="Persistent Memory"
            description="Your agents remember conversations and build relationships over time"
          />
          <FeatureCard
            icon={<MessageCircle className="w-12 h-12 text-pink-600" />}
            title="Chat Anywhere"
            description="Interact with your agents on Discord and the web seamlessly"
          />
          <FeatureCard
            icon={<Zap className="w-12 h-12 text-yellow-600" />}
            title="Natural Language"
            description="No commands to memorize - just talk naturally with your agents"
          />
        </div>

        {/* Getting Started */}
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Getting Started</h2>
          <div className="space-y-4">
            <Step
              number={1}
              title="Adopt an Agent"
              description="On Discord: @BotBot adopt a curious scientist named Atlas"
            />
            <Step
              number={2}
              title="Start Chatting"
              description="Talk naturally: Hey Atlas, how are you?"
            />
            <Step
              number={3}
              title="Build Memories"
              description="Share details and watch your agent remember them"
            />
            <Step
              number={4}
              title="Visit the Garden"
              description="Manage agents and memories from this web interface"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-600">
          <p>Built with Next.js, Discord.js, and OpenAI</p>
          <p className="text-sm mt-2">Powered by persistent vector memory and natural language understanding</p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}
