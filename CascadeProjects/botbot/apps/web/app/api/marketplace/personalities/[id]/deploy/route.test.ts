import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as deployHandler } from './route';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@botbot/db', () => ({
  prisma: {
    personalityTemplate: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    personalityDeployment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    agent: {
      create: vi.fn(),
    },
    agentInstance: {
      create: vi.fn(),
    },
  },
}));

// Mock fetch
global.fetch = vi.fn();

const mockSession = {
  user: {
    id: 'user123',
    discordId: 'discord123',
  },
  accessToken: 'test_access_token',
};

const mockTemplate = {
  id: 'template123',
  name: 'Test Personality',
  description: 'A test personality',
  persona: 'I am a helpful assistant',
  systemPrompt: 'You are a helpful assistant',
  traits: { friendly: true, helpful: true },
  isPublic: true,
  creator: { id: 'creator123' },
};

const mockGuilds = [
  {
    id: '123456789',
    name: 'Test Server',
    owner: false,
    permissions: '32', // MANAGE_GUILD permission
  },
];

describe('Personality Deployment API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully deploy a personality to Discord server', async () => {
    const { getServerSession } = await import('next-auth');
    const { prisma } = await import('@botbot/db');

    (getServerSession as any).mockResolvedValue(mockSession);
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(mockTemplate);
    (prisma.personalityDeployment.findFirst as any).mockResolvedValue(null);
    
    const mockAgent = { id: 'agent123', name: 'Test Personality' };
    const mockAgentInstance = { id: 'instance123', agentId: 'agent123' };
    const mockDeployment = {
      id: 'deployment123',
      templateId: 'template123',
      agentId: 'agent123',
      userId: 'user123',
      status: 'ACTIVE',
      createdAt: new Date(),
    };

    (prisma.agent.create as any).mockResolvedValue(mockAgent);
    (prisma.agentInstance.create as any).mockResolvedValue(mockAgentInstance);
    (prisma.personalityDeployment.create as any).mockResolvedValue(mockDeployment);
    (prisma.personalityTemplate.update as any).mockResolvedValue({});

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGuilds),
    });

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/template123/deploy', {
      method: 'POST',
      body: JSON.stringify({
        discordGuildId: '123456789',
        customizations: {
          name: 'Custom Name',
          traits: { custom: true },
        },
      }),
    });

    const response = await deployHandler(request, { params: { id: 'template123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deployment.agentId).toBe('agent123');
    expect(data.deployment.discordGuildId).toBe('123456789');
    expect(data.instructions.nextSteps).toHaveLength(4);
  });

  it('should return 401 when not authenticated', async () => {
    const { getServerSession } = await import('next-auth');
    (getServerSession as any).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/template123/deploy', {
      method: 'POST',
      body: JSON.stringify({
        discordGuildId: '123456789',
      }),
    });

    const response = await deployHandler(request, { params: { id: 'template123' } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('should return 404 when template not found', async () => {
    const { getServerSession } = await import('next-auth');
    const { prisma } = await import('@botbot/db');

    (getServerSession as any).mockResolvedValue(mockSession);
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/nonexistent/deploy', {
      method: 'POST',
      body: JSON.stringify({
        discordGuildId: '123456789',
      }),
    });

    const response = await deployHandler(request, { params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Personality template not found');
  });

  it('should return 403 when template is not public', async () => {
    const { getServerSession } = await import('next-auth');
    const { prisma } = await import('@botbot/db');

    (getServerSession as any).mockResolvedValue(mockSession);
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue({
      ...mockTemplate,
      isPublic: false,
    });

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/template123/deploy', {
      method: 'POST',
      body: JSON.stringify({
        discordGuildId: '123456789',
      }),
    });

    const response = await deployHandler(request, { params: { id: 'template123' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Personality template is not available for deployment');
  });

  it('should return 403 when user lacks Discord server permissions', async () => {
    const { getServerSession } = await import('next-auth');
    const { prisma } = await import('@botbot/db');

    (getServerSession as any).mockResolvedValue(mockSession);
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(mockTemplate);

    // Mock Discord API to return guilds without the target server
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/template123/deploy', {
      method: 'POST',
      body: JSON.stringify({
        discordGuildId: '999999999',
      }),
    });

    const response = await deployHandler(request, { params: { id: 'template123' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('You do not have permission to deploy to this Discord server');
  });

  it('should return 409 when personality already deployed to server', async () => {
    const { getServerSession } = await import('next-auth');
    const { prisma } = await import('@botbot/db');

    (getServerSession as any).mockResolvedValue(mockSession);
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(mockTemplate);
    (prisma.personalityDeployment.findFirst as any).mockResolvedValue({
      id: 'existing123',
      status: 'ACTIVE',
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockGuilds),
    });

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/template123/deploy', {
      method: 'POST',
      body: JSON.stringify({
        discordGuildId: '123456789',
      }),
    });

    const response = await deployHandler(request, { params: { id: 'template123' } });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('This personality is already deployed to this server');
  });

  it('should validate request body', async () => {
    const { getServerSession } = await import('next-auth');
    (getServerSession as any).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/template123/deploy', {
      method: 'POST',
      body: JSON.stringify({
        // Missing discordGuildId
      }),
    });

    const response = await deployHandler(request, { params: { id: 'template123' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
    expect(data.details).toBeDefined();
  });
});