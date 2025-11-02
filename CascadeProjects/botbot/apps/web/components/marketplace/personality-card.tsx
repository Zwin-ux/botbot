'use client';

import { Star, Download, Users, Verified } from 'lucide-react';
import { useState } from 'react';

export interface PersonalityCardData {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  isVerified: boolean;
  price?: number;
  downloadCount: number;
  averageRating: number;
  ratingCount: number;
  deploymentCount: number;
  createdAt: string;
  creator: {
    id: string;
    username: string | null;
    avatar: string | null;
  };
}

interface PersonalityCardProps {
  personality: PersonalityCardData;
  onPreview?: (personality: PersonalityCardData) => void;
  onDeploy?: (personality: PersonalityCardData) => void;
}

export function PersonalityCard({ personality, onPreview, onDeploy }: PersonalityCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = () => {
    onPreview?.(personality);
  };

  const handleDeployClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeploy?.(personality);
  };

  return (
    <div
      className={`bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group ${
        isHovered ? 'scale-105' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Header with Avatar and Verification */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900">{personality.name}</h3>
              {personality.isVerified && (
                <Verified className="w-4 h-4 text-blue-500" />
              )}
            </div>
            <p className="text-sm text-gray-500">by {personality.creator.username || 'Anonymous'}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
            {personality.category}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
        {personality.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {personality.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
          >
            {tag}
          </span>
        ))}
        {personality.tags.length > 3 && (
          <span className="text-xs text-gray-400">
            +{personality.tags.length - 3} more
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {/* Rating */}
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="text-sm font-medium">
              {personality.averageRating > 0 ? personality.averageRating.toFixed(1) : 'N/A'}
            </span>
            <span className="text-xs text-gray-500">
              ({personality.ratingCount})
            </span>
          </div>

          {/* Downloads */}
          <div className="flex items-center gap-1">
            <Download className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">{personality.downloadCount}</span>
          </div>

          {/* Deployments */}
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">{personality.deploymentCount}</span>
          </div>
        </div>

        {/* Price */}
        {personality.price && (
          <div className="text-lg font-bold text-green-600">
            ${personality.price}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleCardClick}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors text-sm font-medium"
        >
          Preview
        </button>
        <button
          onClick={handleDeployClick}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
        >
          Deploy
        </button>
      </div>
    </div>
  );
}