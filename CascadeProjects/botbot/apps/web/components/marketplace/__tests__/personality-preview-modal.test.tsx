import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { PersonalityPreviewModal } from '../personality-preview-modal';
import { PersonalityCardData } from '../personality-card';
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
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock fetch
global.fetch = vi.fn();

const mockPersonality: PersonalityCardData = {
  id: '1',
  name: 'Atlas the Scientist',
  description: 'A curious scientist who loves explaining complex topics in simple terms.',
  category: 'Education',
  tags: ['science', 'curious', 'helpful'],
  isVerified: true,
  downloadCount: 150,
  averageRating: 4.5,
  ratingCount: 23,
  deploymentCount: 45,
  createdAt: '2024-01-01T00:00:00Z',
  creator: {
    id: 'creator1',
    username: 'sciencefan',
    avatar: null,
  },
};

describe('PersonalityPreviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockPersonality,
        traits: {
          curiosity: 0.9,
          helpfulness: 0.8,
          enthusiasm: 0.7,
        },
      }),
    });
  });

  it('does not render when closed', () => {
    render(
      <PersonalityPreviewModal
        personality={mockPersonality}
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByText('Atlas the Scientist')).not.toBeInTheDocument();
  });

  it('renders personality information when open', async () => {
    render(
      <PersonalityPreviewModal
        personality={mockPersonality}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Atlas the Scientist')).toBeInTheDocument();
    expect(screen.getByText('by sciencefan')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('shows verified badge for verified personalities', () => {
    render(
      <PersonalityPreviewModal
        personality={mockPersonality}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const verifiedIcon = document.querySelector('.lucide-badge-check');
    expect(verifiedIcon).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <PersonalityPreviewModal
        personality={mockPersonality}
        isOpen={true}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <PersonalityPreviewModal
        personality={mockPersonality}
        isOpen={true}
        onClose={onClose}
      />
    );

    // Click on the backdrop (the outer div)
    const backdrop = document.querySelector('.fixed.inset-0');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <PersonalityPreviewModal
        personality={mockPersonality}
        isOpen={true}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onDeploy when deploy button is clicked', () => {
    const onDeploy = vi.fn();
    render(
      <PersonalityPreviewModal
        personality={mockPersonality}
        isOpen={true}
        onClose={vi.fn()}
        onDeploy={onDeploy}
      />
    );

    fireEvent.click(screen.getByText('Deploy to Discord'));
    expect(onDeploy).toHaveBeenCalledWith(mockPersonality);
  });

  it('switches between tabs', () => {
    render(
      <PersonalityPreviewModal
        personality={mockPersonality}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    // Initially on overview tab
    expect(screen.getByText('Description')).toBeInTheDocument();

    // Switch to chat tab
    fireEvent.click(screen.getByText('Live Chat'));
    expect(screen.getByText('Chat with Atlas the Scientist')).toBeInTheDocument();

    // Switch to samples tab
    const sampleTab = screen.getByRole('button', { name: 'Sample Conversations' });
    fireEvent.click(sampleTab);
    expect(screen.getAllByText('Sample Conversations')).toHaveLength(2); // Tab and heading
    expect(screen.getByText(/Here are some example interactions/)).toBeInTheDocument();
  });

  it('displays personality description and tags', () => {
    render(
      <PersonalityPreviewModal
        personality={mockPersonality}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('A curious scientist who loves explaining complex topics in simple terms.')).toBeInTheDocument();
    expect(screen.getByText('Education')).toBeInTheDocument();
    expect(screen.getByText('science')).toBeInTheDocument();
    expect(screen.getByText('curious')).toBeInTheDocument();
    expect(screen.getByText('helpful')).toBeInTheDocument();
  });

  it('displays personality traits when available', async () => {
    render(
      <PersonalityPreviewModal
        personality={mockPersonality}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Personality Traits')).toBeInTheDocument();
      expect(screen.getByText('curiosity')).toBeInTheDocument();
      expect(screen.getByText('helpfulness')).toBeInTheDocument();
      expect(screen.getByText('enthusiasm')).toBeInTheDocument();
    });
  });

  it('shows compatibility information', () => {
    render(
      <PersonalityPreviewModal
        personality={mockPersonality}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Compatibility')).toBeInTheDocument();
    expect(screen.getByText(/Compatible with Discord servers/)).toBeInTheDocument();
    expect(screen.getByText(/Supports natural language conversations/)).toBeInTheDocument();
    expect(screen.getByText(/Memory-enabled interactions/)).toBeInTheDocument();
  });

  it('displays sample conversations', () => {
    render(
      <PersonalityPreviewModal
        personality={mockPersonality}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Sample Conversations'));

    expect(screen.getByText('Hi there! How are you doing today?')).toBeInTheDocument();
    expect(screen.getByText(/Hello! I'm doing wonderfully/)).toBeInTheDocument();
  });

  it('shows creation date', () => {
    render(
      <PersonalityPreviewModal
        personality={mockPersonality}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Created/)).toBeInTheDocument();
  });

  it('displays price when available', () => {
    const personalityWithPrice = { ...mockPersonality, price: 9.99 };
    render(
      <PersonalityPreviewModal
        personality={personalityWithPrice}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('$9.99')).toBeInTheDocument();
  });

  it('fetches personality details on open', async () => {
    render(
      <PersonalityPreviewModal
        personality={mockPersonality}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/marketplace/personalities/1');
    });
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

    render(
      <PersonalityPreviewModal
        personality={mockPersonality}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    // Should still render basic information even if API fails
    expect(screen.getByText('Atlas the Scientist')).toBeInTheDocument();
  });
});