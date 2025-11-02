import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { PersonalityCard, PersonalityCardData } from '../personality-card';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';

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

describe('PersonalityCard', () => {
  it('renders personality information correctly', () => {
    render(<PersonalityCard personality={mockPersonality} />);

    expect(screen.getByText('Atlas the Scientist')).toBeInTheDocument();
    expect(screen.getByText('by sciencefan')).toBeInTheDocument();
    expect(screen.getByText('A curious scientist who loves explaining complex topics in simple terms.')).toBeInTheDocument();
    expect(screen.getByText('Education')).toBeInTheDocument();
    expect(screen.getByText('science')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('shows verified badge for verified personalities', () => {
    render(<PersonalityCard personality={mockPersonality} />);
    
    // Check for verified icon (Lucide badge-check component)
    const verifiedIcon = document.querySelector('.lucide-badge-check');
    expect(verifiedIcon).toBeTruthy();
  });

  it('calls onPreview when card is clicked', () => {
    const onPreview = vi.fn();
    render(<PersonalityCard personality={mockPersonality} onPreview={onPreview} />);

    fireEvent.click(screen.getByText('Atlas the Scientist'));
    expect(onPreview).toHaveBeenCalledWith(mockPersonality);
  });

  it('calls onDeploy when deploy button is clicked', () => {
    const onDeploy = vi.fn();
    render(<PersonalityCard personality={mockPersonality} onDeploy={onDeploy} />);

    fireEvent.click(screen.getByText('Deploy'));
    expect(onDeploy).toHaveBeenCalledWith(mockPersonality);
  });

  it('prevents event bubbling when deploy button is clicked', () => {
    const onPreview = vi.fn();
    const onDeploy = vi.fn();
    render(
      <PersonalityCard 
        personality={mockPersonality} 
        onPreview={onPreview} 
        onDeploy={onDeploy} 
      />
    );

    fireEvent.click(screen.getByText('Deploy'));
    expect(onDeploy).toHaveBeenCalledWith(mockPersonality);
    expect(onPreview).not.toHaveBeenCalled();
  });

  it('displays price when provided', () => {
    const personalityWithPrice = { ...mockPersonality, price: 9.99 };
    render(<PersonalityCard personality={personalityWithPrice} />);

    expect(screen.getByText('$9.99')).toBeInTheDocument();
  });

  it('shows N/A for rating when no ratings exist', () => {
    const personalityNoRating = { ...mockPersonality, averageRating: 0, ratingCount: 0 };
    render(<PersonalityCard personality={personalityNoRating} />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('truncates tags when more than 3 are provided', () => {
    const personalityManyTags = { 
      ...mockPersonality, 
      tags: ['science', 'curious', 'helpful', 'educational', 'friendly'] 
    };
    render(<PersonalityCard personality={personalityManyTags} />);

    expect(screen.getByText('science')).toBeInTheDocument();
    expect(screen.getByText('curious')).toBeInTheDocument();
    expect(screen.getByText('helpful')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });
});