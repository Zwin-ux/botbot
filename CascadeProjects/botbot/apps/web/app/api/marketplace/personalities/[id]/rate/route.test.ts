import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock the database
vi.mock('@botbot/db', () => ({
  prisma: {
    personalityTemplate: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    personalityRating: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const mockPersonality = {
  id: 'test-personality-1',
  isPublic: true,
};

const mockUser = {
  id: 'user-1',
};

const mockRating = {
  id: 'rating-1',
  templateId: 'test-personality-1',
  userId: 'user-1',
  rating: 5,
  review: 'Great personality!',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  user: {
    id: 'user-1',
    username: 'testuser',
    avatar: null,
  },
};

describe('/api/marketplace/personalities/[id]/rate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new rating', async () => {
    const { prisma } = await import('@botbot/db');
    
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(mockPersonality);
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.personalityRating.upsert as any).mockResolvedValue(mockRating);
    (prisma.personalityRating.findMany as any).mockResolvedValue([
      { rating: 5 },
      { rating: 4 },
      { rating: 5 },
    ]);

    const requestBody = {
      rating: 5,
      review: 'Great personality!',
      userId: 'user-1',
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/test-personality-1/rate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, { params: { id: 'test-personality-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      rating: {
        id: 'rating-1',
        rating: 5,
        review: 'Great personality!',
        user: {
          id: 'user-1',
          username: 'testuser',
          avatar: null,
        },
      },
      averageRating: 4.7, // (5 + 4 + 5) / 3 = 4.67, rounded to 4.7
      totalRatings: 3,
    });

    expect(prisma.personalityRating.upsert).toHaveBeenCalledWith({
      where: {
        templateId_userId: {
          templateId: 'test-personality-1',
          userId: 'user-1',
        },
      },
      update: {
        rating: 5,
        review: 'Great personality!',
        updatedAt: expect.any(Date),
      },
      create: {
        templateId: 'test-personality-1',
        userId: 'user-1',
        rating: 5,
        review: 'Great personality!',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });
  });

  it('should update existing rating', async () => {
    const { prisma } = await import('@botbot/db');
    
    const updatedRating = {
      ...mockRating,
      rating: 4,
      review: 'Updated review',
      updatedAt: new Date('2024-01-02'),
    };

    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(mockPersonality);
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.personalityRating.upsert as any).mockResolvedValue(updatedRating);
    (prisma.personalityRating.findMany as any).mockResolvedValue([
      { rating: 4 },
      { rating: 3 },
    ]);

    const requestBody = {
      rating: 4,
      review: 'Updated review',
      userId: 'user-1',
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/test-personality-1/rate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, { params: { id: 'test-personality-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rating.rating).toBe(4);
    expect(data.rating.review).toBe('Updated review');
    expect(data.averageRating).toBe(3.5); // (4 + 3) / 2 = 3.5
    expect(data.totalRatings).toBe(2);
  });

  it('should create rating without review', async () => {
    const { prisma } = await import('@botbot/db');
    
    const ratingWithoutReview = {
      ...mockRating,
      review: null,
    };

    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(mockPersonality);
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.personalityRating.upsert as any).mockResolvedValue(ratingWithoutReview);
    (prisma.personalityRating.findMany as any).mockResolvedValue([{ rating: 5 }]);

    const requestBody = {
      rating: 5,
      userId: 'user-1',
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/test-personality-1/rate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, { params: { id: 'test-personality-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rating.rating).toBe(5);
    expect(data.rating.review).toBeNull();
  });

  it('should return 404 for non-existent personality', async () => {
    const { prisma } = await import('@botbot/db');
    
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(null);

    const requestBody = {
      rating: 5,
      userId: 'user-1',
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/non-existent/rate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, { params: { id: 'non-existent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Personality not found');
  });

  it('should return 403 for private personality', async () => {
    const { prisma } = await import('@botbot/db');
    
    const privatePersonality = {
      id: 'test-personality-1',
      isPublic: false,
    };

    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(privatePersonality);

    const requestBody = {
      rating: 5,
      userId: 'user-1',
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/test-personality-1/rate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, { params: { id: 'test-personality-1' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Cannot rate private personality');
  });

  it('should return 404 for non-existent user', async () => {
    const { prisma } = await import('@botbot/db');
    
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(mockPersonality);
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const requestBody = {
      rating: 5,
      userId: 'non-existent-user',
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/test-personality-1/rate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, { params: { id: 'test-personality-1' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('should return 400 for invalid rating value', async () => {
    const requestBody = {
      rating: 6, // Invalid: should be 1-5
      userId: 'user-1',
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/test-personality-1/rate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, { params: { id: 'test-personality-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
  });

  it('should return 400 for invalid personality ID', async () => {
    const requestBody = {
      rating: 5,
      userId: 'user-1',
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities//rate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, { params: { id: '' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
  });

  it('should return 400 for review that is too long', async () => {
    const requestBody = {
      rating: 5,
      review: 'a'.repeat(1001), // Too long: max 1000 characters
      userId: 'user-1',
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/personalities/test-personality-1/rate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, { params: { id: 'test-personality-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
  });
});