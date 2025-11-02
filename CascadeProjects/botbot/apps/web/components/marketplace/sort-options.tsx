'use client';

import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export type SortOption = 'popular' | 'newest' | 'rating' | 'name';

interface SortOptionsProps {
  value: SortOption;
  onChange: (option: SortOption) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string; description: string }[] = [
  { value: 'popular', label: 'Most Popular', description: 'By download count' },
  { value: 'newest', label: 'Newest', description: 'Recently added' },
  { value: 'rating', label: 'Highest Rated', description: 'By user ratings' },
  { value: 'name', label: 'Name', description: 'Alphabetical order' },
];

export function SortOptions({ value, onChange }: SortOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOptionSelect = (option: SortOption) => {
    onChange(option);
    setIsOpen(false);
  };

  const selectedOption = SORT_OPTIONS.find(option => option.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">{selectedOption?.label}</span>
          <span className="text-xs text-gray-500">{selectedOption?.description}</span>
        </div>
        <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleOptionSelect(option.value)}
              className={`flex flex-col items-start w-full px-4 py-3 text-sm text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                value === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-gray-500">{option.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}