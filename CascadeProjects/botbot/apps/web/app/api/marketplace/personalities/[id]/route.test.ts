import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock the database
vi.mock('@botbot/db', () => ({
  prisma: {
    personalityTemplate: {
      findUnique: vi.fn(),
    },
  },
}));

const mockPersonality = {
  id: 'test-personality-1',
  name: 'Friendly Assistant',
  description: 'A helpful and friendly AI assistant',
  persona: 'I am a friendly and helpful AI assistant who loves to help people.',
  systemPrompt: 'You are a friendly and helpful AI assistant.',
  traits: { helpfulness: 0.9, friendliness: 0.8 },
  category: 'assistant',
  tags: ['helpful', 'friendly'],
  isPublic: true,
  isVerified: true,
  price: null,
  downloadCount: 150,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  creator: {
    id: 'user-1',
    username: 'creator1',
    avatar: null,
  },
  ratings: [
    {
      id: 'rating-1',
      rating: 5,
      review: 'Great personality!',
      createdAt: new Date('2024-01-02'),
      user: {
        id: 'user-2',
        username: 'reviewer1',
        avatar: null,
      },
    },
    {
      id: 'rating-2',
      rating: 4,
      review: 'Pretty good',
      createdAt: new Date('2024-01-03'),
      user: {
        id: 'user-3',
        username: 'reviewer2',
        avatar: null,
      },
    },
  ],
  _count: {
    ratings: 2,
    deployments: 25,
  },
};

describe('/api/marketplace/personalities/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return personality details', async () => {
    const { prisma } = await import('@botbot/db');
    
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(mockPersonality);

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/test-personality-1');
    const response = await GET(request, { params: { id: 'test-personality-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      id: 'test-personality-1',
      name: 'Friendly Assistant',
      description: 'A helpful and friendly AI assistant',
      persona: 'I am a friendly and helpful AI assistant who loves to help people.',
      systemPrompt: 'You are a friendly and helpful AI assistant.',
      traits: { helpfulness: 0.9, friendliness: 0.8 },
      category: 'assistant',
      tags: ['helpful', 'friendly'],
      isVerified: true,
      price: null,
      downloadCount: 150,
      averageRating: 4.5,
      ratingCount: 2,
      deploymentCount: 25,
      creator: {
        id: 'user-1',
        username: 'creator1',
        avatar: null,
      },
      ratings: expect.arrayContaining([
        expect.objectContaining({
          id: 'rating-1',
          rating: 5,
          review: 'Great personality!',
        }),
      ]),
    });

    expect(prisma.personalityTemplate.findUnique).toHaveBeenCalledWith({
      where: { id: 'test-personality-1' },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        ratings: {
          select: {
            id: true,
            rating: true,
            review: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            ratings: true,
            deployments: true,
          },
        },
      },
    });
  });

  it('should return 404 for non-existent personality', async () => {
    const { prisma } = await import('@botbot/db');
    
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/non-existent');
    const response = await GET(request, { params: { id: 'non-existent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Personality not found');
  });

  it('should return 403 for private personality', async () => {
    const { prisma } = await import('@botbot/db');
    
    const privatePersonality = {
      ...mockPersonality,
      isPublic: false,
    };
    
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(privatePersonality);

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/private-personality');
    const response = await GET(request, { params: { id: 'private-personality' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Personality not available');
  });

  it('should return 400 for invalid personality ID', async () => {
    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/');
    const response = await GET(request, { params: { id: '' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid personality ID');
  });

  it('should calculate average rating correctly', async () => {
    const { prisma } = await import('@botbot/db');
    
    const personalityWithNoRatings = {
      ...mockPersonality,
      ratings: [],
      _count: { ratings: 0, deployments: 0 },
    };
    
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(personalityWithNoRatings);

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/test-personality-1');
    const response = await GET(request, { params: { id: 'test-personality-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.averageRating).toBe(0);
    expect(data.ratingCount).toBe(0);
  });

  it('should include all personality fields in response', async () => {
    const { prisma } = await import('@botbot/db');
    
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(mockPersonality);

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/test-personality-1');
    const response = await GET(request, { params: { id: 'test-personality-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    
    // Check that all expected fields are present
    const expectedFields = [
      'id', 'name', 'description', 'persona', 'systemPrompt', 'traits',
      'category', 'tags', 'isVerified', 'price', 'downloadCount',
      'averageRating', 'ratingCount', 'deploymentCount', 'createdAt',
      'updatedAt', 'creator', 'ratings'
    ];
    
    expectedFields.forEach(field => {
      expect(data).toHaveProperty(field);
    });
  });
});