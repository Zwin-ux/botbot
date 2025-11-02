import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock the database
vi.mock('@botbot/db', () => ({
  prisma: {
    personalityTemplate: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

const mockPersonalities = [
  {
    id: 'test-1',
    name: 'Friendly Assistant',
    description: 'A helpful and friendly AI assistant',
    category: 'assistant',
    tags: ['helpful', 'friendly'],
    isVerified: true,
    price: null,
    downloadCount: 150,
    createdAt: new Date('2024-01-01'),
    creator: {
      id: 'user-1',
      username: 'creator1',
      avatar: null,
    },
    ratings: [
      { rating: 5 },
      { rating: 4 },
      { rating: 5 },
    ],
    _count: {
      ratings: 3,
      deployments: 25,
    },
  },
  {
    id: 'test-2',
    name: 'Gaming Buddy',
    description: 'A fun gaming companion',
    category: 'gaming',
    tags: ['gaming', 'fun'],
    isVerified: false,
    price: 9.99,
    downloadCount: 75,
    createdAt: new Date('2024-01-15'),
    creator: {
      id: 'user-2',
      username: 'creator2',
      avatar: null,
    },
    ratings: [
      { rating: 4 },
      { rating: 3 },
    ],
    _count: {
      ratings: 2,
      deployments: 10,
    },
  },
];

describe('/api/marketplace/personalities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return personalities with default parameters', async () => {
    const { prisma } = await import('@botbot/db');
    
    (prisma.personalityTemplate.findMany as any).mockResolvedValue(mockPersonalities);
    (prisma.personalityTemplate.count as any).mockResolvedValue(2);

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.personalities).toHaveLength(2);
    expect(data.personalities[0]).toMatchObject({
      id: 'test-1',
      name: 'Friendly Assistant',
      averageRating: 4.7,
      ratingCount: 3,
      deploymentCount: 25,
    });
    expect(data.pagination).toMatchObject({
      page: 1,
      limit: 20,
      totalCount: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('should filter by search term', async () => {
    const { prisma } = await import('@botbot/db');
    
    (prisma.personalityTemplate.findMany as any).mockResolvedValue([mockPersonalities[0]]);
    (prisma.personalityTemplate.count as any).mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities?search=assistant');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.personalities).toHaveLength(1);
    expect(data.personalities[0].name).toBe('Friendly Assistant');

    // Verify the where clause includes search
    expect(prisma.personalityTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isPublic: true,
          OR: [
            { name: { contains: 'assistant', mode: 'insensitive' } },
            { description: { contains: 'assistant', mode: 'insensitive' } },
          ],
        }),
      })
    );
  });

  it('should filter by category', async () => {
    const { prisma } = await import('@botbot/db');
    
    (prisma.personalityTemplate.findMany as any).mockResolvedValue([mockPersonalities[1]]);
    (prisma.personalityTemplate.count as any).mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities?category=gaming');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.personalityTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isPublic: true,
          category: 'gaming',
        }),
      })
    );
  });

  it('should filter by tags', async () => {
    const { prisma } = await import('@botbot/db');
    
    (prisma.personalityTemplate.findMany as any).mockResolvedValue([mockPersonalities[0]]);
    (prisma.personalityTemplate.count as any).mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities?tags=helpful,friendly');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.personalityTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isPublic: true,
          tags: {
            hasSome: ['helpful', 'friendly'],
          },
        }),
      })
    );
  });

  it('should sort by different criteria', async () => {
    const { prisma } = await import('@botbot/db');
    
    (prisma.personalityTemplate.findMany as any).mockResolvedValue(mockPersonalities);
    (prisma.personalityTemplate.count as any).mockResolvedValue(2);

    // Test sorting by name
    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities?sort=name');
    await GET(request);

    expect(prisma.personalityTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: 'asc' },
      })
    );
  });

  it('should handle pagination', async () => {
    const { prisma } = await import('@botbot/db');
    
    (prisma.personalityTemplate.findMany as any).mockResolvedValue([mockPersonalities[1]]);
    (prisma.personalityTemplate.count as any).mockResolvedValue(10);

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities?page=2&limit=5');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination).toMatchObject({
      page: 2,
      limit: 5,
      totalCount: 10,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });

    expect(prisma.personalityTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5, // (page - 1) * limit
        take: 5,
      })
    );
  });

  it('should return 400 for invalid query parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities?page=0');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid query parameters');
  });

  it('should calculate average ratings correctly', async () => {
    const { prisma } = await import('@botbot/db');
    
    const personalityWithNoRatings = {
      ...mockPersonalities[0],
      ratings: [],
      _count: { ratings: 0, deployments: 0 },
    };

    (prisma.personalityTemplate.findMany as any).mockResolvedValue([personalityWithNoRatings]);
    (prisma.personalityTemplate.count as any).mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.personalities[0].averageRating).toBe(0);
    expect(data.personalities[0].ratingCount).toBe(0);
  });
});