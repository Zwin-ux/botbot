import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { CategoryFilter } from '../category-filter';

const mockCategories = ['Education', 'Gaming', 'Entertainment', 'Business'];

describe('CategoryFilter', () => {
  it('renders with default placeholder', () => {
    render(
      <CategoryFilter 
        categories={mockCategories} 
        selectedCategories={[]} 
        onChange={vi.fn()} 
      />
    );
    
    expect(screen.getByText('All Categories')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <CategoryFilter 
        categories={mockCategories} 
        selectedCategories={[]} 
        onChange={vi.fn()} 
        placeholder="Choose categories"
      />
    );
    
    expect(screen.getByText('Choose categories')).toBeInTheDocument();
  });

  it('shows selected category count when multiple selected', () => {
    render(
      <CategoryFilter 
        categories={mockCategories} 
        selectedCategories={['Education', 'Gaming']} 
        onChange={vi.fn()} 
      />
    );
    
    expect(screen.getByText('2 categories')).toBeInTheDocument();
  });

  it('shows single category name when one selected', () => {
    render(
      <CategoryFilter 
        categories={mockCategories} 
        selectedCategories={['Education']} 
        onChange={vi.fn()} 
      />
    );
    
    expect(screen.getByText('Education')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', () => {
    render(
      <CategoryFilter 
        categories={mockCategories} 
        selectedCategories={[]} 
        onChange={vi.fn()} 
      />
    );
    
    fireEvent.click(screen.getByText('All Categories'));
    
    mockCategories.forEach(category => {
      expect(screen.getByText(category)).toBeInTheDocument();
    });
  });

  it('calls onChange when category is selected', () => {
    const onChange = vi.fn();
    render(
      <CategoryFilter 
        categories={mockCategories} 
        selectedCategories={[]} 
        onChange={onChange} 
      />
    );
    
    fireEvent.click(screen.getByText('All Categories'));
    fireEvent.click(screen.getByText('Education'));
    
    expect(onChange).toHaveBeenCalledWith(['Education']);
  });

  it('calls onChange when category is deselected', () => {
    const onChange = vi.fn();
    render(
      <CategoryFilter 
        categories={mockCategories} 
        selectedCategories={['Education', 'Gaming']} 
        onChange={onChange} 
      />
    );
    
    fireEvent.click(screen.getByText('2 categories'));
    fireEvent.click(screen.getByText('Education'));
    
    expect(onChange).toHaveBeenCalledWith(['Gaming']);
  });

  it('shows clear all button when categories are selected', () => {
    render(
      <CategoryFilter 
        categories={mockCategories} 
        selectedCategories={['Education']} 
        onChange={vi.fn()} 
      />
    );
    
    fireEvent.click(screen.getByText('Education'));
    
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('clears all categories when clear all is clicked', () => {
    const onChange = vi.fn();
    render(
      <CategoryFilter 
        categories={mockCategories} 
        selectedCategories={['Education', 'Gaming']} 
        onChange={onChange} 
      />
    );
    
    fireEvent.click(screen.getByText('2 categories'));
    fireEvent.click(screen.getByText('Clear All'));
    
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('shows check mark for selected categories', () => {
    render(
      <CategoryFilter 
        categories={mockCategories} 
        selectedCategories={['Education']} 
        onChange={vi.fn()} 
      />
    );
    
    fireEvent.click(screen.getByText('Education'));
    
    // Check for the presence of a check icon (lucide-check class)
    const checkIcon = document.querySelector('.lucide-check');
    expect(checkIcon).toBeTruthy();
  });

  it('handles empty categories list', () => {
    render(
      <CategoryFilter 
        categories={[]} 
        selectedCategories={[]} 
        onChange={vi.fn()} 
      />
    );
    
    fireEvent.click(screen.getByText('All Categories'));
    
    expect(screen.getByText('No categories available')).toBeInTheDocument();
  });
});