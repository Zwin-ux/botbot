import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock the database
vi.mock('@botbot/db', () => ({
  prisma: {
    personalityTemplate: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock OpenAI
vi.mock('openai', () => {
  const mockCreate = vi.fn();
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
    mockCreate, // Export for test access
  };
});

const mockPersonality = {
  id: 'test-personality-1',
  name: 'Friendly Assistant',
  persona: 'I am a friendly and helpful AI assistant who loves to help people.',
  systemPrompt: 'You are a friendly and helpful AI assistant.',
  traits: { helpfulness: 0.9, friendliness: 0.8 },
  isPublic: true,
};

const mockOpenAIResponse = {
  choices: [
    {
      message: {
        content: 'Hello! I\'m happy to help you with anything you need. What can I do for you today?',
      },
    },
  ],
  usage: {
    prompt_tokens: 50,
    completion_tokens: 20,
    total_tokens: 70,
  },
};

describe('/api/marketplace/preview/[id]/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear rate limit map
    const rateLimitMap = new Map();
    vi.doMock('./route', async () => {
      const actual = await vi.importActual('./route');
      return {
        ...actual,
        rateLimitMap,
      };
    });
  });

  it('should generate chat response for personality preview', async () => {
    const { prisma } = await import('@botbot/db');
    const { mockCreate } = await import('openai') as any;
    
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(mockPersonality);
    mockCreate.mockResolvedValue(mockOpenAIResponse);

    const requestBody = {
      message: 'Hello, how are you?',
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/preview/test-personality-1/chat', {
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
      response: 'Hello! I\'m happy to help you with anything you need. What can I do for you today?',
      personality: {
        id: 'test-personality-1',
        name: 'Friendly Assistant',
      },
      usage: {
        promptTokens: 50,
        completionTokens: 20,
        totalTokens: 70,
      },
    });

    expect(prisma.personalityTemplate.findUnique).toHaveBeenCalledWith({
      where: { id: 'test-personality-1' },
      select: {
        id: true,
        name: true,
        persona: true,
        systemPrompt: true,
        traits: true,
        isPublic: true,
      },
    });
  });

  it('should handle conversation history', async () => {
    const { prisma } = await import('@botbot/db');
    const { mockCreate } = await import('openai') as any;
    
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(mockPersonality);
    mockCreate.mockResolvedValue(mockOpenAIResponse);

    const requestBody = {
      message: 'What did I just ask you?',
      conversationHistory: [
        { role: 'user', content: 'Hello, how are you?' },
        { role: 'assistant', content: 'I\'m doing great, thank you!' },
      ],
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/preview/test-personality-1/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, { params: { id: 'test-personality-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.response).toBeDefined();

    // Verify OpenAI was called with conversation history
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: expect.stringContaining('You are a friendly and helpful AI assistant.'),
        },
        { role: 'user', content: 'Hello, how are you?' },
        { role: 'assistant', content: 'I\'m doing great, thank you!' },
        { role: 'user', content: 'What did I just ask you?' },
      ],
      max_tokens: 300,
      temperature: 0.8,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });
  });

  it('should return 404 for non-existent personality', async () => {
    const { prisma } = await import('@botbot/db');
    
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(null);

    const requestBody = {
      message: 'Hello',
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/preview/non-existent/chat', {
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
      ...mockPersonality,
      isPublic: false,
    };
    
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(privatePersonality);

    const requestBody = {
      message: 'Hello',
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/preview/private-personality/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, { params: { id: 'private-personality' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Personality not available for preview');
  });

  it('should return 400 for invalid message', async () => {
    const requestBody = {
      message: '', // Empty message
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/preview/test-personality-1/chat', {
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

  it('should return 400 for message that is too long', async () => {
    const requestBody = {
      message: 'a'.repeat(2001), // Too long
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/preview/test-personality-1/chat', {
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
      message: 'Hello',
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/preview//chat', {
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

  it('should handle OpenAI API errors', async () => {
    const { prisma } = await import('@botbot/db');
    const { mockCreate } = await import('openai') as any;
    
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(mockPersonality);
    
    const apiError = new Error('API Error');
    apiError.name = 'APIError';
    mockCreate.mockRejectedValue(apiError);

    const requestBody = {
      message: 'Hello',
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/preview/test-personality-1/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, { params: { id: 'test-personality-1' } });
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('AI service temporarily unavailable');
  });

  it('should handle empty OpenAI response', async () => {
    const { prisma } = await import('@botbot/db');
    const { mockCreate } = await import('openai') as any;
    
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(mockPersonality);
    
    const emptyResponse = {
      choices: [],
      usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
    };
    mockCreate.mockResolvedValue(emptyResponse);

    const requestBody = {
      message: 'Hello',
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/preview/test-personality-1/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request, { params: { id: 'test-personality-1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to generate response');
  });

  it('should include system prompt and persona in OpenAI messages', async () => {
    const { prisma } = await import('@botbot/db');
    const { mockCreate } = await import('openai') as any;
    
    (prisma.personalityTemplate.findUnique as any).mockResolvedValue(mockPersonality);
    mockCreate.mockResolvedValue(mockOpenAIResponse);

    const requestBody = {
      message: 'Hello',
    };

    const request = new NextRequest('http://localhost:3000/api/marketplace/preview/test-personality-1/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await POST(request, { params: { id: 'test-personality-1' } });

    expect(mockCreate).toHaveBeenCalledWith({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a friendly and helpful AI assistant.\n\nPersonality: I am a friendly and helpful AI assistant who loves to help people.\n\nThis is a preview conversation. Keep responses concise and engaging.',
        },
        { role: 'user', content: 'Hello' },
      ],
      max_tokens: 300,
      temperature: 0.8,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });
  });
});