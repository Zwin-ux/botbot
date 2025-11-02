'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { PersonalityCard, PersonalityCardData } from './personality-card';

interface PersonalityGridProps {
  personalities: PersonalityCardData[];
  loading?: boolean;
  error?: string | null;
  onPreview?: (personality: PersonalityCardData) => void;
  onDeploy?: (personality: PersonalityCardData) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

export function PersonalityGrid({
  personalities,
  loading = false,
  error = null,
  onPreview,
  onDeploy,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
}: PersonalityGridProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <PersonalityGridSkeleton />;
  }

  if (loading && personalities.length === 0) {
    return <PersonalityGridSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-12 text-center shadow-lg">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2 text-gray-900">Error Loading Personalities</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (personalities.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center shadow-lg">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          🤖
        </div>
        <h2 className="text-2xl font-semibold mb-2 text-gray-900">No Personalities Found</h2>
        <p className="text-gray-600 mb-6">
          Try adjusting your search filters or check back later for new personalities.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {personalities.map((personality) => (
          <PersonalityCard
            key={personality.id}
            personality={personality}
            onPreview={onPreview}
            onDeploy={onDeploy}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading More...
              </>
            ) : (
              'Load More Personalities'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function PersonalityGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-6 shadow-lg animate-pulse">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            </div>
            <div className="h-6 bg-gray-200 rounded-full w-16" />
          </div>

          {/* Description */}
          <div className="space-y-2 mb-4">
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>

          {/* Tags */}
          <div className="flex gap-1 mb-4">
            <div className="h-5 bg-gray-200 rounded-full w-12" />
            <div className="h-5 bg-gray-200 rounded-full w-16" />
            <div className="h-5 bg-gray-200 rounded-full w-14" />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="h-4 bg-gray-200 rounded w-12" />
              <div className="h-4 bg-gray-200 rounded w-8" />
              <div className="h-4 bg-gray-200 rounded w-8" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <div className="flex-1 h-8 bg-gray-200 rounded-lg" />
            <div className="flex-1 h-8 bg-gray-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}