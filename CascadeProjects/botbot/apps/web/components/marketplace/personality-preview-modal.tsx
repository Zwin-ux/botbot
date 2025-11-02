'use client';

import { useState, useEffect } from 'react';
import { X, Star, Download, Users, Verified, MessageCircle, ExternalLink } from 'lucide-react';
import { PersonalityCardData } from './personality-card';
import { PreviewChat } from './preview-chat';

interface PersonalityPreviewModalProps {
  personality: PersonalityCardData | null;
  isOpen: boolean;
  onClose: () => void;
  onDeploy?: (personality: PersonalityCardData) => void;
}

type TabType = 'overview' | 'chat' | 'samples';

export function PersonalityPreviewModal({ 
  personality, 
  isOpen, 
  onClose, 
  onDeploy 
}: PersonalityPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [personalityDetails, setPersonalityDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && personality) {
      fetchPersonalityDetails();
      setActiveTab('overview');
    }
  }, [isOpen, personality]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const fetchPersonalityDetails = async () => {
    if (!personality) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/marketplace/personalities/${personality.id}`);
      if (response.ok) {
        const data = await response.json();
        setPersonalityDetails(data);
      }
    } catch (error) {
      console.error('Error fetching personality details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = () => {
    if (personality && onDeploy) {
      onDeploy(personality);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !personality) return null;

  const sampleConversations = [
    {
      user: "Hi there! How are you doing today?",
      assistant: "Hello! I'm doing wonderfully, thank you for asking! I'm always excited to meet new people and learn about their interests. What brings you here today?",
    },
    {
      user: "Can you help me understand quantum physics?",
      assistant: "Absolutely! Quantum physics is fascinating. Think of it like this: imagine if you could be in multiple places at once until someone looked for you - that's similar to how particles behave at the quantum level. What specific aspect would you like to explore?",
    },
    {
      user: "What's your favorite thing to talk about?",
      assistant: "I love discussing the intersection of science and everyday life! There's something magical about explaining how the universe works in ways that make people go 'wow, I never thought of it that way!' What topics spark your curiosity?",
    },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-3xl">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{personality.name}</h2>
                {personality.isVerified && (
                  <Verified className="w-5 h-5 text-blue-500" />
                )}
              </div>
              <p className="text-gray-600">by {personality.creator.username || 'Anonymous'}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">
                    {personality.averageRating > 0 ? personality.averageRating.toFixed(1) : 'N/A'}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({personality.ratingCount})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Download className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">{personality.downloadCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">{personality.deploymentCount}</span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'chat'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Live Chat
          </button>
          <button
            onClick={() => setActiveTab('samples')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'samples'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Sample Conversations
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && (
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{personality.description}</p>
                </div>

                {/* Category and Tags */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Category & Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                      {personality.category}
                    </span>
                    {personality.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Personality Traits */}
                {personalityDetails?.traits && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Personality Traits</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(personalityDetails.traits).map(([trait, value]) => (
                        <div key={trait} className="flex justify-between items-center">
                          <span className="text-gray-700 capitalize">{trait.replace('_', ' ')}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${(value as number) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-500 w-8">
                              {Math.round((value as number) * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Compatibility */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Compatibility</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 text-sm">
                      ✅ Compatible with Discord servers<br />
                      ✅ Supports natural language conversations<br />
                      ✅ Memory-enabled interactions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="h-[60vh]">
              <PreviewChat
                personalityId={personality.id}
                personalityName={personality.name}
                onClose={onClose}
              />
            </div>
          )}

          {activeTab === 'samples' && (
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Sample Conversations</h3>
                  <p className="text-gray-600 mb-6">
                    Here are some example interactions to give you a sense of this personality's conversation style:
                  </p>
                </div>

                {sampleConversations.map((conversation, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-medium">U</span>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 flex-1">
                        <p className="text-gray-800 text-sm">{conversation.user}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
                        🤖
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 flex-1">
                        <p className="text-gray-800 text-sm">{conversation.assistant}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            {personality.price && (
              <div className="text-2xl font-bold text-green-600">
                ${personality.price}
              </div>
            )}
            <div className="text-sm text-gray-600">
              Created {new Date(personality.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleDeploy}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Deploy to Discord
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}