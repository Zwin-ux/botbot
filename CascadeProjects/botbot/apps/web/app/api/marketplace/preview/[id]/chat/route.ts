import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@botbot/db';
import { z } from '@botbot/shared';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Route parameters schema
const PreviewParamsSchema = z.object({
  id: z.string().min(1),
});

// Chat request schema
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().optional(), // For session management
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
});

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10; // 10 requests per minute

  const current = rateLimitMap.get(ip);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const { id } = PreviewParamsSchema.parse(params);
    const body = await request.json();
    const { message, conversationHistory = [] } = ChatRequestSchema.parse(body);

    // Get personality template
    const personality = await prisma.personalityTemplate.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        persona: true,
        systemPrompt: true,
        traits: true,
        isPublic: true,
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
        { error: 'Personality not available for preview' },
        { status: 403 }
      );
    }

    // Build conversation messages for OpenAI
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `${personality.systemPrompt}\n\nPersonality: ${personality.persona}\n\nThis is a preview conversation. Keep responses concise and engaging.`,
      },
      // Add conversation history
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      // Add current user message
      {
        role: 'user' as const,
        content: message,
      },
    ];

    // Generate response using OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages,
      max_tokens: 300, // Keep responses concise for preview
      temperature: 0.8,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      return NextResponse.json(
        { error: 'Failed to generate response' },
        { status: 500 }
      );
    }

    // Return the response
    return NextResponse.json({
      response,
      personality: {
        id: personality.id,
        name: personality.name,
      },
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
    });
  } catch (error) {
    console.error('Error in preview chat:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.name === 'APIError') {
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}