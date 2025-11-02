import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@botbot/db';
import { z } from '@botbot/shared';

// Route parameters schema
const PersonalityParamsSchema = z.object({
  id: z.string().min(1),
});

// Rating request schema
const RatingRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(1000).optional(),
  userId: z.string().min(1), // In a real app, this would come from auth
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = PersonalityParamsSchema.parse(params);
    const body = await request.json();
    const { rating, review, userId } = RatingRequestSchema.parse(body);

    // Check if personality exists and is public
    const personality = await prisma.personalityTemplate.findUnique({
      where: { id },
      select: { id: true, isPublic: true },
    });

    if (!personality) {
      return NextResponse.json(
        { error: 'Personality not found' },
        { status: 404 }
      );
    }

    if (!personality.isPublic) {
      return NextResponse.json(
        { error: 'Cannot rate private personality' },
        { status: 403 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Upsert the rating (update if exists, create if not)
    const personalityRating = await prisma.personalityRating.upsert({
      where: {
        templateId_userId: {
          templateId: id,
          userId: userId,
        },
      },
      update: {
        rating,
        review,
        updatedAt: new Date(),
      },
      create: {
        templateId: id,
        userId,
        rating,
        review,
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

    // Calculate new average rating
    const allRatings = await prisma.personalityRating.findMany({
      where: { templateId: id },
      select: { rating: true },
    });

    const averageRating = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
      : 0;

    return NextResponse.json({
      rating: {
        id: personalityRating.id,
        rating: personalityRating.rating,
        review: personalityRating.review,
        createdAt: personalityRating.createdAt,
        updatedAt: personalityRating.updatedAt,
        user: personalityRating.user,
      },
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: allRatings.length,
    });
  } catch (error) {
    console.error('Error creating rating:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}