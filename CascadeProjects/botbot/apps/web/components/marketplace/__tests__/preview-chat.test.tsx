import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { PreviewChat } from '../preview-chat';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock fetch
global.fetch = vi.fn();

describe('PreviewChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial greeting message', () => {
    render(<PreviewChat personalityId="test-id" personalityName="Atlas" />);
    
    expect(screen.getByText("Hello! I'm Atlas. Feel free to chat with me to get a sense of my personality. What would you like to talk about?")).toBeInTheDocument();
  });

  it('renders chat header with personality name', () => {
    render(<PreviewChat personalityId="test-id" personalityName="Atlas" />);
    
    expect(screen.getByText('Chat with Atlas')).toBeInTheDocument();
    expect(screen.getByText('Preview conversation')).toBeInTheDocument();
  });

  it('renders input field with placeholder', () => {
    render(<PreviewChat personalityId="test-id" personalityName="Atlas" />);
    
    expect(screen.getByPlaceholderText('Message Atlas...')).toBeInTheDocument();
  });

  it('sends message when send button is clicked', async () => {
    const mockResponse = { response: 'Hello there!' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<PreviewChat personalityId="test-id" personalityName="Atlas" />);
    
    const input = screen.getByPlaceholderText('Message Atlas...');
    const sendButton = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'Hello!' } });
    fireEvent.click(sendButton);

    expect(screen.getByText('Hello!')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/marketplace/preview/test-id/chat', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }));
    
    // Check that the body contains the expected message
    const callArgs = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.message).toBe('Hello!');
    expect(body.history).toEqual(expect.any(Array));
  });

  it('sends message when Enter key is pressed', async () => {
    const mockResponse = { response: 'Hello there!' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<PreviewChat personalityId="test-id" personalityName="Atlas" />);
    
    const input = screen.getByPlaceholderText('Message Atlas...');

    fireEvent.change(input, { target: { value: 'Hello!' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
    });
  });

  it('shows loading state while sending message', async () => {
    const mockResponse = { response: 'Hello there!' };
    (global.fetch as any).mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => mockResponse,
        }), 100)
      )
    );

    render(<PreviewChat personalityId="test-id" personalityName="Atlas" />);
    
    const input = screen.getByPlaceholderText('Message Atlas...');
    const sendButton = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'Hello!' } });
    fireEvent.click(sendButton);

    expect(screen.getByText('Thinking...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

    render(<PreviewChat personalityId="test-id" personalityName="Atlas" />);
    
    const input = screen.getByPlaceholderText('Message Atlas...');
    const sendButton = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'Hello!' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText("I'm sorry, I'm having trouble responding right now. Please try again later.")).toBeInTheDocument();
    });
  });

  it('disables input and send button while loading', async () => {
    let resolvePromise: (value: any) => void;
    const mockPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    
    (global.fetch as any).mockImplementation(() => mockPromise);

    render(<PreviewChat personalityId="test-id" personalityName="Atlas" />);
    
    const input = screen.getByPlaceholderText('Message Atlas...');
    const sendButton = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'Hello!' } });
    fireEvent.click(sendButton);

    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
    
    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({ response: 'Hello there!' }),
    });
    
    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });
    
    // After loading is complete, button should be enabled if there's text
    fireEvent.change(input, { target: { value: 'New message' } });
    expect(sendButton).not.toBeDisabled();
  });

  it('clears input after sending message', async () => {
    const mockResponse = { response: 'Hello there!' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<PreviewChat personalityId="test-id" personalityName="Atlas" />);
    
    const input = screen.getByPlaceholderText('Message Atlas...') as HTMLInputElement;
    const sendButton = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'Hello!' } });
    expect(input.value).toBe('Hello!');
    
    fireEvent.click(sendButton);
    expect(input.value).toBe('');
  });

  it('does not send empty messages', () => {
    render(<PreviewChat personalityId="test-id" personalityName="Atlas" />);
    
    const sendButton = screen.getByRole('button');
    
    fireEvent.click(sendButton);
    
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows timestamps for messages', () => {
    render(<PreviewChat personalityId="test-id" personalityName="Atlas" />);
    
    // Check that timestamp elements exist (they show current time)
    const timeElements = document.querySelectorAll('[class*="text-"][class*="100"], [class*="text-"][class*="500"]');
    expect(timeElements.length).toBeGreaterThan(0);
  });
});