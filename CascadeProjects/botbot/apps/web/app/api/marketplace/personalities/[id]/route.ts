import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@botbot/db';
import { z } from '@botbot/shared';

// Route parameters schema
const PersonalityParamsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = PersonalityParamsSchema.parse(params);

    const personality = await prisma.personalityTemplate.findUnique({
      where: { id },
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

    if (!personality) {
      return NextResponse.json(
        { error: 'Personality not found' },
        { status: 404 }
      );
    }

    if (!personality.isPublic) {
      return NextResponse.json(
        { error: 'Personality not available' },
        { status: 403 }
      );
    }

    // Calculate average rating
    const ratings = personality.ratings.map(r => r.rating);
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length 
      : 0;

    // Format response
    const formattedPersonality = {
      id: personality.id,
      name: personality.name,
      description: personality.description,
      persona: personality.persona,
      systemPrompt: personality.systemPrompt,
      traits: personality.traits,
      category: personality.category,
      tags: personality.tags,
      isVerified: personality.isVerified,
      price: personality.price,
      downloadCount: personality.downloadCount,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingCount: personality._count.ratings,
      deploymentCount: personality._count.deployments,
      createdAt: personality.createdAt,
      updatedAt: personality.updatedAt,
      creator: personality.creator,
      ratings: personality.ratings,
    };

    return NextResponse.json(formattedPersonality);
  } catch (error) {
    console.error('Error fetching personality:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid personality ID', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}