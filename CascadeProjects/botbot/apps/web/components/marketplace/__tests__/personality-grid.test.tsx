import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { PersonalityGrid } from '../personality-grid';
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
import { describe } from 'node:test';

const mockPersonalities: PersonalityCardData[] = [
  {
    id: '1',
    name: 'Atlas the Scientist',
    description: 'A curious scientist who loves explaining complex topics.',
    category: 'Education',
    tags: ['science', 'curious'],
    isVerified: true,
    downloadCount: 150,
    averageRating: 4.5,
    ratingCount: 23,
    deploymentCount: 45,
    createdAt: '2024-01-01T00:00:00Z',
    creator: { id: 'creator1', username: 'sciencefan', avatar: null },
  },
  {
    id: '2',
    name: 'Luna the Gamer',
    description: 'An enthusiastic gamer who knows all the latest games.',
    category: 'Gaming',
    tags: ['gaming', 'competitive'],
    isVerified: false,
    downloadCount: 89,
    averageRating: 4.2,
    ratingCount: 15,
    deploymentCount: 32,
    createdAt: '2024-01-02T00:00:00Z',
    creator: { id: 'creator2', username: 'gamerpro', avatar: null },
  },
];

describe('PersonalityGrid', () => {
  it('renders personalities correctly', () => {
    render(<PersonalityGrid personalities={mockPersonalities} />);

    expect(screen.getByText('Atlas the Scientist')).toBeInTheDocument();
    expect(screen.getByText('Luna the Gamer')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading', () => {
    render(<PersonalityGrid personalities={[]} loading={true} />);
    
    // Check for skeleton elements (animated pulse divs)
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('shows error message when error occurs', () => {
    const errorMessage = 'Failed to load personalities';
    render(<PersonalityGrid personalities={[]} error={errorMessage} />);

    expect(screen.getByText('Error Loading Personalities')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('shows empty state when no personalities found', () => {
    render(<PersonalityGrid personalities={[]} />);

    expect(screen.getByText('No Personalities Found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search filters or check back later for new personalities.')).toBeInTheDocument();
  });

  it('calls onPreview when personality card is clicked', () => {
    const onPreview = vi.fn();
    render(<PersonalityGrid personalities={mockPersonalities} onPreview={onPreview} />);

    fireEvent.click(screen.getByText('Atlas the Scientist'));
    expect(onPreview).toHaveBeenCalledWith(mockPersonalities[0]);
  });

  it('calls onDeploy when deploy button is clicked', () => {
    const onDeploy = vi.fn();
    render(<PersonalityGrid personalities={mockPersonalities} onDeploy={onDeploy} />);

    const deployButtons = screen.getAllByText('Deploy');
    fireEvent.click(deployButtons[0]);
    expect(onDeploy).toHaveBeenCalledWith(mockPersonalities[0]);
  });

  it('shows load more button when hasMore is true', () => {
    render(
      <PersonalityGrid 
        personalities={mockPersonalities} 
        hasMore={true}
        onLoadMore={vi.fn()}
      />
    );

    expect(screen.getByText('Load More Personalities')).toBeInTheDocument();
  });

  it('calls onLoadMore when load more button is clicked', () => {
    const onLoadMore = vi.fn();
    render(
      <PersonalityGrid 
        personalities={mockPersonalities} 
        hasMore={true}
        onLoadMore={onLoadMore}
      />
    );

    fireEvent.click(screen.getByText('Load More Personalities'));
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('shows loading state on load more button when loadingMore is true', () => {
    render(
      <PersonalityGrid 
        personalities={mockPersonalities} 
        hasMore={true}
        loadingMore={true}
        onLoadMore={vi.fn()}
      />
    );

    expect(screen.getByText('Loading More...')).toBeInTheDocument();
    
    const loadMoreButton = screen.getByRole('button', { name: /loading more/i });
    expect(loadMoreButton).toBeDisabled();
  });

  it('renders responsive grid layout', () => {
    render(<PersonalityGrid personalities={mockPersonalities} />);
    
    const gridContainer = document.querySelector('.grid');
    expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
  });
});