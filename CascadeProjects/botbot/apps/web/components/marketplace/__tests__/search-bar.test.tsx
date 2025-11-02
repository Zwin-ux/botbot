import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { SearchBar } from '../search-bar';

describe('SearchBar', () => {
  it('renders with placeholder text', () => {
    render(<SearchBar value="" onChange={vi.fn()} />);
    
    expect(screen.getByPlaceholderText('Search personalities...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<SearchBar value="" onChange={vi.fn()} placeholder="Custom placeholder" />);
    
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('displays the current value', () => {
    render(<SearchBar value="test search" onChange={vi.fn()} />);
    
    expect(screen.getByDisplayValue('test search')).toBeInTheDocument();
  });

  it('calls onChange when typing', async () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} debounceMs={100} />);
    
    const input = screen.getByPlaceholderText('Search personalities...');
    fireEvent.change(input, { target: { value: 'new search' } });
    
    // Wait for debounce
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('new search');
    }, { timeout: 200 });
  });

  it('shows clear button when there is text', () => {
    render(<SearchBar value="test" onChange={vi.fn()} />);
    
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('hides clear button when text is empty', () => {
    render(<SearchBar value="" onChange={vi.fn()} />);
    
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('clears text when clear button is clicked', () => {
    const onChange = vi.fn();
    render(<SearchBar value="test" onChange={onChange} />);
    
    fireEvent.click(screen.getByLabelText('Clear search'));
    
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('debounces onChange calls', async () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} debounceMs={100} />);
    
    const input = screen.getByPlaceholderText('Search personalities...');
    
    // Type multiple characters quickly
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.change(input, { target: { value: 'abc' } });
    
    // Should not call onChange immediately
    expect(onChange).not.toHaveBeenCalled();
    
    // Wait for debounce
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('abc');
    }, { timeout: 200 });
  });
});