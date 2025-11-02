'use client';

import { useState, useEffect } from 'react';
import { Button } from '@botbot/ui';
import { ChevronDown, Server, Crown, Settings } from 'lucide-react';

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  isOwner: boolean;
  canManage: boolean;
}

interface ServerSelectorProps {
  onServerSelect: (serverId: string, serverName: string) => void;
  selectedServerId?: string;
  disabled?: boolean;
}

export function ServerSelector({
  onServerSelect,
  selectedServerId,
  disabled = false,
}: ServerSelectorProps) {
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchGuilds();
  }, []);

  const fetchGuilds = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/discord/guilds');
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please connect your Discord account first');
        }
        throw new Error('Failed to fetch Discord servers');
      }

      const data = await response.json();
      setGuilds(data.guilds || []);
    } catch (err) {
      console.error('Error fetching guilds:', err);
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedGuild = guilds.find(guild => guild.id === selectedServerId);

  if (isLoading) {
    return (
      <div className="w-full p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse" />
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded animate-pulse mb-2" />
            <div className="h-3 bg-gray-300 rounded animate-pulse w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 border border-red-200 rounded-lg bg-red-50">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <Server className="w-4 h-4" />
          <span className="font-medium">Error loading servers</span>
        </div>
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <Button
          onClick={fetchGuilds}
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (guilds.length === 0) {
    return (
      <div className="w-full p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div className="text-center">
          <Server className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">
            No manageable servers found
          </p>
          <p className="text-xs text-gray-500">
            You need "Manage Server" permissions to deploy personalities
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full p-4 border rounded-lg text-left transition-colors ${
          disabled
            ? 'bg-gray-50 border-gray-200 cursor-not-allowed'
            : 'bg-white border-gray-200 hover:border-gray-300 cursor-pointer'
        }`}
      >
        {selectedGuild ? (
          <div className="flex items-center gap-3">
            <GuildIcon guild={selectedGuild} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 truncate">
                  {selectedGuild.name}
                </span>
                {selectedGuild.isOwner && (
                  <Crown className="w-4 h-4 text-yellow-500" />
                )}
                {!selectedGuild.isOwner && selectedGuild.canManage && (
                  <Settings className="w-4 h-4 text-blue-500" />
                )}
              </div>
              <p className="text-sm text-gray-500">
                {selectedGuild.isOwner ? 'Owner' : 'Manager'}
              </p>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <Server className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1">
              <span className="text-gray-500">Select a Discord server</span>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
          {guilds.map((guild) => (
            <button
              key={guild.id}
              onClick={() => {
                onServerSelect(guild.id, guild.name);
                setIsOpen(false);
              }}
              className="w-full p-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              <div className="flex items-center gap-3">
                <GuildIcon guild={guild} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">
                      {guild.name}
                    </span>
                    {guild.isOwner && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                    {!guild.isOwner && guild.canManage && (
                      <Settings className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {guild.isOwner ? 'Owner' : 'Manager'}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GuildIcon({ guild }: { guild: DiscordGuild }) {
  if (guild.icon) {
    return (
      <img
        src={guild.icon}
        alt={`${guild.name} icon`}
        className="w-8 h-8 rounded-full"
      />
    );
  }

  // Generate a color based on guild name for consistency
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  const colorIndex = guild.name.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm ${bgColor}`}
    >
      {guild.name.charAt(0).toUpperCase()}
    </div>
  );
}