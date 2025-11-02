import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as guildsHandler } from '../guilds/route';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

const mockSession = {
  accessToken: 'test_access_token',
  user: {
    id: 'test_user_id',
    discordId: 'discord_user_id',
  },
};

const mockDiscordGuilds = [
  {
    id: '123456789',
    name: 'Test Server 1',
    icon: 'test_icon_hash',
    owner: true,
    permissions: '2147483647', // All permissions
    features: [],
  },
  {
    id: '987654321',
    name: 'Test Server 2',
    icon: null,
    owner: false,
    permissions: '32', // MANAGE_GUILD permission
    features: [],
  },
  {
    id: '555666777',
    name: 'Test Server 3',
    icon: null,
    owner: false,
    permissions: '8', // No MANAGE_GUILD permission
    features: [],
  },
];

describe('Discord Guilds API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and filter manageable guilds', async () => {
    const { getServerSession } = await import('next-auth');
    (getServerSession as any).mockResolvedValue(mockSession);

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDiscordGuilds),
    });

    const request = new NextRequest('http://localhost:3000/api/discord/guilds');
    const response = await guildsHandler(request);

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.guilds).toHaveLength(2); // Only servers with manage permissions
    
    expect(data.guilds[0]).toEqual({
      id: '123456789',
      name: 'Test Server 1',
      icon: 'https://cdn.discordapp.com/icons/123456789/test_icon_hash.png',
      isOwner: true,
      canManage: true,
    });

    expect(data.guilds[1]).toEqual({
      id: '987654321',
      name: 'Test Server 2',
      icon: null,
      isOwner: false,
      canManage: true,
    });
  });

  it('should return 401 when not authenticated', async () => {
    const { getServerSession } = await import('next-auth');
    (getServerSession as any).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/discord/guilds');
    const response = await guildsHandler(request);

    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBe('Not authenticated with Discord');
  });

  it('should handle Discord API errors', async () => {
    const { getServerSession } = await import('next-auth');
    (getServerSession as any).mockResolvedValue(mockSession);

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    });

    const request = new NextRequest('http://localhost:3000/api/discord/guilds');
    const response = await guildsHandler(request);

    expect(response.status).toBe(403);
    
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch Discord servers');
  });

  it('should handle network errors', async () => {
    const { getServerSession } = await import('next-auth');
    (getServerSession as any).mockResolvedValue(mockSession);

    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const request = new NextRequest('http://localhost:3000/api/discord/guilds');
    const response = await guildsHandler(request);

    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });
});