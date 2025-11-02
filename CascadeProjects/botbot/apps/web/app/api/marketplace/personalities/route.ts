import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@botbot/db';
import { z } from '@botbot/shared';

// Query parameters schema for validation
const PersonalityQuerySchema = z.object({
  search: z.string().optional().nullable().transform(val => val || undefined),
  category: z.string().optional().nullable().transform(val => val || undefined),
  tags: z.string().optional().nullable().transform(val => val || undefined), // comma-separated tags
  sort: z.enum(['popular', 'newest', 'rating', 'name']).optional().nullable().transform(val => val || 'popular'),
  page: z.coerce.number().min(1).optional().nullable().transform(val => val || 1),
  limit: z.coerce.number().min(1).max(50).optional().nullable().transform(val => val || 20),
  verified: z.coerce.boolean().optional().nullable().transform(val => val || undefined),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = PersonalityQuerySchema.parse({
      search: searchParams.get('search'),
      category: searchParams.get('category'),
      tags: searchParams.get('tags'),
      sort: searchParams.get('sort'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      verified: searchParams.get('verified'),
    });

    // Build where clause for filtering
    const where: any = {
      isPublic: true, // Only show public personalities
    };

    // Search filter
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (query.category) {
      where.category = query.category;
    }

    // Tags filter
    if (query.tags) {
      const tagList = query.tags.split(',').map(tag => tag.trim());
      where.tags = {
        hasSome: tagList,
      };
    }

    // Verified filter
    if (query.verified !== undefined) {
      where.isVerified = query.verified;
    }

    // Build orderBy clause for sorting
    let orderBy: any = {};
    switch (query.sort) {
      case 'popular':
        orderBy = { downloadCount: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'rating':
        // We'll calculate average rating in a separate query for now
        orderBy = { createdAt: 'desc' };
        break;
      case 'name':
        orderBy = { name: 'asc' };
        break;
    }

    // Calculate pagination
    const skip = (query.page - 1) * query.limit;

    // Execute queries
    const [personalities, totalCount] = await Promise.all([
      prisma.personalityTemplate.findMany({
        where,
        orderBy,
        skip,
        take: query.limit,
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
              rating: true,
            },
          },
          _count: {
            select: {
              ratings: true,
              deployments: true,
            },
          },
        },
      }),
      prisma.personalityTemplate.count({ where }),
    ]);

    // Calculate average ratings and format response
    const formattedPersonalities = personalities.map((personality: any) => {
      const ratings = personality.ratings.map((r: any) => r.rating);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length 
        : 0;

      return {
        id: personality.id,
        name: personality.name,
        description: personality.description,
        category: personality.category,
        tags: personality.tags,
        isVerified: personality.isVerified,
        price: personality.price,
        downloadCount: personality.downloadCount,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        ratingCount: personality._count.ratings,
        deploymentCount: personality._count.deployments,
        createdAt: personality.createdAt,
        creator: personality.creator,
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / query.limit);
    const hasNextPage = query.page < totalPages;
    const hasPreviousPage = query.page > 1;

    return NextResponse.json({
      personalities: formattedPersonalities,
      pagination: {
        page: query.page,
        limit: query.limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    console.error('Error fetching personalities:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}