import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { SearchAndFilters, SearchFilters } from '../search-and-filters';
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
import { describe } from 'node:test';

const mockCategories = ['Education', 'Gaming', 'Entertainment'];

const defaultFilters: SearchFilters = {
  search: '',
  categories: [],
  sort: 'popular',
};

describe('SearchAndFilters', () => {
  it('renders search bar', () => {
    render(
      <SearchAndFilters 
        filters={defaultFilters}
        onChange={vi.fn()}
        availableCategories={mockCategories}
      />
    );
    
    expect(screen.getByPlaceholderText('Search personalities by name or description...')).toBeInTheDocument();
  });

  it('renders desktop filters on larger screens', () => {
    render(
      <SearchAndFilters 
        filters={defaultFilters}
        onChange={vi.fn()}
        availableCategories={mockCategories}
      />
    );
    
    // Desktop filters should be present but hidden on mobile (md:flex class)
    expect(screen.getByText('All Categories')).toBeInTheDocument();
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('shows mobile filter toggle', () => {
    render(
      <SearchAndFilters 
        filters={defaultFilters}
        onChange={vi.fn()}
        availableCategories={mockCategories}
      />
    );
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('calls onChange when search changes', async () => {
    const onChange = vi.fn();
    render(
      <SearchAndFilters 
        filters={defaultFilters}
        onChange={onChange}
        availableCategories={mockCategories}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search personalities by name or description...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    // Wait for debounced call
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        ...defaultFilters,
        search: 'test search',
      });
    }, { timeout: 500 });
  });

  it('shows active filter count on mobile', () => {
    const filtersWithActive: SearchFilters = {
      search: 'test',
      categories: ['Education'],
      sort: 'newest',
    };
    
    render(
      <SearchAndFilters 
        filters={filtersWithActive}
        onChange={vi.fn()}
        availableCategories={mockCategories}
      />
    );
    
    expect(screen.getByText('3')).toBeInTheDocument(); // 3 active filters
  });

  it('shows clear filters button when filters are active', () => {
    const filtersWithActive: SearchFilters = {
      search: 'test',
      categories: ['Education'],
      sort: 'newest',
    };
    
    render(
      <SearchAndFilters 
        filters={filtersWithActive}
        onChange={vi.fn()}
        availableCategories={mockCategories}
      />
    );
    
    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });

  it('clears all filters when clear button is clicked', () => {
    const onChange = vi.fn();
    const filtersWithActive: SearchFilters = {
      search: 'test',
      categories: ['Education'],
      sort: 'newest',
    };
    
    render(
      <SearchAndFilters 
        filters={filtersWithActive}
        onChange={onChange}
        availableCategories={mockCategories}
      />
    );
    
    fireEvent.click(screen.getByText('Clear Filters'));
    
    expect(onChange).toHaveBeenCalledWith({
      search: '',
      categories: [],
      sort: 'popular',
    });
  });

  it('shows active filters display', () => {
    const filtersWithActive: SearchFilters = {
      search: 'test search',
      categories: ['Education', 'Gaming'],
      sort: 'newest',
    };
    
    render(
      <SearchAndFilters 
        filters={filtersWithActive}
        onChange={vi.fn()}
        availableCategories={mockCategories}
      />
    );
    
    expect(screen.getByText('Active filters:')).toBeInTheDocument();
    expect(screen.getByText('Search: "test search"')).toBeInTheDocument();
    expect(screen.getByText('Education')).toBeInTheDocument();
    expect(screen.getByText('Gaming')).toBeInTheDocument();
    expect(screen.getByText('Sort: newest')).toBeInTheDocument();
  });

  it('allows removing individual active filters', () => {
    const onChange = vi.fn();
    const filtersWithActive: SearchFilters = {
      search: 'test search',
      categories: ['Education'],
      sort: 'newest',
    };
    
    render(
      <SearchAndFilters 
        filters={filtersWithActive}
        onChange={onChange}
        availableCategories={mockCategories}
      />
    );
    
    // Find and click the X button next to the search filter
    const searchFilter = screen.getByText('Search: "test search"').closest('span');
    const removeButton = searchFilter?.querySelector('button');
    if (removeButton) {
      fireEvent.click(removeButton);
    }
    
    expect(onChange).toHaveBeenCalledWith({
      ...filtersWithActive,
      search: '',
    });
  });

  it('opens mobile filters panel', () => {
    render(
      <SearchAndFilters 
        filters={defaultFilters}
        onChange={vi.fn()}
        availableCategories={mockCategories}
      />
    );
    
    fireEvent.click(screen.getByText('Filters'));
    
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Sort By')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('closes mobile filters panel when done is clicked', () => {
    render(
      <SearchAndFilters 
        filters={defaultFilters}
        onChange={vi.fn()}
        availableCategories={mockCategories}
      />
    );
    
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('Done')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Done'));
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });
});