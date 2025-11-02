import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { useState } from 'react';
import { SortOptions } from '../sort-options';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';

describe('SortOptions', () => {
  it('renders with default popular option', () => {
    render(<SortOptions value="popular" onChange={vi.fn()} />);
    
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
    expect(screen.getByText('By download count')).toBeInTheDocument();
  });

  it('renders with selected option', () => {
    render(<SortOptions value="newest" onChange={vi.fn()} />);
    
    expect(screen.getByText('Newest')).toBeInTheDocument();
    expect(screen.getByText('Recently added')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', () => {
    render(<SortOptions value="popular" onChange={vi.fn()} />);
    
    fireEvent.click(screen.getByText('Most Popular'));
    
    expect(screen.getByText('Newest')).toBeInTheDocument();
    expect(screen.getByText('Highest Rated')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('calls onChange when option is selected', () => {
    const onChange = vi.fn();
    render(<SortOptions value="popular" onChange={onChange} />);
    
    fireEvent.click(screen.getByText('Most Popular'));
    fireEvent.click(screen.getByText('Newest'));
    
    expect(onChange).toHaveBeenCalledWith('newest');
  });

  it('closes dropdown after selection', () => {
    const TestWrapper = () => {
      const [value, setValue] = useState<'popular' | 'newest' | 'rating' | 'name'>('popular');
      return <SortOptions value={value} onChange={setValue} />;
    };
    
    render(<TestWrapper />);
    
    fireEvent.click(screen.getByText('Most Popular'));
    expect(screen.getByText('Newest')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Newest'));
    
    // After selection, the dropdown should close and "Newest" should be the selected option
    expect(screen.getByText('Newest')).toBeInTheDocument();
    expect(screen.getByText('Recently added')).toBeInTheDocument();
    
    // The dropdown should be closed, so we shouldn't see multiple instances
    const dropdownContainer = document.querySelector('.absolute.z-10');
    expect(dropdownContainer).toBeFalsy();
  });

  it('highlights selected option in dropdown', () => {
    render(<SortOptions value="rating" onChange={vi.fn()} />);
    
    fireEvent.click(screen.getByText('Highest Rated'));
    
    // Find the button containing "Highest Rated" in the dropdown
    const buttons = screen.getAllByRole('button');
    const selectedButton = buttons.find(button => 
      button.textContent?.includes('Highest Rated') && 
      button.className.includes('bg-blue-50')
    );
    
    expect(selectedButton).toBeTruthy();
  });

  it('shows all sort options in dropdown', () => {
    render(<SortOptions value="popular" onChange={vi.fn()} />);
    
    fireEvent.click(screen.getByText('Most Popular'));
    
    // Check that the dropdown is open by looking for the dropdown container
    const dropdownContainer = document.querySelector('.absolute.z-10');
    expect(dropdownContainer).toBeTruthy();
    
    // Check for all options in the dropdown
    expect(screen.getAllByText('Most Popular')).toHaveLength(2); // One in button, one in dropdown
    expect(screen.getByText('Newest')).toBeInTheDocument();
    expect(screen.getByText('Highest Rated')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    
    expect(screen.getAllByText('By download count')).toHaveLength(2); // One in button, one in dropdown
    expect(screen.getByText('Recently added')).toBeInTheDocument();
    expect(screen.getByText('By user ratings')).toBeInTheDocument();
    expect(screen.getByText('Alphabetical order')).toBeInTheDocument();
  });
});